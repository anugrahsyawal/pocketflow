import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runPurgeWorker } from '../workers/purgeWorker.js';

async function main() {
  const controller = new AbortController();
  const interrupt = () => controller.abort();
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', interrupt);
  try {
    const result = await runPurgeWorker(process.argv.slice(2), process.env, { signal: controller.signal });
    console.log(JSON.stringify(result.summary));
    process.exitCode = result.exitCode;
  } finally {
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', interrupt);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => {
    console.log(JSON.stringify({ status: 'failed', purgedCount: null, durationMs: 0, code: 'DATABASE_ERROR' }));
    process.exitCode = 1;
  });
}
