import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { AppConfig } from './config/env.js';
import { handleAppError } from './lib/errors.js';
import { healthRoutes } from './routes/health.js';

export async function buildApp(config: AppConfig): Promise<FastifyInstance> {
  const app = Fastify({
    logger: config.nodeEnv === 'development' ? { level: 'info' } : false,
  });

  // CORS - strict origin matching from config (no wildcard)
  await app.register(cors, {
    origin: config.corsOrigin,
    credentials: true,
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

  return app;
}
