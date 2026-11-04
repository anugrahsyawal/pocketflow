import postgres from 'postgres';
import { databaseOptions } from './connectionOptions.js';

/** One bounded, read-only probe at a time per app; never occupies the business pool. */
export function createReadinessProbe(databaseUrl: string, timeoutMs = 2000): () => Promise<boolean> {
  const options = databaseOptions(databaseUrl);
  let inFlight: Promise<boolean> | undefined;
  return () => {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      const client = postgres(databaseUrl, { ...options, max: 1, prepare: false, connect_timeout: 2 });
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          client`SELECT 1 AS alive`.then(rows => rows[0]?.alive === 1).catch(() => false),
          new Promise<boolean>(resolve => { timer = setTimeout(() => resolve(false), timeoutMs); }),
        ]);
      } catch {
        return false;
      } finally {
        clearTimeout(timer);
        // Also terminates a stalled connection/query, rather than leaving a timed-out query queued.
        await client.end({ timeout: 0 });
      }
    })().catch(() => false).finally(() => { inFlight = undefined; });
    return inFlight;
  };
}
