import crypto from 'node:crypto';
import { eq, and, sql } from 'drizzle-orm';
import { AppError } from './errors.js';
import { getDb, AppDatabase } from '../db/client.js';
import { idempotencyRecords } from '../db/schema.js';

export interface ReplayEnvelope {
  version: number;
  statusCode: number;
  body: unknown;
}

export function sortObjectKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  const sortedKeys = Object.keys(obj).sort();
  const result: Record<string, any> = {};
  for (const key of sortedKeys) {
    result[key] = sortObjectKeys(obj[key]);
  }
  return result;
}

export function computeCanonicalRequestHash(method: string, path: string, body: unknown): string {
  const methodUpper = method.toUpperCase();
  const normalizedBody = body !== undefined && body !== null ? JSON.stringify(sortObjectKeys(body)) : '';
  const input = `${methodUpper}|${path}|${normalizedBody}`;
  return crypto.createHash('sha256').update(input).digest('hex');
}

export async function findIdempotencyRecord(
  userId: string,
  clientMutationId: string,
  db: Pick<AppDatabase, 'select'> = getDb()
): Promise<{ requestHash: string; responseReference: string | null } | null> {
  const rows = await db
    .select({
      requestHash: idempotencyRecords.requestHash,
      responseReference: idempotencyRecords.responseReference,
    })
    .from(idempotencyRecords)
    .where(
      and(
        eq(idempotencyRecords.userId, userId),
        eq(idempotencyRecords.clientMutationId, clientMutationId)
      )
    )
    .limit(1);

  if (rows.length === 0) {
    return null;
  }
  return rows[0];
}

type MutationTransaction = Parameters<Parameters<AppDatabase['transaction']>[0]>[0];

/** Serialize mutation keys before domain locks; all locks release on commit/rollback. */
export async function runIdempotentMutation<T>(
  db: AppDatabase,
  userId: string,
  mutationId: string,
  requestHash: string,
  work: (tx: MutationTransaction) => Promise<T>,
  itemIds: string[] = []
): Promise<T> {
  return db.transaction(async (tx) => {
    // Sort the actual lock keys, so even hash collisions cannot reverse lock order.
    const keys = [...new Set([mutationId, ...itemIds].map(id =>
      crypto.createHash('sha256').update(`${userId.toLowerCase()}:${id.toLowerCase()}`)
        .digest().readBigInt64BE(0).toString()))].sort();
    for (const key of keys) {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${key}::bigint)`);
    }
    const record = await findIdempotencyRecord(userId, mutationId, tx);
    if (record) {
      if (record.requestHash !== requestHash || !record.responseReference) {
        throw new AppError('clientMutationId reused with a different request payload, HTTP method, or route path.', 409, 'IDEMPOTENCY_CONFLICT');
      }
      return parseReplayEnvelope(record.responseReference).body as T;
    }
    return work(tx);
  });
}

export function parseReplayEnvelope(responseRef: string): ReplayEnvelope {
  try {
    return JSON.parse(responseRef) as ReplayEnvelope;
  } catch {
    throw new AppError('Invalid idempotency response envelope', 500, 'INTERNAL_SERVER_ERROR');
  }
}
