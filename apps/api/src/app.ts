import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import {
  CreateSessionSchema,
  AssessEligibilitySchema,
  UpdateDocumentItemSchema,
  ChatRequestSchema,
  DraftRequestSchema,
  CreateJourneyEventSchema,
  AgentChatRequestSchema,
  UpdateWorkerProfileSchema,
  VoiceTranscribeRequestSchema,
  VoiceSynthesizeRequestSchema,
  DocumentAnalysisRequestSchema,
  CreateApplicationTaskSchema,
  UpdateApplicationTaskSchema,
} from '@haq/shared';
import { prisma } from './prisma';
import { KnowledgeService } from './services/knowledgeService';
import { EligibilityService } from './services/eligibilityService';
import { DocumentService } from './services/documentService';
import { JourneyService } from './services/journeyService';
import { GroqAssistantService } from './services/groqAssistantService';
import { HaqAgentOrchestrator } from './services/agentOrchestrator';
import { SarvamVoiceProvider } from './providers/sarvamVoiceProvider';
import { ApplicationIntelligenceService } from './services/applicationIntelligenceService';
import { SessionAuthService } from './services/sessionAuthService';
import { requireAuth, authorizeSession } from './middleware/authMiddleware';
import {
  authLimiter,
  agentLimiter,
  voiceLimiter,
  generalLimiter,
} from './middleware/rateLimiter';

export const app = express();

// Configure Express trust proxy based on deployment environment
// In Render, AWS ALB, Cloudflare or PaaS environments, trust the first hop reverse proxy
if (process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// CORS configuration supporting web dashboards, mobile apps (origin-less requests), and custom origins
const rawCorsOrigin = process.env.CORS_ORIGIN;
const allowedOrigins = rawCorsOrigin
  ? rawCorsOrigin.split(',').map((o) => o.trim()).filter(Boolean)
  : ['*'];
const isWildcardOrigin = allowedOrigins.includes('*');

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, native tools)
      if (!origin) return callback(null, true);
      if (isWildcardOrigin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: !isWildcardOrigin,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(generalLimiter);

// Redacted request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV !== 'test') {
    const safeBody = { ...req.body };
    if (safeBody.aadhaar) safeBody.aadhaar = '[REDACTED]';
    if (safeBody.password) safeBody.password = '[REDACTED]';
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// Root route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'HAQ Backend API',
    status: 'online',
    version: '2.0.0',
    documentation: '/api/health',
  });
});

// 1. HEALTH CHECK (mounted at /api/health and /health)
const handleHealth = async (_req: Request, res: Response) => {
  let dbHealthy = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbHealthy = true;
  } catch {
    dbHealthy = false;
  }

  const groqConfigured = Boolean(
    process.env.GROQ_API_KEY &&
      !process.env.GROQ_API_KEY.startsWith('your_groq_api_key') &&
      process.env.GROQ_API_KEY.trim() !== ''
  );

  const sarvamConfigured = Boolean(
    process.env.SARVAM_API_KEY &&
      !process.env.SARVAM_API_KEY.startsWith('your_') &&
      process.env.SARVAM_API_KEY.trim() !== ''
  );

  res.json({
    status: 'healthy',
    service: 'HAQ Backend API',
    database: dbHealthy ? 'connected' : 'disconnected',
    groqConfigured,
    sarvamConfigured,
    model: process.env.GROQ_MODEL || 'qwen/qwen3.8-27b',
    sarvamTtsModel: process.env.SARVAM_TTS_MODEL || 'bulbul:v3',
    sarvamSttModel: process.env.SARVAM_STT_MODEL || 'saaras:v2',
    timestamp: new Date().toISOString(),
  });
};

app.get('/api/health', handleHealth);
app.get('/health', handleHealth);

// 2. SESSIONS & AUTHENTICATION
app.post('/api/sessions', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = CreateSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
    }

    const session = await prisma.session.create({
      data: {
        preferredLanguage: parsed.data.preferredLanguage,
        deviceInfo: parsed.data.deviceInfo || null,
      },
    });

    // Automatically seed default checklist and initial journey event for this session
    await DocumentService.getOrCreateChecklist(session.id);
    await JourneyService.getJourneyStatus(session.id);

    // Issue cryptographically signed tamper-proof session token
    const token = SessionAuthService.generateSessionToken(session.id);

    res.status(201).json({
      ...session,
      token,
    });
  } catch (err) {
    next(err);
  }
});

app.post('/api/sessions/revoke', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.authenticatedSessionId!;
    await SessionAuthService.revokeSession(sessionId);
    res.json({ success: true, message: 'Session revoked successfully.' });
  } catch (err) {
    next(err);
  }
});

app.get('/api/sessions/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!authorizeSession(id, req.authenticatedSessionId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied: cannot access another worker session.' });
    }

    const session = await prisma.session.findUnique({
      where: { id },
    });

    if (!session) {
      return res.status(404).json({ error: 'Not Found', message: 'Session not found.' });
    }

    res.json(session);
  } catch (err) {
    next(err);
  }
});

// 3. ELIGIBILITY ASSESSMENT
app.post('/api/eligibility/assess', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = AssessEligibilitySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
    }

    const targetSessionId = parsed.data.sessionId;
    if (targetSessionId && !authorizeSession(targetSessionId, req.authenticatedSessionId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied: cannot assess eligibility for another worker.' });
    }

    const sessionId = req.authenticatedSessionId!;
    const result = await EligibilityService.evaluateEligibility(sessionId, parsed.data.answers, parsed.data.benefitType);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// 4. DOCUMENT CHECKLIST
app.get('/api/documents/checklist/:sessionId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    if (!authorizeSession(sessionId, req.authenticatedSessionId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied: cannot view another worker checklist.' });
    }

    const checklist = await DocumentService.getOrCreateChecklist(sessionId);
    res.json(checklist);
  } catch (err) {
    next(err);
  }
});

app.patch('/api/documents/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const targetSessionId = req.body?.sessionId || req.authenticatedSessionId!;
    if (!authorizeSession(targetSessionId, req.authenticatedSessionId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied: cannot modify another worker document records.' });
    }

    const parsed = UpdateDocumentItemSchema.safeParse({ ...req.body, sessionId: req.authenticatedSessionId });
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
    }

    const updated = await DocumentService.updateItem(
      id,
      req.authenticatedSessionId!,
      parsed.data.status,
      parsed.data.userNotes
    );
    res.json(updated);
  } catch (err: any) {
    if (err.statusCode === 403) {
      return res.status(403).json({ error: 'Forbidden', message: err.message });
    }
    if (err.statusCode === 404) {
      return res.status(404).json({ error: 'Not Found', message: err.message });
    }
    next(err);
  }
});

// 5. ASSISTANT CHAT & DRAFT REQUEST
app.post(
  '/api/assistant/chat',
  requireAuth,
  agentLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = ChatRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
      }

      const targetSessionId = parsed.data.sessionId;
      if (targetSessionId && !authorizeSession(targetSessionId, req.authenticatedSessionId)) {
        return res.status(403).json({ error: 'Forbidden', message: 'Access denied: cannot chat on behalf of another worker session.' });
      }

      const sessionId = req.authenticatedSessionId!;
      const session = req.authenticatedSession!;

      const chatRes = await GroqAssistantService.chat(
        sessionId,
        parsed.data.message,
        parsed.data.language || session.preferredLanguage
      );

      res.json(chatRes);
    } catch (err) {
      next(err);
    }
  }
);

app.post('/api/assistant/draft-request', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = DraftRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
    }

    const draft = await GroqAssistantService.draftContractorRequest(parsed.data);
    res.json(draft);
  } catch (err) {
    next(err);
  }
});

// 6. KNOWLEDGE SOURCES
app.get('/api/sources', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const sources = await KnowledgeService.getAllSources();
    res.json(sources);
  } catch (err) {
    next(err);
  }
});

// 7. APPLICATION JOURNEY
app.get('/api/journey/:sessionId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    if (!authorizeSession(sessionId, req.authenticatedSessionId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied: cannot view another worker journey.' });
    }

    const summary = await JourneyService.getJourneyStatus(sessionId);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

app.post('/api/journey/events', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = CreateJourneyEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
    }

    const targetSessionId = parsed.data.sessionId;
    if (targetSessionId && !authorizeSession(targetSessionId, req.authenticatedSessionId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied: cannot record events on another worker journey.' });
    }

    const sessionId = req.authenticatedSessionId!;
    const event = await JourneyService.recordEvent(
      sessionId,
      parsed.data.eventType,
      parsed.data.evidenceType,
      parsed.data.evidenceReference
    );

    res.status(201).json(event);
  } catch (err: any) {
    if (
      err.message &&
      (err.message.includes('GATING') ||
        err.message.includes('FAILED') ||
        err.message.includes('Invalid stage transition'))
    ) {
      return res.status(400).json({ error: 'Transition Rejected', message: err.message });
    }
    next(err);
  }
});

// ================= HAQ 2.0 AI AGENT & VOICE ENDPOINTS =================

// 8. VOICE-FIRST AGENT CHAT
app.post('/api/agent/chat', requireAuth, agentLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = AgentChatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
    }

    const targetSessionId = parsed.data.sessionId;
    if (targetSessionId && !authorizeSession(targetSessionId, req.authenticatedSessionId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied: cannot message from another worker session.' });
    }

    const sessionId = req.authenticatedSessionId!;
    const session = req.authenticatedSession!;

    const response = await HaqAgentOrchestrator.processMessage({
      sessionId,
      message: parsed.data.message,
      language: parsed.data.language || session.preferredLanguage,
      voiceEnabled: Boolean(parsed.data.voiceEnabled),
    });

    res.json(response);
  } catch (err) {
    next(err);
  }
});

// 9. VOICE SPEECH-TO-TEXT (SARVAM SAARAS:V2)
app.post('/api/voice/transcribe', requireAuth, voiceLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = VoiceTranscribeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
    }

    const sarvam = new SarvamVoiceProvider();
    if (!sarvam.isConfigured()) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Sarvam voice service is not configured on the backend.',
      });
    }

    const result = await sarvam.transcribe(parsed.data.audioBase64, parsed.data.languageCode);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// 10. VOICE TEXT-TO-SPEECH (SARVAM BULBUL:V3)
app.post('/api/voice/synthesize', requireAuth, voiceLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = VoiceSynthesizeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
    }

    const sarvam = new SarvamVoiceProvider();
    if (!sarvam.isConfigured()) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Sarvam voice service is not configured on the backend.',
      });
    }

    const result = await sarvam.synthesize(
      parsed.data.text,
      parsed.data.languageCode,
      parsed.data.speaker
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// 11. WORKER PROFILE INTELLIGENCE (CONSENT-BASED & SESSION-AUTHENTICATED)
app.get('/api/agent/profile/:sessionId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    if (!authorizeSession(sessionId, req.authenticatedSessionId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied: cannot access another worker profile.' });
    }

    const profile = await prisma.workerProfile.findUnique({
      where: { sessionId },
    });
    if (!profile) {
      return res.status(404).json({ error: 'Not Found', message: 'No worker profile found for this session.' });
    }
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

app.post('/api/agent/profile', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = UpdateWorkerProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
    }

    const targetSessionId = parsed.data.sessionId;
    if (targetSessionId && !authorizeSession(targetSessionId, req.authenticatedSessionId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied: cannot modify another worker profile.' });
    }

    const sessionId = req.authenticatedSessionId!;
    const session = req.authenticatedSession!;
    const { profile } = parsed.data;

    const updated = await prisma.workerProfile.upsert({
      where: { sessionId },
      create: {
        sessionId,
        name: profile.name,
        age: profile.age,
        state: profile.state || 'Maharashtra',
        district: profile.district || 'Pune',
        occupation: profile.occupation,
        yearsOfConstructionWork: profile.yearsOfConstructionWork,
        isRegistered: profile.isRegistered || false,
        registrationNumber: profile.registrationNumber,
        hasAadhaar: profile.hasAadhaar || false,
        hasBankPassbook: profile.hasBankPassbook || false,
        has90DaysCertificate: profile.has90DaysCertificate || false,
        preferredLanguage: profile.preferredLanguage || session.preferredLanguage,
        consentedAt: new Date(),
      },
      update: {
        ...profile,
        updatedAt: new Date(),
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// 12. DOCUMENT INTELLIGENCE & OCR VERIFICATION
app.post('/api/agent/documents/analyze', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = DocumentAnalysisRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
    }

    const targetSessionId = parsed.data.sessionId;
    if (targetSessionId && !authorizeSession(targetSessionId, req.authenticatedSessionId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied: cannot analyze documents on behalf of another worker.' });
    }

    const result = await ApplicationIntelligenceService.analyzeDocument({
      ...parsed.data,
      sessionId: req.authenticatedSessionId!,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// 13. APPLICATION TASKS MANAGEMENT
app.get('/api/agent/tasks/:sessionId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    if (!authorizeSession(sessionId, req.authenticatedSessionId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied: cannot access another worker tasks.' });
    }

    const tasks = await ApplicationIntelligenceService.listTasks(sessionId);
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

app.post('/api/agent/tasks', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = CreateApplicationTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
    }

    const targetSessionId = parsed.data.sessionId;
    if (targetSessionId && !authorizeSession(targetSessionId, req.authenticatedSessionId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied: cannot create tasks for another worker session.' });
    }

    const task = await ApplicationIntelligenceService.createTask({
      ...parsed.data,
      sessionId: req.authenticatedSessionId!,
    });
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

app.patch('/api/agent/tasks/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = UpdateApplicationTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
    }

    const updated = await ApplicationIntelligenceService.updateTask(
      req.params.id,
      req.authenticatedSessionId!,
      parsed.data.status,
      parsed.data.userNotes
    );
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Central error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  // Redacted logging: mask potential connection strings, keys, secrets
  const rawMessage = String(err?.message || err);
  const safeLog = rawMessage
    .replace(/postgresql:\/\/[^@]+@/g, 'postgresql://[REDACTED]@')
    .replace(/gsk_[a-zA-Z0-9_-]+/g, 'gsk_[REDACTED]')
    .replace(/sk_[a-zA-Z0-9_-]+/g, 'sk_[REDACTED]');

  if (process.env.NODE_ENV !== 'test') {
    console.error(`[${new Date().toISOString()}] [API Error]: ${safeLog}`);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const statusCode = err?.statusCode || (typeof err?.status === 'number' ? err.status : 500);

  if (statusCode < 500) {
    return res.status(statusCode).json({
      error: err.error || 'Request Error',
      message: err.message,
    });
  }

  res.status(500).json({
    error: 'Internal Server Error',
    message: isProduction
      ? 'An unexpected error occurred. Please try again later.'
      : safeLog,
  });
});
