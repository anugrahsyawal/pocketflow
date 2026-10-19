import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { AppConfig } from './config/env.js';
import { handleAppError } from './lib/errors.js';
import { startPurgeScheduler, stopPurgeScheduler } from './lib/purge.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { setupRoutes } from './routes/setup.js';
import { pocketRoutes } from './routes/pockets.js';
import { categoryRoutes } from './routes/categories.js';
import { transactionRoutes } from './routes/transactions.js';
import { transactionExportRoutes } from './routes/transactionExport.js';
import { reportRoutes } from './routes/reports.js';

export async function buildApp(config: AppConfig, options: { reportClock?: () => Date } = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: config.nodeEnv === 'development' ? { level: 'info' } : false,
  });

  // CORS - strict origin matching from config (no wildcard) and credentialed
  await app.register(cors, {
    origin: config.corsOrigin,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  });

  // Cookie session configuration baseline
  await app.register(cookie, {
    secret: config.sessionSecret,
    hook: 'onRequest',
  });

  // Error Handler
  app.setErrorHandler(handleAppError);

  // Background Purge Scheduler Lifecycle (DEC-030.2)
  startPurgeScheduler({
    intervalMs: 24 * 60 * 60 * 1000,
    retentionDays: 30,
    unref: true,
  });

  app.addHook('onClose', async () => {
    stopPurgeScheduler();
  });

  // Register Routes
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(setupRoutes);
  await app.register(pocketRoutes);
  await app.register(categoryRoutes);
  await app.register(transactionRoutes);
  await app.register(transactionExportRoutes);
  await app.register(reportRoutes, {clock: options.reportClock});

  return app;
}
