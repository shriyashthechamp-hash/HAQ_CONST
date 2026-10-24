import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/prisma';
import { EligibilityService } from '../src/services/eligibilityService';
import { JourneyService } from '../src/services/journeyService';
import { GroqAssistantService } from '../src/services/groqAssistantService';

let testSessionId = '';

describe('HAQ Backend — Automated Integration & Logic Tests', () => {
  beforeAll(async () => {
    // Create test session
    const res = await request(app)
      .post('/api/sessions')
      .send({ preferredLanguage: 'mr' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    testSessionId = res.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Health and Source Endpoints', () => {
    it('GET /api/health returns database connected and groq status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.database).toBe('connected');
    });

    it('GET /api/sources returns verified MAHABOCW sources', async () => {
      const res = await request(app).get('/api/sources');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(4);
      expect(res.body[0]).toHaveProperty('title');
      expect(res.body[0]).toHaveProperty('url');
    });
  });

  describe('2. Eligibility Evaluation Engine', () => {
    it('Satisfied evaluation: age 32, 110 days worked, resident of Maharashtra', async () => {
      const result = await EligibilityService.evaluateEligibility(testSessionId, {
        age: 32,
        workedDaysLast12Months: 110,
        isMaharashtraResident: true,
        tradeType: 'Mason (गवंडी कामगार)',
      });

      expect(result.assessmentStatus).toBe('PRELIMINARY_SATISFIED');
      expect(result.satisfiedChecks.length).toBeGreaterThanOrEqual(3);
      expect(result.failedChecks.length).toBe(0);
      expect(result.disclaimer.mr).toContain('MAHABOCW अधिकृत नियमांवर आधारित');
    });

    it('Ineligible evaluation: age 16 (under 18) or worked 45 days (less than 90)', async () => {
      const result = await EligibilityService.evaluateEligibility(testSessionId, {
        age: 16,
        workedDaysLast12Months: 45,
        isMaharashtraResident: true,
      });

      expect(result.assessmentStatus).toBe('INELIGIBLE');
      expect(result.failedChecks.length).toBe(2);
      expect(result.failedChecks.some((c) => c.ruleKey === 'RULE_AGE_RANGE')).toBe(true);
      expect(result.failedChecks.some((c) => c.ruleKey === 'RULE_90_DAYS_WORK')).toBe(true);
    });

    it('Incomplete answers result in NEEDS_VERIFICATION', async () => {
      const result = await EligibilityService.evaluateEligibility(testSessionId, {
        age: 28,
        workedDaysLast12Months: undefined, // unknown
        isMaharashtraResident: undefined,
      });

      expect(result.assessmentStatus).toBe('NEEDS_VERIFICATION');
      expect(result.unresolvedChecks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('3. Document Checklist & Progress Calculation', () => {
    it('GET /api/documents/checklist/:sessionId returns populated checklist', async () => {
      const res = await request(app).get(`/api/documents/checklist/${testSessionId}`);
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(6);
      expect(typeof res.body.progressPercent).toBe('number');
    });

    it('PATCH /api/documents/:id updates item status and recalculates progress', async () => {
      const initial = await request(app).get(`/api/documents/checklist/${testSessionId}`);
      const firstItem = initial.body.items[0];

      const patchRes = await request(app)
        .patch(`/api/documents/${firstItem.id}`)
        .send({
          sessionId: testSessionId,
          status: 'AVAILABLE',
          userNotes: 'Signed by contractor on 2024-10-15',
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.status).toBe('AVAILABLE');
      expect(patchRes.body.userNotes).toContain('Signed by contractor');

      const after = await request(app).get(`/api/documents/checklist/${testSessionId}`);
      expect(after.body.availableCount).toBeGreaterThanOrEqual(1);
    });

    it('PATCH /api/documents/:id rejects unauthorized session with 403 Forbidden', async () => {
      const initial = await request(app).get(`/api/documents/checklist/${testSessionId}`);
      const firstItem = initial.body.items[0];

      const unauthorizedRes = await request(app)
        .patch(`/api/documents/${firstItem.id}`)
        .send({
          sessionId: 'different-hacker-session-id',
          status: 'MISSING',
        });

      expect(unauthorizedRes.status).toBe(403);
      expect(unauthorizedRes.body.message).toContain('Session Access Denied');
    });
  });

  describe('4. Journey State Machine & Strict Submission Gating', () => {
    it('GET /api/journey/:sessionId returns initial ELIGIBILITY_GUIDANCE stage', async () => {
      const res = await request(app).get(`/api/journey/${testSessionId}`);
      expect(res.status).toBe(200);
      expect(res.body.currentStage).toBe('ELIGIBILITY_GUIDANCE');
      expect(res.body.allowedTransitions).toContain('DOCUMENT_PREPARATION');
    });

    it('Allows transition to DOCUMENT_PREPARATION', async () => {
      const res = await request(app)
        .post('/api/journey/events')
        .send({
          sessionId: testSessionId,
          eventType: 'DOCUMENT_PREPARATION',
        });
      expect(res.status).toBe(201);
    });

    it('STRICT GATING: Rejects SUBMITTED without evidence reference', async () => {
      // Advance to PORTAL_HANDOFF first
      await request(app)
        .post('/api/journey/events')
        .send({
          sessionId: testSessionId,
          eventType: 'PORTAL_HANDOFF',
        });

      const res = await request(app)
        .post('/api/journey/events')
        .send({
          sessionId: testSessionId,
          eventType: 'SUBMITTED',
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('SUBMISSION GATING FAILED');
    });

    it('STRICT GATING: Rejects sample, demo, or placeholder receipt references', async () => {
      const sampleRes = await request(app)
        .post('/api/journey/events')
        .send({
          sessionId: testSessionId,
          eventType: 'SUBMITTED',
          evidenceType: 'OFFICIAL_ACKNOWLEDGEMENT_SLIP',
          evidenceReference: 'SAMPLE-DEMO-RECEIPT-1234',
        });
      expect(sampleRes.status).toBe(400);
      expect(sampleRes.body.message).toContain('Sample, demo, or placeholder receipt references are strictly rejected');
    });

    it('Allows SUBMITTED when genuine official evidence is provided', async () => {
      // Submit with verified evidence reference
      const submitRes = await request(app)
        .post('/api/journey/events')
        .send({
          sessionId: testSessionId,
          eventType: 'SUBMITTED',
          evidenceType: 'OFFICIAL_ACKNOWLEDGEMENT_SLIP',
          evidenceReference: 'MH-BOCW-PUN-2024-884920',
        });

      expect(submitRes.status).toBe(201);
      expect(submitRes.body.eventType).toBe('SUBMITTED');
      expect(submitRes.body.evidenceReference).toBe('MH-BOCW-PUN-2024-884920');
    });

    it('STRICT GATING: Rejects OUTCOME_RECORDED with sample reference', async () => {
      const outcomeRes = await request(app)
        .post('/api/journey/events')
        .send({
          sessionId: testSessionId,
          eventType: 'OUTCOME_RECORDED',
          evidenceReference: 'SAMPLE-OUTCOME-123',
        });
      expect(outcomeRes.status).toBe(400);
      expect(outcomeRes.body.message).toContain('Sample or placeholder outcome tokens are rejected');
    });
  });

  describe('5. Conversational Assistant & Contractor Letter Drafting', () => {
    it('POST /api/assistant/draft-request produces formal Marathi request', async () => {
      const res = await request(app)
        .post('/api/assistant/draft-request')
        .send({
          sessionId: testSessionId,
          workerName: 'रमेश जाधव',
          contractorName: 'पाटील कन्स्ट्रक्शन',
          siteLocation: 'बाणेर, पुणे',
          tradeType: 'सुतार कामगार (Carpenter)',
          workDatesDescription: 'नोव्हेंबर २०२३ ते सप्टेंबर २०२४ (११० दिवस)',
          language: 'mr',
        });

      expect(res.status).toBe(200);
      expect(res.body.draftText).toContain('रमेश जाधव');
      expect(res.body.draftText).toContain('पाटील कन्स्ट्रक्शन');
      expect(res.body.draftText).toContain('फॉर्म-५');
      expect(res.body.instructions).toBeDefined();
    });

    it('POST /api/assistant/chat delivers grounded advice with verified citations', async () => {
      const res = await request(app)
        .post('/api/assistant/chat')
        .send({
          sessionId: testSessionId,
          message: '९० दिवस कामाचे प्रमाणपत्र कसे मिळवायचे?',
          language: 'mr',
        });

      expect(res.status).toBe(200);
      expect(res.body.reply).toBeDefined();
      expect(res.body.reply.length).toBeGreaterThan(20);
      expect(Array.isArray(res.body.citations)).toBe(true);
      expect(res.body.citations.length).toBeGreaterThanOrEqual(1);
      expect(res.body.citations[0]).toHaveProperty('sourceId');
    });
  });
});
