import crypto from 'crypto';
import { prisma } from '../prisma';

export interface SessionTokenPayload {
  sid: string;
  iat: number;
  exp: number;
}

export class SessionAuthService {
  private static getSecret(): string {
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.trim() === '') {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('CRITICAL: SESSION_SECRET environment variable is missing in production!');
      }
      return 'haq_default_dev_secret_key_32_characters_minimum_len_2026';
    }
    return secret;
  }

  /**
   * Generates a cryptographically signed HMAC-SHA256 session token.
   * Format: haq1.<base64urlHeader>.<base64urlPayload>.<base64urlSignature>
   * Default validity: 7 days.
   */
  static generateSessionToken(
    sessionId: string,
    options?: { expiresInSeconds?: number }
  ): string {
    const nowSec = Math.floor(Date.now() / 1000);
    const expSec = nowSec + (options?.expiresInSeconds ?? 7 * 24 * 60 * 60);

    const header = {
      alg: 'HS256',
      typ: 'HAQ_SESSION',
    };

    const payload: SessionTokenPayload = {
      sid: sessionId,
      iat: nowSec,
      exp: expSec,
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

    const signature = crypto
      .createHmac('sha256', this.getSecret())
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    return `haq1.${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Verifies the cryptographic HMAC-SHA256 signature and expiration of the session token.
   * Uses timing-safe comparison to protect against side-channel timing attacks.
   */
  static verifySessionToken(token: string): {
    valid: boolean;
    payload?: SessionTokenPayload;
    error?: string;
  } {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Token is required' };
    }

    const parts = token.split('.');
    if (parts.length !== 4 || parts[0] !== 'haq1') {
      return { valid: false, error: 'Malformed session token format' };
    }

    const [, encodedHeader, encodedPayload, receivedSignature] = parts;

    // Verify cryptographic signature
    const expectedSignature = crypto
      .createHmac('sha256', this.getSecret())
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const receivedBuffer = Buffer.from(receivedSignature, 'utf8');

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return { valid: false, error: 'Invalid token signature' };
    }

    // Decode and validate payload
    try {
      const payload: SessionTokenPayload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8')
      );

      const nowSec = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp <= nowSec) {
        return { valid: false, error: 'Session token has expired' };
      }

      if (!payload.sid || typeof payload.sid !== 'string') {
        return { valid: false, error: 'Invalid token payload: missing session ID' };
      }

      return { valid: true, payload };
    } catch {
      return { valid: false, error: 'Invalid token payload JSON' };
    }
  }

  /**
   * Checks whether the session exists in the database and is active.
   */
  static async validateSessionState(sessionId: string): Promise<{
    active: boolean;
    session?: any;
    error?: string;
  }> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return { active: false, error: 'Session not found in database' };
    }

    // If isRevoked exists in schema
    if ((session as any).isRevoked) {
      return { active: false, error: 'Session has been revoked' };
    }

    return { active: true, session };
  }

  /**
   * Revokes a session so any token associated with it is rejected.
   */
  static async revokeSession(sessionId: string): Promise<boolean> {
    try {
      // Check if isRevoked column exists or delete session
      const session = await prisma.session.findUnique({ where: { id: sessionId } });
      if (!session) return false;

      try {
        await (prisma.session as any).update({
          where: { id: sessionId },
          data: { isRevoked: true, revokedAt: new Date() },
        });
      } catch {
        // Fallback: delete session if isRevoked column isn't migrated yet
        await prisma.session.delete({ where: { id: sessionId } });
      }
      return true;
    } catch {
      return false;
    }
  }
}

