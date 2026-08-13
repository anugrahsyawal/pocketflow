import crypto from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { AppError } from './errors.js';
import { getDb } from '../db/client.js';
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
  clientMutationId: string
): Promise<{ requestHash: string; responseReference: string | null } | null> {
  const db = getDb();
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

export function parseReplayEnvelope(responseRef: string): ReplayEnvelope {
  try {
    return JSON.parse(responseRef) as ReplayEnvelope;
  } catch {
    throw new AppError('Invalid idempotency response envelope', 500, 'INTERNAL_SERVER_ERROR');
  }
}
