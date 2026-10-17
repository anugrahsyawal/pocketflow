import { ApiError } from './sessionClient';
import { parseTransactionPage, transactionQuery, type ServerTransaction } from './transactionRead';

export interface BatchExpense {
  clientMutationId: string; type: 'expense'; amount: number; pocketId: string;
  categoryId?: string | null; occurredOn: string; occurredAtLocalTime: string; note?: string | null;
}
export interface TransactionBatchRequest {
  ownerId: string; body: { clientMutationId: string; items: BatchExpense[] };
}
export type BatchItemOutcome = { clientMutationId: string; status: 'cancelled' } |
  { clientMutationId: string; status: 'committed'; acknowledgement: { transaction: ServerTransaction } };
export type TransactionBatchResolution =
  { clientMutationId: string; status: 'committed'; acknowledgement: { transactions: ServerTransaction[] } } |
  { clientMutationId: string; status: 'stopped'; items: BatchItemOutcome[] };

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const exact = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).length === keys.length && keys.every(k => k in v);
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const invalid = (): never => { throw new ApiError(400, 'INVALID_INPUT'); };
const badResponse = (): never => { throw new ApiError(502, 'INVALID_RESPONSE'); };

/** Deep copy before awaits; preserve ordering, null/omission, casing and whitespace. */
export function snapshotBatchRequest(input: TransactionBatchRequest): TransactionBatchRequest {
  if (!object(input) || !exact(input, ['ownerId', 'body']) || !uuid(input.ownerId) ||
    !object(input.body) || !exact(input.body, ['clientMutationId', 'items']) || !uuid(input.body.clientMutationId) ||
    !Array.isArray(input.body.items) || input.body.items.length < 1 || input.body.items.length > 50) return invalid();
  const ids = new Set([input.body.clientMutationId.toLowerCase()]);
  const items = Array.from(input.body.items, (item: unknown): BatchExpense => {
    if (!object(item) || Object.keys(item).some(k => !['clientMutationId', 'type', 'amount', 'pocketId', 'categoryId', 'occurredOn', 'occurredAtLocalTime', 'note'].includes(k)) ||
      !uuid(item.clientMutationId) || ids.has(item.clientMutationId.toLowerCase()) || item.type !== 'expense' || !uuid(item.pocketId) ||
      typeof item.amount !== 'number' || !Number.isSafeInteger(item.amount) || item.amount < 1 ||
      ('categoryId' in item && item.categoryId !== null && !uuid(item.categoryId)) ||
      ('note' in item && item.note !== null && (typeof item.note !== 'string' || item.note.length > 500)) ||
      typeof item.occurredOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.occurredOn) || !Number.isFinite(Date.parse(item.occurredOn + 'T00:00:00Z')) ||
      new Date(item.occurredOn + 'T00:00:00Z').toISOString().slice(0, 10) !== item.occurredOn ||
      typeof item.occurredAtLocalTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(item.occurredAtLocalTime)) return invalid();
    ids.add(item.clientMutationId.toLowerCase());
    return { clientMutationId: item.clientMutationId, type: 'expense', amount: item.amount, pocketId: item.pocketId,
      occurredOn: item.occurredOn, occurredAtLocalTime: item.occurredAtLocalTime,
      ...('categoryId' in item ? { categoryId: item.categoryId as string | null } : {}),
      ...('note' in item ? { note: item.note as string | null } : {}) };
  });
  return { ownerId: input.ownerId, body: { clientMutationId: input.body.clientMutationId, items } };
}

function validateItem(item: BatchExpense, raw: unknown): ServerTransaction {
  const t = parseTransactionPage({ transactions: [raw], pagination: { page: 1, limit: 1, total: 1, totalPages: 1, hasMore: false } }, transactionQuery({ limit: 1 }).query).transactions[0];
  if (!t || !object(raw) || !exact(raw, Object.keys(t))) return badResponse();
  const sameUuid = (actual: string | null, expected: string) => actual?.toLowerCase() === expected.toLowerCase();
  const seconds = (v: string) => v.length === 5 ? v + ':00' : v;
  if (t.type !== 'expense' || t.amount !== item.amount || !sameUuid(t.pocketId, item.pocketId) ||
    (item.categoryId == null ? t.categoryId !== null : !sameUuid(t.categoryId, item.categoryId)) ||
    t.budgetPocketId === null || t.fromPocketId !== null || t.toPocketId !== null || t.transferType !== null || t.incomeSource !== null ||
    t.occurredOn !== item.occurredOn || seconds(t.occurredAtLocalTime) !== seconds(item.occurredAtLocalTime) ||
    (t.note !== (item.note ?? null) && t.note !== (item.note?.trim() || null)) ||
    t.revision !== 1 || t.isArchived || t.archivedAt !== null || t.createdAt !== t.updatedAt) return badResponse();
  return t;
}
function uniqueTransactions(rows: ServerTransaction[]) {
  if (new Set(rows.map(t => t.id.toLowerCase())).size !== rows.length) badResponse();
}

/** Ordered historical acknowledgements only, not a canonical ledger refresh. */
export function validateBatchAcknowledgement(input: TransactionBatchRequest, result: unknown): ServerTransaction[] {
  if (!object(result) || !exact(result, ['transactions']) || !Array.isArray(result.transactions) || result.transactions.length !== input.body.items.length) return badResponse();
  const rows = Array.from(result.transactions, (row, index) => {
    const item = input.body.items[index];
    if (!item) return badResponse();
    return validateItem(item, row);
  });
  uniqueTransactions(rows);
  return rows;
}

export function validateBatchResolution(input: TransactionBatchRequest, result: unknown): TransactionBatchResolution {
  if (!object(result) || result.clientMutationId !== input.body.clientMutationId) return badResponse();
  if (result.status === 'committed' && exact(result, ['status', 'clientMutationId', 'acknowledgement'])) {
    return { status: 'committed', clientMutationId: input.body.clientMutationId,
      acknowledgement: { transactions: validateBatchAcknowledgement(input, result.acknowledgement) } };
  }
  if (result.status !== 'stopped' || !exact(result, ['status', 'clientMutationId', 'items']) ||
    !Array.isArray(result.items) || result.items.length !== input.body.items.length) return badResponse();
  const committed: ServerTransaction[] = [];
  const items = Array.from(result.items, (entry, index): BatchItemOutcome => {
    const item = input.body.items[index];
    if (!item || !object(entry) || entry.clientMutationId !== item.clientMutationId) return badResponse();
    if (entry.status === 'cancelled' && exact(entry, ['clientMutationId', 'status'])) return { clientMutationId: item.clientMutationId, status: 'cancelled' };
    if (entry.status !== 'committed' || !exact(entry, ['clientMutationId', 'status', 'acknowledgement']) ||
      !object(entry.acknowledgement) || !exact(entry.acknowledgement, ['transaction'])) return badResponse();
    const transaction = validateItem(item, entry.acknowledgement.transaction);
    committed.push(transaction);
    return { clientMutationId: item.clientMutationId, status: 'committed', acknowledgement: { transaction } };
  });
  uniqueTransactions(committed);
  return { status: 'stopped', clientMutationId: input.body.clientMutationId, items };
}
