import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { AppConfig } from './config/env.js';
import { handleAppError } from './lib/errors.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';

export async function buildApp(config: AppConfig): Promise<FastifyInstance> {
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

  // Register Routes
  await app.register(healthRoutes);
  await app.register(authRoutes);

  return app;
}
