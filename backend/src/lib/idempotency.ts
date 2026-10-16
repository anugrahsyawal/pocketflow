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
  itemIds: string[] = [],
  replay?: (reference: string) => T
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
      return replay ? replay(record.responseReference) : parseReplayEnvelope(record.responseReference).body as T;
    }
    return work(tx);
  });
}

export function parseReplayEnvelope(responseRef: string, allowCancelled = false): ReplayEnvelope {
  let envelope: ReplayEnvelope;
  try {
    envelope = JSON.parse(responseRef) as ReplayEnvelope;
  } catch {
    throw new AppError('Invalid idempotency response envelope', 500, 'INTERNAL_SERVER_ERROR');
  }
  if (!allowCancelled && envelope.statusCode === 409 &&
    (envelope.body as {error?: {code?: string}})?.error?.code === 'MUTATION_CANCELLED') {
    throw new AppError('This mutation attempt was cancelled and cannot execute.', 409, 'MUTATION_CANCELLED');
  }
  return envelope;
}

/** Same lock and original-create hash as POST, with a permanent non-financial fence. */
export async function resolveCreateAttempt(userId: string, mutationId: string, requestHash: string) {
  return resolveTransactionMutation(userId, mutationId, requestHash, 201);
}

export async function resolveLifecycleAttempt(userId: string, mutationId: string, requestHash: string) {
  return resolveTransactionMutation(userId, mutationId, requestHash, 200);
}

export async function resolveDeleteAttempt(userId:string, mutationId:string, requestHash:string, transactionId:string) {
  return resolveTransactionMutation(userId, mutationId, requestHash, 200, body => {
    if(!body||typeof body!=='object'||Array.isArray(body))return false;
    const ack=body as Record<string,unknown>;
    return Object.keys(ack).every(key=>['success','deletedTransactionId','deletedAt'].includes(key))&&
      ack.success===true&&ack.deletedTransactionId===transactionId&&typeof ack.deletedAt==='string'&&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(ack.deletedAt)&&
      Number.isFinite(Date.parse(ack.deletedAt))&&new Date(ack.deletedAt).toISOString()===ack.deletedAt;
  });
}

export async function resolveEditAttempt(userId:string,mutationId:string,requestHash:string,transactionId:string,expectedRevision:number) {
  return resolveTransactionMutation(userId,mutationId,requestHash,200,body=>{
    if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>key!=='transaction'))return false;
    const row=(body as {transaction?:Record<string,unknown>}).transaction;
    if(!row||typeof row!=='object'||Array.isArray(row))return false;
    const keys=['id','type','amount','pocketId','fromPocketId','toPocketId','categoryId','budgetPocketId','transferType','incomeSource','occurredOn','occurredAtLocalTime','note','isArchived','archivedAt','revision','createdAt','updatedAt'];
    const uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
    const timestamp=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
    if(Object.keys(row).length!==keys.length||keys.some(key=>!(key in row))||row.id!==transactionId||
      !['expense','income','transfer'].includes(String(row.type))||typeof row.amount!=='number'||!Number.isSafeInteger(row.amount)||row.amount<1||
      (row.revision!==expectedRevision&&row.revision!==expectedRevision+1)||
      ['pocketId','fromPocketId','toPocketId','categoryId','budgetPocketId'].some(key=>row[key]!==null&&!uuid(row[key]))||
      typeof row.occurredOn!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(row.occurredOn)||!Number.isFinite(Date.parse(row.occurredOn+'T00:00:00Z'))||new Date(row.occurredOn+'T00:00:00Z').toISOString().slice(0,10)!==row.occurredOn||
      typeof row.occurredAtLocalTime!=='string'||!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(row.occurredAtLocalTime)||
      (row.note!==null&&(typeof row.note!=='string'||row.note.length>500))||typeof row.isArchived!=='boolean'||
      (row.isArchived?!timestamp(row.archivedAt):row.archivedAt!==null)||!timestamp(row.createdAt)||!timestamp(row.updatedAt))return false;
    if(row.type==='transfer')return row.pocketId===null&&row.categoryId===null&&row.budgetPocketId===null&&row.incomeSource===null&&
      uuid(row.fromPocketId)&&uuid(row.toPocketId)&&row.fromPocketId!==row.toPocketId&&['normal','tarik-tunai','top-up-nfc','reimbursement','saving-allocation','budget-reallocation'].includes(String(row.transferType));
    if(!uuid(row.pocketId)||row.fromPocketId!==null||row.toPocketId!==null||row.transferType!==null)return false;
    return row.type==='expense'?uuid(row.budgetPocketId)&&row.incomeSource===null:
      row.categoryId===null&&row.budgetPocketId===null&&(row.incomeSource===null||['gaji','bonus','cashback','reimbursement','other'].includes(String(row.incomeSource)));
  });
}

async function resolveTransactionMutation(userId: string, mutationId: string, requestHash: string, successStatus: 200 | 201,
  validAcknowledgement:(body:unknown)=>boolean=body=>!!(body as {transaction?:unknown})?.transaction) {
  type Resolution = {status: 'cancelled' | 'committed'; clientMutationId: string; acknowledgement?: unknown};
  const cancelled: Resolution = {status: 'cancelled', clientMutationId: mutationId};
  return runIdempotentMutation<Resolution>(getDb(), userId, mutationId, requestHash, async tx => {
    await tx.insert(idempotencyRecords).values({userId, clientMutationId: mutationId, requestHash,
      expiresAt: null, responseReference: JSON.stringify({version: 1, statusCode: 409,
        body: {error: {code: 'MUTATION_CANCELLED', message: 'Mutation attempt cancelled.'}}})});
    return cancelled;
  }, [], reference => {
    const envelope = parseReplayEnvelope(reference, true);
    if (envelope.statusCode === 409 &&
      (envelope.body as {error?: {code?: string}})?.error?.code === 'MUTATION_CANCELLED') return cancelled;
    if (envelope.statusCode !== successStatus || !validAcknowledgement(envelope.body)) {
      throw new AppError('Invalid transaction acknowledgement', 500, 'INTERNAL_SERVER_ERROR');
    }
    return {status: 'committed', clientMutationId: mutationId, acknowledgement: envelope.body};
  });
}
