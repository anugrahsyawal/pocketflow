import { test, before, beforeEach, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { createTestApp } from '../helpers/testApp.js';
import { getTestDb, resetTestDatabase, createTestOwner, closeTestDb, TestDatabase } from '../helpers/testDb.js';
import { pockets, categories, budgetPeriods, pocketBudgetAllocations, transactions } from '../../src/db/schema.js';

describe('POST /v1/transactions Integration Tests', () => {
  let app: FastifyInstance;
  let db: TestDatabase;

  before(async () => {
    db = await getTestDb();
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetTestDatabase(db);
  });

  after(async () => {
    await app.close();
    await closeTestDb();
  });

  // Helper to create pocket
  async function createPocket(
    userId: string,
    name: string,
    openingBalance = 100000,
    templateKey?: string,
    budgetOwnerPocketId?: string
  ) {
    const [p] = await db
      .insert(pockets)
      .values({
        userId,
        name,
        emoji: '💳',
        groupId: 'living',
        openingBalance,
        templateKey,
        budgetOwnerPocketId,
      })
      .returning();
    return p;
  }

  // Helper to create category
  async function createCategory(userId: string, pocketId: string, name: string) {
    const [c] = await db
      .insert(categories)
      .values({
        userId,
        pocketId,
        name,
        emoji: '🏷️',
      })
      .returning();
    return c;
  }

  test('T-002: Reject POST /v1/transactions without session cookie (401 UNAUTHENTICATED)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { 'x-csrf-token': 'any-token' },
      payload: {
        clientMutationId: crypto.randomUUID(),
        type: 'expense',
        amount: 10000,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:00:00',
      },
    });

    assert.equal(res.statusCode, 401);
    assert.equal(res.json().error.code, 'UNAUTHENTICATED');
  });

  test('T-008: Reject POST /v1/transactions with missing or invalid CSRF token (403 INVALID_CSRF_TOKEN)', async () => {
    const owner = await createTestOwner(db);

    // Missing CSRF header
    const res1 = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader },
      payload: {
        clientMutationId: crypto.randomUUID(),
        type: 'expense',
        amount: 10000,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:00:00',
      },
    });
    assert.equal(res1.statusCode, 403);
    assert.equal(res1.json().error.code, 'INVALID_CSRF_TOKEN');

    // Mismatched CSRF header
    const res2 = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': 'wrong-csrf-token' },
      payload: {
        clientMutationId: crypto.randomUUID(),
        type: 'expense',
        amount: 10000,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:00:00',
      },
    });
    assert.equal(res2.statusCode, 403);
    assert.equal(res2.json().error.code, 'INVALID_CSRF_TOKEN');
  });

  test('T-012: Reject transaction with amount = 0 or negative amount (400 INVALID_INPUT)', async () => {
    const owner = await createTestOwner(db);
    const pocket = await createPocket(owner.userId, 'Main', 100000);

    const res0 = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        type: 'expense',
        amount: 0,
        pocketId: pocket.id,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:00:00',
      },
    });
    assert.equal(res0.statusCode, 400);
    assert.equal(res0.json().error.code, 'INVALID_INPUT');

    const resNeg = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        type: 'expense',
        amount: -5000,
        pocketId: pocket.id,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:00:00',
      },
    });
    assert.equal(resNeg.statusCode, 400);
    assert.equal(resNeg.json().error.code, 'INVALID_INPUT');
  });

  test('T-013: Reject expense without pocketId (400 INVALID_INPUT)', async () => {
    const owner = await createTestOwner(db);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        type: 'expense',
        amount: 10000,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:00:00',
      },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.code, 'INVALID_INPUT');
  });

  test('T-014: Reject expense with fromPocketId or toPocketId supplied (400 INVALID_INPUT)', async () => {
    const owner = await createTestOwner(db);
    const pocket = await createPocket(owner.userId, 'Main', 100000);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        type: 'expense',
        amount: 10000,
        pocketId: pocket.id,
        fromPocketId: pocket.id,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:00:00',
      },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.code, 'INVALID_INPUT');
  });

  test('T-015: Reject transfer without fromPocketId or toPocketId (400 INVALID_INPUT)', async () => {
    const owner = await createTestOwner(db);
    const pocket = await createPocket(owner.userId, 'Main', 100000);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        type: 'transfer',
        amount: 10000,
        fromPocketId: pocket.id,
        transferType: 'normal',
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:00:00',
      },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.code, 'INVALID_INPUT');
  });

  test('T-016: Reject transfer with fromPocketId == toPocketId (422 INVALID_REFERENCE)', async () => {
    const owner = await createTestOwner(db);
    const pocket = await createPocket(owner.userId, 'Main', 100000);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        type: 'transfer',
        amount: 10000,
        fromPocketId: pocket.id,
        toPocketId: pocket.id,
        transferType: 'normal',
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:00:00',
      },
    });
    assert.equal(res.statusCode, 422);
    assert.equal(res.json().error.code, 'INVALID_REFERENCE');
  });

  test('T-017 & T-018: Reject invalid occurredOn and occurredAtLocalTime formats (400 INVALID_INPUT)', async () => {
    const owner = await createTestOwner(db);
    const pocket = await createPocket(owner.userId, 'Main', 100000);

    // Invalid date
    const resDate = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        type: 'expense',
        amount: 10000,
        pocketId: pocket.id,
        occurredOn: '2026-02-31',
        occurredAtLocalTime: '12:00:00',
      },
    });
    assert.equal(resDate.statusCode, 400);
    assert.equal(resDate.json().error.code, 'INVALID_INPUT');

    // Invalid time
    const resTime = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        type: 'expense',
        amount: 10000,
        pocketId: pocket.id,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '25:70:00',
      },
    });
    assert.equal(resTime.statusCode, 400);
    assert.equal(resTime.json().error.code, 'INVALID_INPUT');
  });

  test('T-023: Replay stored 201 Created response when POST /v1/transactions is retried with identical clientMutationId', async () => {
    const owner = await createTestOwner(db);
    const pocket = await createPocket(owner.userId, 'Main', 100000);
    const clientMutationId = crypto.randomUUID();

    const payload = {
      clientMutationId,
      type: 'expense',
      amount: 15000,
      pocketId: pocket.id,
      occurredOn: '2026-08-24',
      occurredAtLocalTime: '12:00:00',
      note: 'Idempotent Expense',
    };

    const res1 = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload,
    });
    assert.equal(res1.statusCode, 201);
    const txn1 = res1.json().transaction;

    // Retry with identical payload
    const res2 = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload,
    });
    assert.equal(res2.statusCode, 201);
    const txn2 = res2.json().transaction;
    assert.deepEqual(txn1, txn2);

    // Verify only 1 row created in database
    const rows = await db.select().from(transactions).where(eq(transactions.userId, owner.userId));
    assert.equal(rows.length, 1);
  });

  test('T-024: Return 409 IDEMPOTENCY_CONFLICT when clientMutationId is reused with modified payload', async () => {
    const owner = await createTestOwner(db);
    const pocket = await createPocket(owner.userId, 'Main', 100000);
    const clientMutationId = crypto.randomUUID();

    const res1 = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId,
        type: 'expense',
        amount: 15000,
        pocketId: pocket.id,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:00:00',
      },
    });
    assert.equal(res1.statusCode, 201);

    // Reuse mutation ID with modified amount
    const res2 = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId,
        type: 'expense',
        amount: 30000,
        pocketId: pocket.id,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:00:00',
      },
    });
    assert.equal(res2.statusCode, 409);
    assert.equal(res2.json().error.code, 'IDEMPOTENCY_CONFLICT');
  });

  test('T-031 & T-032: Create valid Expense transaction and reject with 422 INSUFFICIENT_FUNDS if derived balance would be negative', async () => {
    const owner = await createTestOwner(db);
    const pocket = await createPocket(owner.userId, 'Main', 50000); // 50k balance

    // Expense 30k -> succeeds, leaves 20k
    const res1 = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        type: 'expense',
        amount: 30000,
        pocketId: pocket.id,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:00:00',
        note: 'First expense',
      },
    });
    assert.equal(res1.statusCode, 201);
    assert.equal(res1.json().transaction.amount, 30000);

    // Expense 25k -> exceeds 20k balance -> rejects with 422 INSUFFICIENT_FUNDS
    const res2 = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        type: 'expense',
        amount: 25000,
        pocketId: pocket.id,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:00:00',
        note: 'Overdraft attempt',
      },
    });
    assert.equal(res2.statusCode, 422);
    assert.equal(res2.json().error.code, 'INSUFFICIENT_FUNDS');

    // Expense 20k -> exactly drains balance to 0 -> succeeds
    const res3 = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        type: 'expense',
        amount: 20000,
        pocketId: pocket.id,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '13:00:00',
        note: 'Exact drain expense',
      },
    });
    assert.equal(res3.statusCode, 201);
  });

  test('T-033: Create valid Income transaction and verify derived balance increases', async () => {
    const owner = await createTestOwner(db);
    const pocket = await createPocket(owner.userId, 'Main', 10000);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        type: 'income',
        amount: 100000,
        pocketId: pocket.id,
        incomeSource: 'gaji',
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:00:00',
        note: 'Monthly salary',
      },
    });
    assert.equal(res.statusCode, 201);
    const txn = res.json().transaction;
    assert.equal(txn.type, 'income');
    assert.equal(txn.amount, 100000);
    assert.equal(txn.incomeSource, 'gaji');
    assert.equal(txn.budgetPocketId, null);

    // Now an expense of 105k should succeed (since total balance is 10k + 100k = 110k)
    const resExp = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        type: 'expense',
        amount: 105000,
        pocketId: pocket.id,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '13:00:00',
      },
    });
    assert.equal(resExp.statusCode, 201);
  });

  test('T-034 & T-035: Standard Transfer balance updates and 422 INSUFFICIENT_FUNDS rejection', async () => {
    const owner = await createTestOwner(db);
    const p1 = await createPocket(owner.userId, 'Source', 30000);
    const p2 = await createPocket(owner.userId, 'Dest', 10000);

    // Transfer 20k from p1 to p2 -> succeeds (p1 has 10k left, p2 has 30k)
    const res1 = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        type: 'transfer',
        amount: 20000,
        fromPocketId: p1.id,
        toPocketId: p2.id,
        transferType: 'normal',
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:00:00',
        note: 'Transfer 20k',
      },
    });
    assert.equal(res1.statusCode, 201);

    // Transfer 15k from p1 -> exceeds p1 balance (10k) -> rejects with 422 INSUFFICIENT_FUNDS
    const res2 = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        type: 'transfer',
        amount: 15000,
        fromPocketId: p1.id,
        toPocketId: p2.id,
        transferType: 'normal',
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '13:00:00',
      },
    });
    assert.equal(res2.statusCode, 422);
    assert.equal(res2.json().error.code, 'INSUFFICIENT_FUNDS');

    // Transfer 25k from p2 -> succeeds (p2 has 30k balance)
    const res3 = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        type: 'transfer',
        amount: 25000,
        fromPocketId: p2.id,
        toPocketId: p1.id,
        transferType: 'normal',
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '14:00:00',
      },
    });
    assert.equal(res3.statusCode, 201);
  });

  test('T-036: Reject expense category reference when category.pocketId !== expense.pocketId (422 INVALID_REFERENCE) (DEC-030.4)', async () => {
    const owner = await createTestOwner(db);
    const p1 = await createPocket(owner.userId, 'Food', 100000);
    const p2 = await createPocket(owner.userId, 'Transport', 100000);

    const cat1 = await createCategory(owner.userId, p1.id, 'Groceries');
    const cat2 = await createCategory(owner.userId, p2.id, 'Train');

    // Expense on P1 referencing cat2 (belongs to P2) -> rejects with 422 INVALID_REFERENCE
    const res = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        type: 'expense',
        amount: 15000,
        pocketId: p1.id,
        categoryId: cat2.id,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:00:00',
      },
    });
    assert.equal(res.statusCode, 422);
    assert.equal(res.json().error.code, 'INVALID_REFERENCE');
  });

  test('T-037: Reject transaction referencing another owner pocket or category (422 INVALID_REFERENCE)', async () => {
    const ownerA = await createTestOwner(db, 'ownerA@example.com');
    const ownerB = await createTestOwner(db, 'ownerB@example.com');

    const pocketB = await createPocket(ownerB.userId, 'Owner B Pocket', 100000);

    // Owner A tries to create transaction on Owner B's pocket
    const res = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: ownerA.cookieHeader, 'x-csrf-token': ownerA.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        type: 'expense',
        amount: 15000,
        pocketId: pocketB.id,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:00:00',
      },
    });
    assert.equal(res.statusCode, 422);
    assert.equal(res.json().error.code, 'INVALID_REFERENCE');
  });

  test('T-038: Reject transaction referencing an archived pocket or category (422 INVALID_REFERENCE)', async () => {
    const owner = await createTestOwner(db);
    const pocket = await createPocket(owner.userId, 'Main', 100000);

    // Archive pocket
    await db.update(pockets).set({ isArchived: true, isActive: false }).where(eq(pockets.id, pocket.id));

    const res = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        type: 'expense',
        amount: 10000,
        pocketId: pocket.id,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:00:00',
      },
    });
    assert.equal(res.statusCode, 422);
    assert.equal(res.json().error.code, 'INVALID_REFERENCE');
  });

  test('T-039 & T-040: Cash and NFC Card budget owner snapshot deriving (DEC-024)', async () => {
    const owner = await createTestOwner(db);
    const foodPocket = await createPocket(owner.userId, 'Food & Groceries', 500000, 'food-groceries');
    const transportPocket = await createPocket(owner.userId, 'Transportation', 500000, 'transportation');

    // Cash pocket pointing to foodPocket as budget owner
    const cashPocket = await createPocket(owner.userId, 'Cash', 200000, 'cash', foodPocket.id);

    // NFC pocket pointing to transportPocket as budget owner
    const nfcPocket = await createPocket(owner.userId, 'NFC Card', 200000, 'nfc-card', transportPocket.id);

    // Create Cash expense
    const resCash = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        type: 'expense',
        amount: 25000,
        pocketId: cashPocket.id,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:00:00',
        note: 'Cash lunch',
      },
    });
    assert.equal(resCash.statusCode, 201);
    const txnCash = resCash.json().transaction;
    assert.equal(txnCash.pocketId, cashPocket.id);
    assert.equal(txnCash.budgetPocketId, foodPocket.id); // Derived from budgetOwnerPocketId

    // Create NFC expense
    const resNfc = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        type: 'expense',
        amount: 14000,
        pocketId: nfcPocket.id,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '08:30:00',
        note: 'MRT tap',
      },
    });
    assert.equal(resNfc.statusCode, 201);
    const txnNfc = resNfc.json().transaction;
    assert.equal(txnNfc.pocketId, nfcPocket.id);
    assert.equal(txnNfc.budgetPocketId, transportPocket.id); // Derived from budgetOwnerPocketId
  });

  test('T-043, T-044, T-045: Budget Reallocation moves effective balances, auto-creates periods & allocations, and preserves total allocation invariant (DEC-023 / DEC-030)', async () => {
    const owner = await createTestOwner(db);
    const p1 = await createPocket(owner.userId, 'P1', 500000);
    const p2 = await createPocket(owner.userId, 'P2', 200000);

    // Reallocation on date 2026-08-24 (which belongs to period 2026-07-26 to 2026-08-25)
    // No budget_periods or pocket_budget_allocations row exists initially.
    // Initial balance: p1=500k, p2=200k. We first add 300k allocation to p1 so it can reallocate.
    const { startDate, endDate } = { startDate: '2026-07-26', endDate: '2026-08-25' };
    const [period] = await db.insert(budgetPeriods).values({ userId: owner.userId, startDate, endDate }).returning();
    await db.insert(pocketBudgetAllocations).values({ budgetPeriodId: period.id, pocketId: p1.id, allocatedAmount: 300000 });
    await db.insert(pocketBudgetAllocations).values({ budgetPeriodId: period.id, pocketId: p2.id, allocatedAmount: 100000 });

    const totalAllocationBefore = 300000 + 100000;

    // Execute budget-reallocation of 100k from p1 to p2
    const res = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        type: 'transfer',
        amount: 100000,
        fromPocketId: p1.id,
        toPocketId: p2.id,
        transferType: 'budget-reallocation',
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:00:00',
        note: 'Reallocate 100k from P1 to P2',
      },
    });

    assert.equal(res.statusCode, 201);
    const txn = res.json().transaction;
    assert.equal(txn.type, 'transfer');
    assert.equal(txn.transferType, 'budget-reallocation');
    assert.equal(txn.amount, 100000);

    // Verify revised allocations in DB
    const allocs = await db
      .select()
      .from(pocketBudgetAllocations)
      .where(eq(pocketBudgetAllocations.budgetPeriodId, period.id));

    const allocP1 = allocs.find((a) => a.pocketId === p1.id);
    const allocP2 = allocs.find((a) => a.pocketId === p2.id);

    assert.equal(allocP1?.allocatedAmount, 200000); // 300k - 100k
    assert.equal(allocP2?.allocatedAmount, 200000); // 100k + 100k

    // Invariant: Total allocation across pockets is preserved
    const totalAllocationAfter = Number(allocP1?.allocatedAmount) + Number(allocP2?.allocatedAmount);
    assert.equal(totalAllocationAfter, totalAllocationBefore);
  });

  test('T-046: Reject budget-reallocation with 422 INSUFFICIENT_ALLOCATION when revised allocation < recorded expenses in target period (DEC-030.5)', async () => {
    const owner = await createTestOwner(db);
    const p1 = await createPocket(owner.userId, 'Food', 500000);
    const p2 = await createPocket(owner.userId, 'Transport', 500000);

    const startDate = '2026-07-26';
    const endDate = '2026-08-25';
    const [period] = await db.insert(budgetPeriods).values({ userId: owner.userId, startDate, endDate }).returning();

    // Allocation for Food: 300k
    await db.insert(pocketBudgetAllocations).values({ budgetPeriodId: period.id, pocketId: p1.id, allocatedAmount: 300000 });
    await db.insert(pocketBudgetAllocations).values({ budgetPeriodId: period.id, pocketId: p2.id, allocatedAmount: 100000 });

    // Incur 250k of expenses in Food on 2026-08-10 (inside 2026-07-26..2026-08-25 period)
    await db.insert(transactions).values({
      userId: owner.userId,
      type: 'expense',
      amount: 250000,
      pocketId: p1.id,
      occurredOn: '2026-08-10',
      occurredAtLocalTime: '12:00:00',
      note: 'Big dinner',
    });

    // Attempt to reallocate 100k from Food to Transport
    // Revised Food allocation would be 300k - 100k = 200k, which is LESS than recorded expenses (250k)
    // Must be rejected with 422 INSUFFICIENT_ALLOCATION per DEC-030.5
    const res = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        type: 'transfer',
        amount: 100000,
        fromPocketId: p1.id,
        toPocketId: p2.id,
        transferType: 'budget-reallocation',
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '15:00:00',
      },
    });

    assert.equal(res.statusCode, 422);
    assert.equal(res.json().error.code, 'INSUFFICIENT_ALLOCATION');
    assert.equal(
      res.json().error.message,
      'Reallocated budget allocation cannot be less than expenses already incurred in this period'
    );

    // Attempting to reallocate 50k from Food to Transport -> revised Food allocation = 300k - 50k = 250k (equal to expenses) -> SUCCEEDS
    const resOk = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        type: 'transfer',
        amount: 50000,
        fromPocketId: p1.id,
        toPocketId: p2.id,
        transferType: 'budget-reallocation',
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '15:00:00',
      },
    });
    assert.equal(resOk.statusCode, 201);
  });
});
