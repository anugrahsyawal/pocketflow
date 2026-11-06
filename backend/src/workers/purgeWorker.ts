import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema.js';
import { databaseOptions } from '../db/connectionOptions.js';
import { purgeDeletedTransactions, type PurgeResult } from '../lib/purge.js';

export const PURGE_WORKER_TIMEOUT_MS = 30_000;
type FailureCode = 'INVALID_ARGUMENTS' | 'INVALID_CONFIGURATION' | 'TIMEOUT' | 'INTERRUPTED' | 'DATABASE_ERROR';
export interface WorkerResult {
  exitCode: 0 | 1 | 2;
  summary: {
    status: PurgeResult['status'] | 'failed';
    purgedCount: number | null;
    durationMs: number;
    code?: FailureCode;
  };
}

/** One invocation, one dedicated connection, one batch. No work happens on import. */
export async function runPurgeWorker(
  args: readonly string[], env: NodeJS.ProcessEnv = process.env,
  options: { signal?: AbortSignal; timeoutMs?: number } = {}, // deadline override is internal/test-only
): Promise<WorkerResult> {
  const started = performance.now();
  const elapsed = () => Math.round(performance.now() - started);
  const failed = (code: FailureCode): WorkerResult => ({
    exitCode: 1, summary: { status: 'failed', purgedCount: null, durationMs: elapsed(), code },
  });
  if (args.length !== 1 || args[0] !== '--execute') return failed('INVALID_ARGUMENTS');

  let url: string;
  let settings: ReturnType<typeof databaseOptions>;
  const timeoutMs = options.timeoutMs ?? PURGE_WORKER_TIMEOUT_MS;
  try {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > PURGE_WORKER_TIMEOUT_MS) throw new Error();
    if (!['development', 'test', 'production'].includes(env.NODE_ENV ?? 'development')) throw new Error();
    // Intentionally no fallback to the API's DATABASE_URL or default .env file.
    url = env.PURGE_DATABASE_URL!;
    const parsed = new URL(url);
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname ||
        parsed.pathname.length <= 1 || parsed.hash || env.DB_CONNECTION_MODE === 'transaction') throw new Error();
    settings = databaseOptions(url, env);
  } catch { return failed('INVALID_CONFIGURATION'); }
  if (options.signal?.aborted) return failed('INTERRUPTED');

  let client: postgres.Sql | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  let failureCode: FailureCode = 'DATABASE_ERROR';
  let result: PurgeResult | undefined;
  let work: Promise<PurgeResult> | undefined;
  try {
    client = postgres(url, { ...settings, max: 1, connect_timeout: 5, onnotice: () => {} });
    const db = drizzle(client, { schema });
    const stop = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => { failureCode = 'TIMEOUT'; reject(new Error('deadline')); }, timeoutMs);
      abort = () => { failureCode = 'INTERRUPTED'; reject(new Error('interrupted')); };
      options.signal?.addEventListener('abort', abort, { once: true });
    });
    work = purgeDeletedTransactions({ db });
    result = await Promise.race([work, stop]);
  } catch { /* Never expose database errors or infer a zero-write outcome. */ }
  finally {
    clearTimeout(timer);
    if (abort) options.signal?.removeEventListener('abort', abort);
    // Forced termination stops queued/in-flight work, not just the waiting caller.
    // If COMMIT raced a lost connection, the outcome remains unknown; retry is safe.
    try { await client?.end({ timeout: 0 }); }
    catch { result = undefined; failureCode = 'DATABASE_ERROR'; }
    // Drain the rejected transaction after forced shutdown before returning to the caller.
    // Otherwise transaction cleanup can outlive this invocation/test scope.
    if (work) await work.catch(() => {});
  }
  if (!result) return failed(failureCode);
  return {
    exitCode: result.status === 'limit_reached' ? 2 : 0,
    summary: { status: result.status, purgedCount: result.purgedCount, durationMs: elapsed() },
  };
}
