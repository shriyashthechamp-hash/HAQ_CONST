import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/prisma';
import { GroqProvider } from '../src/providers/groqProvider';
import { SarvamVoiceProvider } from '../src/providers/sarvamVoiceProvider';
import { HaqAgentOrchestrator } from '../src/services/agentOrchestrator';
import { SessionAuthService } from '../src/services/sessionAuthService';

describe('HAQ 2.0 — AI Agent, Voice & Scheme Intelligence Tests', () => {
  let testSessionId: string;
  let testSessionToken: string;

  beforeAll(async () => {
    const session = await prisma.session.create({
      data: {
        preferredLanguage: 'mr',
        deviceInfo: 'Vitest Automated Agent Suite',
      },
    });
    testSessionId = session.id;
    testSessionToken = SessionAuthService.generateSessionToken(session.id);
  });

  describe('1. Provider Integration & Health Check', () => {
    it('GET /api/health exposes Groq and Sarvam configurations and models', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.groqConfigured).toBe(true);
      expect(res.body.sarvamConfigured).toBe(true);
      expect(res.body.model).toBeDefined();
      expect(res.body.sarvamTtsModel).toBe('bulbul:v3');
      expect(res.body.sarvamSttModel).toBe('saaras:v2');
    });

    it('GroqProvider verifies configuration and model identifier', () => {
      const provider = new GroqProvider();
      expect(provider.isConfigured()).toBe(true);
      expect(provider.getModel()).toBe('qwen/qwen3.8-27b');
    });

    it('SarvamVoiceProvider verifies configuration', () => {
      const sarvam = new SarvamVoiceProvider();
      expect(sarvam.isConfigured()).toBe(true);
    });
  });

  describe('2. Worker Profile & Consent Intelligence', () => {
    it('POST /api/agent/profile creates/updates worker profile with consent', async () => {
      const res = await request(app)
        .post('/api/agent/profile')
        .set('Authorization', `Bearer ${testSessionToken}`)
        .send({
          sessionId: testSessionId,
          profile: {
            name: 'Anil Kisan Gaikwad',
            age: 38,
            occupation: 'Mason / गवंडी',
            yearsOfConstructionWork: 12,
            hasAadhaar: true,
            has90DaysCertificate: true,
            hasBankPassbook: true,
            preferredLanguage: 'mr',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.sessionId).toBe(testSessionId);
      expect(res.body.name).toBe('Anil Kisan Gaikwad');
      expect(res.body.age).toBe(38);
      expect(res.body.occupation).toBe('Mason / गवंडी');
      expect(res.body.consentedAt).toBeDefined();
    });

    it('GET /api/agent/profile/:sessionId returns the stored profile', async () => {
      const res = await request(app)
        .get(`/api/agent/profile/${testSessionId}`)
        .set('Authorization', `Bearer ${testSessionToken}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Anil Kisan Gaikwad');
      expect(res.body.district).toBe('Pune');
    });
  });

  describe('3. Voice-First Agent Orchestration & Tool Execution', () => {
    it('POST /api/agent/chat processes Marathi welfare question with scheme retrieval', async () => {
      const res = await request(app)
        .post('/api/agent/chat')
        .set('Authorization', `Bearer ${testSessionToken}`)
        .send({
          sessionId: testSessionId,
          message: 'मला माझ्या मुलांच्या शिक्षणासाठी सरकारी मदत मिळू शकते का?',
          language: 'mr',
          voiceEnabled: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.sessionId).toBe(testSessionId);
      expect(res.body.message).toBeDefined();
      expect(res.body.language).toBe('mr');
      expect(res.body.citations.length).toBeGreaterThan(0);
      expect(res.body.citations[0].sourceId).toBeDefined();
    }, 90000);

    it('HaqAgentOrchestrator respects user selected language and cites sources', async () => {
      await new Promise((r) => setTimeout(r, 2000));

      const result = await HaqAgentOrchestrator.processMessage({
        sessionId: testSessionId,
        message: 'What documents are required for registration?',
        language: 'en',
        voiceEnabled: false,
      });

      expect(result.message).toBeDefined();
      expect(result.language).toBe('en');
      expect(result.citations.length).toBeGreaterThan(0);
    }, 90000);
  });

  describe('4. Document Intelligence & OCR Formatting Checks', () => {
    it('POST /api/agent/documents/analyze validates Form-V clauses', async () => {
      const res = await request(app)
        .post('/api/agent/documents/analyze')
        .set('Authorization', `Bearer ${testSessionToken}`)
        .send({
          sessionId: testSessionId,
          documentType: 'FORM_V',
          textContent: 'याद्वारे प्रमाणित करण्यात येते की कामगार यांनी मागील १२ महिन्यांत ९० दिवस बांधकाम काम पूर्ण केले आहे. स्वाक्षरी: कंत्राटदार.',
        });

      expect(res.status).toBe(200);
      expect(res.body.documentType).toBe('FORM_V');
      expect(res.body.isReadable).toBe(true);
      expect(res.body.confidenceScore).toBeGreaterThan(0.8);
      expect(res.body.matchedRequirements).toContain('90_DAYS_WORK_CLAUSE');
      expect(res.body.guidanceMessage).toBeDefined();
    });
  });

  describe('5. Application Task Orchestration', () => {
    let createdTaskId: string;

    it('POST /api/agent/tasks creates actionable tasks', async () => {
      const res = await request(app)
        .post('/api/agent/tasks')
        .set('Authorization', `Bearer ${testSessionToken}`)
        .send({
          sessionId: testSessionId,
          title: 'कंत्राटदाराकडून फॉर्म-५ वर स्वाक्षरी घ्या',
          description: 'पुण्यातील बांधकाम साइटवरील कंत्राटदाराकडून ९० दिवसांचे प्रमाणपत्र प्रमाणित करून घ्या.',
          priority: 'HIGH',
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toContain('फॉर्म-५');
      expect(res.body.priority).toBe('HIGH');
      expect(res.body.status).toBe('PENDING');
      createdTaskId = res.body.id;
    });

    it('GET /api/agent/tasks/:sessionId lists tasks', async () => {
      const res = await request(app)
        .get(`/api/agent/tasks/${testSessionId}`)
        .set('Authorization', `Bearer ${testSessionToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('PATCH /api/agent/tasks/:id updates status', async () => {
      const res = await request(app)
        .patch(`/api/agent/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${testSessionToken}`)
        .send({
          sessionId: testSessionId,
          status: 'COMPLETED',
          userNotes: 'स्वाक्षरी मिळवली आहे',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('COMPLETED');
      expect(res.body.userNotes).toBe('स्वाक्षरी मिळवली आहे');
    });
  });

  describe('6. Security & Authorization Guardrails', () => {
    it('Blocks cross-session task tampering', async () => {
      const alienSession = await prisma.session.create({
        data: { preferredLanguage: 'en' },
      });
      const alienToken = SessionAuthService.generateSessionToken(alienSession.id);

      const task = await prisma.applicationTask.create({
        data: {
          sessionId: testSessionId,
          title: 'Protected task',
          status: 'PENDING',
        },
      });

      const res = await request(app)
        .patch(`/api/agent/tasks/${task.id}`)
        .set('Authorization', `Bearer ${alienToken}`)
        .send({
          sessionId: alienSession.id,
          status: 'COMPLETED',
        });

      expect(res.status).toBe(500); // Access denied / Not found
    });
  });
});
