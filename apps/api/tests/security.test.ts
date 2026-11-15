/**
 * HAQ 2.0 — Sprint 1 Security Regression Test Suite
 *
 * Tests 1–12 covering all Sprint 1 security requirements:
 *   1.  Valid signed session token succeeds
 *   2.  Tampered / invalid signature rejected (401)
 *   3.  Expired token rejected (401)
 *   4.  Revoked session rejected (401)
 *   5.  Worker A cannot read Worker B's profile (403)
 *   6.  Worker A cannot write Worker B's profile (403)
 *   7.  Worker A cannot read Worker B's tasks (403)
 *   8.  Worker A cannot write Worker B's tasks (403)
 *   9.  LLM prompt-injection session override rejected (tool ignores injected session)
 *   10. Arbitrary session creation rejected on subordinate endpoints
 *   11. Production error sanitisation (no credentials or Prisma internals leaked)
 *   12. Bounded rate limiter returns 429 when limit exceeded
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/prisma';
import { SessionAuthService } from '../src/services/sessionAuthService';

// ─── Test state ──────────────────────────────────────────────────────────────

let workerA_id: string;
let workerA_token: string;

let workerB_id: string;
let workerB_token: string;

// ─── Setup / teardown ────────────────────────────────────────────────────────

beforeAll(async () => {
  // Create Worker A via the API (also generates a token)
  const resA = await request(app)
    .post('/api/sessions')
    .send({ preferredLanguage: 'mr', deviceInfo: 'Security Test — Worker A' });
  expect(resA.status).toBe(201);
  workerA_id = resA.body.id;
  workerA_token = resA.body.token;

  // Create Worker B via the API
  const resB = await request(app)
    .post('/api/sessions')
    .send({ preferredLanguage: 'hi', deviceInfo: 'Security Test — Worker B' });
  expect(resB.status).toBe(201);
  workerB_id = resB.body.id;
  workerB_token = resB.body.token;
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Valid signed session token is accepted
// ─────────────────────────────────────────────────────────────────────────────
describe('Security Test 1 — Valid signed token accepted', () => {
  it('GET /api/journey/:sessionId returns 200 with correct Bearer token', async () => {
    const res = await request(app)
      .get(`/api/journey/${workerA_id}`)
      .set('Authorization', `Bearer ${workerA_token}`);
    expect(res.status).toBe(200);
    // JourneyStatusSummary has currentStage, not sessionId
    expect(res.body.currentStage).toBeDefined();
    expect(res.body.allowedTransitions).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Tampered / invalid signature rejected
// ─────────────────────────────────────────────────────────────────────────────
describe('Security Test 2 — Invalid signature rejected (401)', () => {
  it('Request with tampered token signature returns 401', async () => {
    const tamperedToken = workerA_token.slice(0, -4) + 'XXXX';
    const res = await request(app)
      .get(`/api/journey/${workerA_id}`)
      .set('Authorization', `Bearer ${tamperedToken}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('Request with arbitrary non-HAQ JWT returns 401', async () => {
    const fakeJwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const res = await request(app)
      .get(`/api/journey/${workerA_id}`)
      .set('Authorization', `Bearer ${fakeJwt}`);
    expect(res.status).toBe(401);
  });

  it('No Authorization header returns 401', async () => {
    const res = await request(app).get(`/api/journey/${workerA_id}`);
    expect(res.status).toBe(401);
  });

  it('Empty Bearer token returns 401', async () => {
    const res = await request(app)
      .get(`/api/journey/${workerA_id}`)
      .set('Authorization', 'Bearer ');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Expired token rejected
// ─────────────────────────────────────────────────────────────────────────────
describe('Security Test 3 — Expired token rejected (401)', () => {
  it('Token with 1-second TTL is expired after 1.1s', async () => {
    const expiredToken = SessionAuthService.generateSessionToken(workerA_id, {
      expiresInSeconds: 1,
    });
    // Wait 1.1 s so exp (iat+1) is strictly less than nowSec
    await new Promise((r) => setTimeout(r, 1100));
    const res = await request(app)
      .get(`/api/journey/${workerA_id}`)
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/expired/i);
  }, 10000);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Revoked session rejected
// ─────────────────────────────────────────────────────────────────────────────
describe('Security Test 4 — Revoked session rejected (401)', () => {
  it('POST /api/sessions/revoke invalidates the session and subsequent requests fail', async () => {
    // Create a throwaway session
    const throwawayRes = await request(app)
      .post('/api/sessions')
      .send({ preferredLanguage: 'mr', deviceInfo: 'Revocation test session' });
    expect(throwawayRes.status).toBe(201);
    const throwawayId = throwawayRes.body.id;
    const throwawayToken = throwawayRes.body.token;

    // Revoke it
    const revokeRes = await request(app)
      .post('/api/sessions/revoke')
      .set('Authorization', `Bearer ${throwawayToken}`);
    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.success).toBe(true);

    // Subsequent request with the same token is rejected
    const afterRevoke = await request(app)
      .get(`/api/journey/${throwawayId}`)
      .set('Authorization', `Bearer ${throwawayToken}`);
    expect(afterRevoke.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Worker A cannot read Worker B's profile (IDOR – read)
// ─────────────────────────────────────────────────────────────────────────────
describe('Security Test 5 — Cross-worker profile read rejected (403)', () => {
  it('Worker A token cannot GET Worker B journey', async () => {
    const res = await request(app)
      .get(`/api/journey/${workerB_id}`)
      .set('Authorization', `Bearer ${workerA_token}`);
    expect(res.status).toBe(403);
  });

  it('Worker A token cannot GET Worker B document checklist', async () => {
    const res = await request(app)
      .get(`/api/documents/checklist/${workerB_id}`)
      .set('Authorization', `Bearer ${workerA_token}`);
    expect(res.status).toBe(403);
  });

  it('Worker A token cannot GET Worker B session', async () => {
    const res = await request(app)
      .get(`/api/sessions/${workerB_id}`)
      .set('Authorization', `Bearer ${workerA_token}`);
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Worker A cannot write Worker B's profile (IDOR – write)
// ─────────────────────────────────────────────────────────────────────────────
describe('Security Test 6 — Cross-worker profile write rejected (403)', () => {
  it('Worker A token cannot POST agent profile with Worker B sessionId', async () => {
    const res = await request(app)
      .post('/api/agent/profile')
      .set('Authorization', `Bearer ${workerA_token}`)
      .send({
        sessionId: workerB_id, // tampered
        profile: { name: 'Hacker', age: 25 },
      });
    expect(res.status).toBe(403);
  });

  it('Worker A token cannot POST journey event for Worker B', async () => {
    const res = await request(app)
      .post('/api/journey/events')
      .set('Authorization', `Bearer ${workerA_token}`)
      .send({ sessionId: workerB_id, eventType: 'DOCUMENT_PREPARATION' });
    expect(res.status).toBe(403);
  });

  it('Worker A token cannot POST eligibility assess for Worker B', async () => {
    const res = await request(app)
      .post('/api/eligibility/assess')
      .set('Authorization', `Bearer ${workerA_token}`)
      .send({
        sessionId: workerB_id,
        answers: { age: 30, workedDaysLast12Months: 100, isMaharashtraResident: true },
      });
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Worker A cannot read Worker B's tasks (IDOR – tasks read)
// ─────────────────────────────────────────────────────────────────────────────
describe('Security Test 7 — Cross-worker tasks read rejected (403)', () => {
  it('Worker A token cannot GET Worker B tasks', async () => {
    const res = await request(app)
      .get(`/api/agent/tasks/${workerB_id}`)
      .set('Authorization', `Bearer ${workerA_token}`);
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Worker A cannot write Worker B's tasks (IDOR – tasks write)
// ─────────────────────────────────────────────────────────────────────────────
describe('Security Test 8 — Cross-worker task creation rejected (403)', () => {
  it('Worker A token cannot create task for Worker B', async () => {
    const res = await request(app)
      .post('/api/agent/tasks')
      .set('Authorization', `Bearer ${workerA_token}`)
      .send({
        sessionId: workerB_id,
        title: 'Hacked task',
      });
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. LLM prompt-injection session override is ignored
// ─────────────────────────────────────────────────────────────────────────────
describe('Security Test 9 — LLM session override injection rejected', () => {
  it('Agent chat ignores sessionId supplied in body, uses authenticated session', async () => {
    // Worker A sends a crafted message trying to impersonate Worker B
    // The endpoint must bind to workerA_id, not workerB_id
    const res = await request(app)
      .post('/api/agent/chat')
      .set('Authorization', `Bearer ${workerA_token}`)
      .send({
        sessionId: workerB_id, // attempted injection
        message: 'List my documents',
        language: 'en',
      });
    // The endpoint must reject: sessionId in body ≠ authenticatedSessionId
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Arbitrary session creation rejected on subordinate endpoints
// ─────────────────────────────────────────────────────────────────────────────
describe('Security Test 10 — Arbitrary session creation rejected', () => {
  it('Subordinate endpoints do not create sessions on the fly', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    // Fabricate a token for a session that does NOT exist in the DB
    const fakeToken = SessionAuthService.generateSessionToken(fakeId);

    const res = await request(app)
      .get(`/api/journey/${fakeId}`)
      .set('Authorization', `Bearer ${fakeToken}`);

    // Must reject because session not found in DB (401 or 404 — not 200/201)
    expect([401, 404]).toContain(res.status);
  });

  it('Non-existent session token is rejected with 401', async () => {
    const ghostId = 'aaaaaaaa-0000-4000-b000-000000000001';
    const ghostToken = SessionAuthService.generateSessionToken(ghostId);

    const res = await request(app)
      .get(`/api/documents/checklist/${ghostId}`)
      .set('Authorization', `Bearer ${ghostToken}`);

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Production error sanitisation
// ─────────────────────────────────────────────────────────────────────────────
describe('Security Test 11 — Error sanitisation (no internal DB details leaked)', () => {
  it('Invalid route returns JSON without stack traces or credentials', async () => {
    const res = await request(app)
      .get('/api/does-not-exist-route-xyz')
      .set('Authorization', `Bearer ${workerA_token}`);
    // 404 or some error — but no Prisma/database internals
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toMatch(/PrismaClientKnownRequestError/i);
    expect(bodyStr).not.toMatch(/postgresql:\/\//i);
    expect(bodyStr).not.toMatch(/at Object\./i);    // stack trace frames
    expect(bodyStr).not.toMatch(/node_modules/i);   // internal module paths
  });

  it('Validation error on /api/sessions does not expose internals', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({ preferredLanguage: 123 }); // wrong type
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toMatch(/postgresql:\/\//i);
    expect(bodyStr).not.toMatch(/PrismaClient/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. Bounded rate limiter
// ─────────────────────────────────────────────────────────────────────────────
describe('Security Test 12 — Bounded rate limiter returns 429', () => {
  it('Exceeding auth limit returns 429 with Retry-After header', async () => {
    // The authLimiter allows 30/min. Drive 32 requests sequentially.
    // Use a unique IP-like key by overriding via X-Forwarded-For header variant
    // (without trust proxy enabled in test env, req.ip will be 127.0.0.1 — shared)
    // We therefore drive enough requests to exceed the 120/min general limiter
    // while making test deterministic: use the per-IP general limit.
    //
    // Strategy: hit an endpoint rapidly and expect at least one 429 within 125 requests.
    let got429 = false;
    for (let i = 0; i < 125; i++) {
      const res = await request(app).get('/api/health');
      if (res.status === 429) {
        got429 = true;
        // Validate standard headers exist
        expect(res.body.error).toBe('Too Many Requests');
        expect(res.body.retryAfter).toBeTypeOf('number');
        expect(res.headers['ratelimit-limit']).toBeDefined();
        expect(res.headers['ratelimit-remaining']).toBeDefined();
        break;
      }
    }
    expect(got429).toBe(true);
  }, 30000);
});
