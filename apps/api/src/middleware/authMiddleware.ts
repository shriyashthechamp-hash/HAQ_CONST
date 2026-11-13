import { Request, Response, NextFunction } from 'express';
import { SessionAuthService } from '../services/sessionAuthService';

declare global {
  namespace Express {
    interface Request {
      authenticatedSessionId?: string;
      authenticatedSession?: any;
    }
  }
}

/**
 * Authentication middleware that verifies cryptographically signed session tokens.
 * Rejects requests with missing, malformed, tampered, or expired tokens with 401 Unauthorized.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (typeof req.headers['x-session-token'] === 'string') {
    token = req.headers['x-session-token'].trim();
  }

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required. A valid Bearer session token must be provided.',
    });
  }

  const verification = SessionAuthService.verifySessionToken(token);
  if (!verification.valid || !verification.payload) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: verification.error || 'Invalid session token signature or token expired.',
    });
  }

  const sessionId = verification.payload.sid;
  const state = await SessionAuthService.validateSessionState(sessionId);
  if (!state.active || !state.session) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: state.error || 'Session does not exist or has been revoked.',
    });
  }

  // Bind verified session to request object
  req.authenticatedSessionId = sessionId;
  req.authenticatedSession = state.session;

  next();
}

/**
 * Authorization guard: verifies that a requested resource's sessionId matches the authenticated session.
 * Rejects cross-worker tampering with 403 Forbidden.
 */
export function authorizeSession(targetSessionId: string, authenticatedSessionId?: string): boolean {
  if (!authenticatedSessionId) return false;
  return targetSessionId === authenticatedSessionId;
}

