import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import {
  CreateSessionSchema,
  AssessEligibilitySchema,
  UpdateDocumentItemSchema,
  ChatRequestSchema,
  DraftRequestSchema,
  CreateJourneyEventSchema,
} from '@haq/shared';
import { prisma } from './prisma';
import { KnowledgeService } from './services/knowledgeService';
import { EligibilityService } from './services/eligibilityService';
import { DocumentService } from './services/documentService';
import { JourneyService } from './services/journeyService';
import { GroqAssistantService } from './services/groqAssistantService';

export const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Simple in-memory rate limiter for AI assistant endpoints
const requestCounts = new Map<string, { count: number; resetTime: number }>();
function rateLimiter(limit: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = requestCounts.get(ip);

    if (!entry || now > entry.resetTime) {
      requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (entry.count >= limit) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please wait a few moments before trying again.',
      });
    }

    entry.count++;
    next();
  };
}

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

// 1. HEALTH CHECK
app.get('/api/health', async (_req: Request, res: Response) => {
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

  res.json({
    status: 'healthy',
    service: 'HAQ Backend API',
    database: dbHealthy ? 'connected' : 'disconnected',
    groqConfigured,
    model: process.env.GROQ_MODEL || 'qwen/qwen3.8-27b',
    timestamp: new Date().toISOString(),
  });
});

// 2. SESSIONS
app.post('/api/sessions', async (req: Request, res: Response, next: NextFunction) => {
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

    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
});

app.get('/api/sessions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const session = await prisma.session.findUnique({
      where: { id },
    });

    if (!session) {
      return res.status(404).json({ error: 'Not Found', message: 'Session not found' });
    }

    res.json(session);
  } catch (err) {
    next(err);
  }
});

// 3. ELIGIBILITY ASSESSMENT
app.post('/api/eligibility/assess', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = AssessEligibilitySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
    }

    const { sessionId, answers, benefitType } = parsed.data;

    // Verify session exists or create on the fly
    let session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      session = await prisma.session.create({
        data: { id: sessionId, preferredLanguage: 'mr' },
      });
      await DocumentService.getOrCreateChecklist(session.id);
    }

    const result = await EligibilityService.evaluateEligibility(session.id, answers, benefitType);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// 4. DOCUMENT CHECKLIST
app.get('/api/documents/checklist/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    let session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      session = await prisma.session.create({
        data: { id: sessionId, preferredLanguage: 'mr' },
      });
    }

    const checklist = await DocumentService.getOrCreateChecklist(session.id);
    res.json(checklist);
  } catch (err) {
    next(err);
  }
});

app.patch('/api/documents/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const sessionId = (req.body?.sessionId || req.headers['x-session-id']) as string;
    if (!sessionId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'A valid sessionId must be provided in the request body or x-session-id header.',
      });
    }

    const parsed = UpdateDocumentItemSchema.safeParse({ ...req.body, sessionId });
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
    }

    const updated = await DocumentService.updateItem(
      id,
      sessionId,
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
  rateLimiter(30, 60 * 1000), // 30 req/min
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = ChatRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
      }

      const { sessionId, message, language } = parsed.data;

      // Ensure session exists
      let session = await prisma.session.findUnique({ where: { id: sessionId } });
      if (!session) {
        session = await prisma.session.create({
          data: { id: sessionId, preferredLanguage: language || 'mr' },
        });
      }

      const chatRes = await GroqAssistantService.chat(
        session.id,
        message,
        language || session.preferredLanguage
      );

      res.json(chatRes);
    } catch (err) {
      next(err);
    }
  }
);

app.post('/api/assistant/draft-request', async (req: Request, res: Response, next: NextFunction) => {
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
app.get('/api/journey/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    let session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      session = await prisma.session.create({
        data: { id: sessionId, preferredLanguage: 'mr' },
      });
    }

    const summary = await JourneyService.getJourneyStatus(session.id);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

app.post('/api/journey/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = CreateJourneyEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
    }

    const { sessionId, eventType, evidenceType, evidenceReference } = parsed.data;

    let session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      session = await prisma.session.create({
        data: { id: sessionId, preferredLanguage: 'mr' },
      });
    }

    const event = await JourneyService.recordEvent(
      session.id,
      eventType,
      evidenceType,
      evidenceReference
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

// Central error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API Error]:', err?.message || err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err?.message || 'An unexpected error occurred.',
  });
});
