import dotenv from 'dotenv';
dotenv.config();

import { app } from './app';
import { prisma } from './prisma';

const PORT = Number(process.env.PORT) || 4000;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`[HAQ API] Server listening on http://${HOST}:${PORT}`);
  console.log(`[HAQ API] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[HAQ API] Groq configured: ${Boolean(process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.startsWith('your_'))}`);

  // Non-blocking database connection probe
  prisma.$queryRaw`SELECT 1`
    .then(() => {
      console.log('[HAQ API] Database connection established successfully');
    })
    .catch((err) => {
      console.warn('[HAQ API] Database connection warning:', err?.message || err);
      console.warn('[HAQ API] Server is running, but database operations may fail until database is reachable.');
    });
});

// Graceful shutdown handling for Render / container lifecycles
let shuttingDown = false;
const gracefulShutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[HAQ API] Received ${signal}. Starting graceful shutdown...`);

  // Force shutdown after 10 seconds timeout
  const forceTimer = setTimeout(() => {
    console.error('[HAQ API] Force shutting down after timeout');
    process.exit(1);
  }, 10000);
  forceTimer.unref();

  server.close(async () => {
    console.log('[HAQ API] HTTP server closed');
    try {
      await prisma.$disconnect();
      console.log('[HAQ API] Database connection closed');
    } catch (err) {
      console.error('[HAQ API] Error closing database connection:', err);
    }
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
