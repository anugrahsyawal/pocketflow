import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { getTestDb } from './testDb.js';
import { loadAndValidateEnv } from '../../src/config/env.js';

export async function createTestApp(): Promise<FastifyInstance> {
  await getTestDb();
  const config = loadAndValidateEnv();
  const app = await buildApp(config);
  return app;
}
