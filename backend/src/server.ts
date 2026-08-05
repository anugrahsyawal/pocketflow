import { loadAndValidateEnv } from './config/env.js';
import { buildApp } from './app.js';
import { getDb } from './db/client.js';

async function startServer(): Promise<void> {
  try {
    const config = loadAndValidateEnv();

    // Initialize DB client
    getDb(config.databaseUrl);

    const app = await buildApp(config);

    await app.listen({
      port: config.port,
      host: config.host,
    });

    console.log(`Server running at http://${config.host}:${config.port}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Startup failed: ${message}`);
    process.exit(1);
  }
}

startServer();
