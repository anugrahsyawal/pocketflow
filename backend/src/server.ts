import { loadAndValidateEnv } from './config/env.js';
import { startPersistentServer } from './runtime.js';

async function startServer(): Promise<void> {
  try {
    const config = loadAndValidateEnv();

    const app = await startPersistentServer(config);
    let closing = false;
    const shutdown = async () => {
      if (closing) return;
      closing = true;
      try { await app.close(); process.exitCode = 0; }
      catch { console.error('Shutdown failed'); process.exitCode = 1; }
    };
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);

    console.log(`Server running at http://${config.host}:${config.port}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Startup failed: ${message}`);
    process.exit(1);
  }
}

startServer();
