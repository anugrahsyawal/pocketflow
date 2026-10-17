import { AppError } from './errors.js';
import { getDb } from '../db/client.js';
import { idempotencyRecords } from '../db/schema.js';
import { computeCanonicalRequestHash, findIdempotencyRecord, runIdempotentMutation } from './idempotency.js';
import type { TransactionResponse } from '../routes/transactions.js';

export interface BatchItem {
  clientMutationId: string;
  type: 'expense';
  amount: number;
  pocketId: string;
  categoryId?: string | null;
  occurredOn: string;
  occurredAtLocalTime: string;
  note?: string | null;
}
export interface BatchRequest { clientMutationId: string; items: BatchItem[] }
type ItemOutcome = { clientMutationId: string; status: 'cancelled' } |
  { clientMutationId: string; status: 'committed'; acknowledgement: { transaction: TransactionResponse } };
type BatchResolution = { clientMutationId: string; status: 'committed'; acknowledgement: { transactions: TransactionResponse[] } } |
  { clientMutationId: string; status: 'stopped'; items: ItemOutcome[] };

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const exact = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).length === keys.length && keys.every(key => key in v);
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const sameUuid = (a: unknown, b: string) => uuid(a) && a.toLowerCase() === b.toLowerCase();
const timestamp = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
const invalid = (): never => { throw new AppError('Invalid batch acknowledgement', 500, 'INTERNAL_SERVER_ERROR'); };

/** Validate historical create DTO, never consult mutable current transaction state. */
function validTransaction(v: unknown, item: BatchItem): v is TransactionResponse {
  if (!object(v) || !exact(v, ['id', 'type', 'amount', 'pocketId', 'fromPocketId', 'toPocketId', 'categoryId', 'budgetPocketId', 'transferType', 'incomeSource', 'occurredOn', 'occurredAtLocalTime', 'note', 'isArchived', 'archivedAt', 'revision', 'createdAt', 'updatedAt'])) return false;
  return uuid(v.id) && v.type === 'expense' && v.amount === item.amount && sameUuid(v.pocketId, item.pocketId) &&
    (item.categoryId == null ? v.categoryId === null : sameUuid(v.categoryId, item.categoryId)) &&
    uuid(v.budgetPocketId) && v.fromPocketId === null && v.toPocketId === null && v.transferType === null && v.incomeSource === null &&
    v.occurredOn === item.occurredOn && typeof v.occurredAtLocalTime === 'string' &&
    (v.occurredAtLocalTime.length === 5 ? v.occurredAtLocalTime + ':00' : v.occurredAtLocalTime) ===
      (item.occurredAtLocalTime.length === 5 ? item.occurredAtLocalTime + ':00' : item.occurredAtLocalTime) &&
    // Single-create preserves note whitespace; batch-created items trim it.
    // Both can legitimately own the same item hash under the existing contract.
    (v.note === (item.note ?? null) || v.note === (item.note?.trim() || null)) && v.revision === 1 && v.isArchived === false && v.archivedAt === null &&
    timestamp(v.createdAt) && timestamp(v.updatedAt) && v.createdAt === v.updatedAt;
}

function envelope(reference: string): Record<string, unknown> {
  let v: unknown;
  try { v = JSON.parse(reference); } catch { return invalid(); }
  if (!object(v) || !exact(v, ['version', 'statusCode', 'body']) || v.version !== 1 || !object(v.body)) return invalid();
  return v;
}
function isCancellation(v: Record<string, unknown>): boolean {
  const body = v.body;
  return v.statusCode === 409 && object(body) && object(body.error) &&
    exact(body.error, ['code', 'message']) && body.error.code === 'MUTATION_CANCELLED' && typeof body.error.message === 'string';
}
function committedItem(body: unknown, item: BatchItem): body is { transaction: TransactionResponse } {
  return object(body) && exact(body, ['transaction']) && validTransaction(body.transaction, item);
}
function validOutcomes(value: unknown, items: BatchItem[]): value is ItemOutcome[] {
  if (!Array.isArray(value) || value.length !== items.length) return false;
  const transactionIds = new Set<string>();
  return value.every((entry, index) => {
    if (!object(entry) || entry.clientMutationId !== items[index].clientMutationId) return false;
    if (entry.status === 'cancelled') return exact(entry, ['clientMutationId', 'status']);
    if (entry.status !== 'committed' || !exact(entry, ['clientMutationId', 'status', 'acknowledgement']) || !committedItem(entry.acknowledgement, items[index])) return false;
    const id = entry.acknowledgement.transaction.id.toLowerCase();
    if (transactionIds.has(id)) return false;
    transactionIds.add(id);
    return true;
  });
}
function replayResolution(reference: string, request: BatchRequest): BatchResolution {
  const v = envelope(reference), body = v.body as Record<string, unknown>;
  if (v.statusCode === 201 && exact(body, ['transactions']) && Array.isArray(body.transactions) &&
    body.transactions.length === request.items.length && body.transactions.every((row, i) => validTransaction(row, request.items[i])) &&
    new Set(body.transactions.map(row => row.id.toLowerCase())).size === body.transactions.length) {
    return { status: 'committed', clientMutationId: request.clientMutationId, acknowledgement: body as { transactions: TransactionResponse[] } };
  }
  const result = body.resolution;
  if (isCancellation(v) && exact(body, ['error', 'resolution']) && object(result) && exact(result, ['status', 'clientMutationId', 'items']) &&
    result.status === 'stopped' && result.clientMutationId === request.clientMutationId && validOutcomes(result.items, request.items)) {
    return result as BatchResolution;
  }
  return invalid();
}

/** Root and every item are serialized with normal batch and single-create writes. */
export async function resolveBatchAttempt(userId: string, request: BatchRequest): Promise<BatchResolution> {
  const rootHash = computeCanonicalRequestHash('POST', '/v1/transactions/batch', request);
  const error = { code: 'MUTATION_CANCELLED', message: 'Mutation attempt cancelled.' };
  return runIdempotentMutation<BatchResolution>(getDb(), userId, request.clientMutationId, rootHash, async tx => {
    const outcomes: ItemOutcome[] = [];
    for (const item of request.items) {
      const requestHash = computeCanonicalRequestHash('POST', '/v1/transactions', item);
      const record = await findIdempotencyRecord(userId, item.clientMutationId, tx);
      if (record) {
        if (record.requestHash !== requestHash) throw new AppError('Batch item mutation ID has a different payload.', 409, 'IDEMPOTENCY_CONFLICT');
        if (!record.responseReference) return invalid();
        const v = envelope(record.responseReference);
        if (v.statusCode === 201 && committedItem(v.body, item)) {
          outcomes.push({ clientMutationId: item.clientMutationId, status: 'committed', acknowledgement: v.body });
          continue;
        }
        if (!isCancellation(v) || !object(v.body) || !exact(v.body, ['error'])) return invalid();
      } else {
        await tx.insert(idempotencyRecords).values({ userId, clientMutationId: item.clientMutationId, requestHash, expiresAt: null,
          responseReference: JSON.stringify({ version: 1, statusCode: 409, body: { error } }) });
      }
      outcomes.push({ clientMutationId: item.clientMutationId, status: 'cancelled' });
    }
    if (!validOutcomes(outcomes, request.items)) return invalid();
    const result: BatchResolution = { status: 'stopped', clientMutationId: request.clientMutationId, items: outcomes };
    await tx.insert(idempotencyRecords).values({ userId, clientMutationId: request.clientMutationId, requestHash: rootHash, expiresAt: null,
      responseReference: JSON.stringify({ version: 1, statusCode: 409, body: { error, resolution: result } }) });
    return result;
  }, request.items.map(item => item.clientMutationId), reference => replayResolution(reference, request));
}
