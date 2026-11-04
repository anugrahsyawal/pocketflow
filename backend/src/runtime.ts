import type { AppConfig } from './config/env.js';
import { buildApp } from './app.js';
import { getDb, closeDb } from './db/client.js';
import { startPurgeScheduler, stopPurgeScheduler } from './lib/purge.js';

/** Persistent Node runtime only. The app factory itself never starts background jobs. */
export async function startPersistentServer(config: AppConfig) {
  getDb(config.databaseUrl);
  const app = await buildApp(config).catch(async error => {
    await closeDb();
    throw error;
  });
  app.addHook('onClose', async () => {
    stopPurgeScheduler();
    await closeDb();
  });
  try {
    await app.listen({ port: config.port, host: config.host });
    // Never run maintenance from an import or failed listener startup.
    startPurgeScheduler({ intervalMs: 24 * 60 * 60 * 1000, retentionDays: 30, unref: true });
    return app;
  } catch (error) {
    await app.close();
    throw error;
  }
}
