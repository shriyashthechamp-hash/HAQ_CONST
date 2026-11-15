import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

/**
 * Bounded in-memory store with LRU eviction and active cleanup to prevent memory exhaustion.
 */
class BoundedMemoryStore {
  private map = new Map<string, RateLimitRecord>();
  private maxEntries: number;
  private sweepTimer: NodeJS.Timeout | null = null;

  constructor(maxEntries = 10000) {
    this.maxEntries = maxEntries;
    // Periodic sweep every 60 seconds
    this.sweepTimer = setInterval(() => this.sweepExpired(), 60000);
    if (this.sweepTimer.unref) {
      this.sweepTimer.unref();
    }
  }

  private sweepExpired() {
    const now = Date.now();
    for (const [key, value] of this.map.entries()) {
      if (now > value.resetTime) {
        this.map.delete(key);
      }
    }
  }

  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    const existing = this.map.get(key);

    if (!existing || now > existing.resetTime) {
      // Evict oldest if capacity is exceeded
      if (this.map.size >= this.maxEntries) {
        const oldestKey = this.map.keys().next().value;
        if (oldestKey) this.map.delete(oldestKey);
      }

      const newRecord = { count: 1, resetTime: now + windowMs };
      this.map.set(key, newRecord);
      return newRecord;
    }

    existing.count++;
    return existing;
  }

  reset(key: string) {
    this.map.delete(key);
  }

  clear() {
    this.map.clear();
  }
}

const defaultStore = new BoundedMemoryStore(10000);

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

/**
 * Production-ready rate limiter middleware with proxy-aware IP resolution and standard headers.
 */
export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, max, message } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Respects Express trust proxy when configured
    const clientKey = options.keyGenerator
      ? options.keyGenerator(req)
      : req.ip || req.socket.remoteAddress || 'unknown';

    const record = defaultStore.increment(clientKey, windowMs);
    const now = Date.now();
    const remainingMs = Math.max(0, record.resetTime - now);
    const retryAfterSec = Math.ceil(remainingMs / 1000);

    // Standard RFC RateLimit headers
    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('RateLimit-Reset', retryAfterSec);

    if (record.count > max) {
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({
        error: 'Too Many Requests',
        message: message || 'Rate limit exceeded. Please wait a few moments before trying again.',
        retryAfter: retryAfterSec,
      });
    }

    next();
  };
}

// Preset rate limiters
export const authLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many session requests. Please try again shortly.',
});

export const agentLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'AI agent request limit reached. Please wait a moment before sending another message.',
});

export const voiceLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Voice processing request limit reached. Please wait a moment before trying again.',
});

export const generalLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: 'Request limit reached. Please try again in a minute.',
});

