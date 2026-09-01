import { test, before, beforeEach, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { createTestApp } from '../helpers/testApp.js';
import { getTestDb, resetTestDatabase, createTestOwner, closeTestDb, TestDatabase } from '../helpers/testDb.js';
import { pockets, categories, budgetPeriods, pocketBudgetAllocations, transactions } from '../../src/db/schema.js';

describe('PATCH /v1/transactions/:id Integration Tests', () => {
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

  test('T-004: Reject PATCH /v1/transactions/:id without session cookie (401 UNAUTHENTICATED)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/transactions/${crypto.randomUUID()}`,
      headers: { 'x-csrf-token': 'any-token' },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
        amount: 20000,
      },
    });

    assert.equal(res.statusCode, 401);
    assert.equal(res.json().error.code, 'UNAUTHENTICATED');
  });

  test('T-010: Reject PATCH /v1/transactions/:id with missing or invalid CSRF token (403 INVALID_CSRF_TOKEN)', async () => {
    const owner = await createTestOwner(db);

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/transactions/${crypto.randomUUID()}`,
      headers: { cookie: owner.cookieHeader },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
        amount: 20000,
      },
    });

    assert.equal(res.statusCode, 403);
    assert.equal(res.json().error.code, 'INVALID_CSRF_TOKEN');
  });

  test('T-025: Replay stored 200 OK response for retried PATCH request with identical clientMutationId', async () => {
    const owner = await createTestOwner(db);
    const p1 = await createPocket(owner.userId, 'Main', 100000);

    const [txn] = await db
      .insert(transactions)
      .values({
        userId: owner.userId,
        type: 'expense',
        amount: 20000,
        pocketId: p1.id,
        budgetPocketId: p1.id,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:00:00',
        note: 'Original note',
      })
      .returning();

    const patchMutationId = crypto.randomUUID();
    const payload = {
      clientMutationId: patchMutationId,
      expectedRevision: 1,
      note: 'Updated note',
    };

    const res1 = await app.inject({
      method: 'PATCH',
      url: `/v1/transactions/${txn.id}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload,
    });
    assert.equal(res1.statusCode, 200);
    const updated1 = res1.json().transaction;
    assert.equal(updated1.note, 'Updated note');
    assert.equal(updated1.revision, 2);

    // Retrying with same clientMutationId should return identical replay
    const res2 = await app.inject({
      method: 'PATCH',
      url: `/v1/transactions/${txn.id}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload,
    });
    assert.equal(res2.statusCode, 200);
    const updated2 = res2.json().transaction;
    assert.deepEqual(updated1, updated2);
  });

  test('T-027: Rejection with 409 REVISION_CONFLICT when expectedRevision is stale', async () => {
    const owner = await createTestOwner(db);
    const p1 = await createPocket(owner.userId, 'Main', 100000);

    const [txn] = await db
      .insert(transactions)
      .values({
        userId: owner.userId,
        type: 'expense',
        amount: 20000,
        pocketId: p1.id,
        budgetPocketId: p1.id,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:00:00',
        revision: 2, // current revision is 2
      })
      .returning();

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/transactions/${txn.id}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1, // stale revision!
        amount: 25000,
      },
    });

    assert.equal(res.statusCode, 409);
    assert.equal(res.json().error.code, 'REVISION_CONFLICT');
  });

  test('T-028 & T-029 (DEC-030.10): Increment revision by 1 on field update, and preserve revision on No-Op PATCH', async () => {
    const owner = await createTestOwner(db);
    const p1 = await createPocket(owner.userId, 'Main', 100000);

    const [txn] = await db
      .insert(transactions)
      .values({
        userId: owner.userId,
        type: 'expense',
        amount: 20000,
        pocketId: p1.id,
        budgetPocketId: p1.id,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:00:00',
        note: 'Same Note',
      })
      .returning();

    // 1. Successful update -> increments revision to 2
    const resUpdate = await app.inject({
      method: 'PATCH',
      url: `/v1/transactions/${txn.id}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
        amount: 25000,
      },
    });
    assert.equal(resUpdate.statusCode, 200);
    assert.equal(resUpdate.json().transaction.revision, 2);
    assert.equal(resUpdate.json().transaction.amount, 25000);

    // 2. No-Op update -> returns 200 OK with revision UNCHANGED (remains 2)
    const resNoOp = await app.inject({
      method: 'PATCH',
      url: `/v1/transactions/${txn.id}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 2,
        amount: 25000, // same amount
      },
    });
    assert.equal(resNoOp.statusCode, 200);
    assert.equal(resNoOp.json().transaction.revision, 2);

    const [dbRow] = await db.select().from(transactions).where(eq(transactions.id, txn.id));
    assert.equal(dbRow.revision, 2);
  });

  test('T-042 (DEC-024): Preserving stored budgetPocketId snapshot unless payment pocket changes', async () => {
    const owner = await createTestOwner(db);
    const foodPocket = await createPocket(owner.userId, 'Food', 500000, 'food-groceries');
    const cashPocket = await createPocket(owner.userId, 'Cash', 200000, 'cash', foodPocket.id);
    const otherPocket = await createPocket(owner.userId, 'Other Bank', 500000);

    const [txn] = await db
      .insert(transactions)
      .values({
        userId: owner.userId,
        type: 'expense',
        amount: 20000,
        pocketId: cashPocket.id,
        budgetPocketId: foodPocket.id,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:00:00',
        note: 'Cash lunch',
      })
      .returning();

    // 1. Update note only -> budgetPocketId remains foodPocket.id
    const res1 = await app.inject({
      method: 'PATCH',
      url: `/v1/transactions/${txn.id}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
        note: 'Updated cash note',
      },
    });
    assert.equal(res1.statusCode, 200);
    assert.equal(res1.json().transaction.budgetPocketId, foodPocket.id);

    // 2. Update payment pocket to otherPocket -> budgetPocketId updates to otherPocket.id
    const res2 = await app.inject({
      method: 'PATCH',
      url: `/v1/transactions/${txn.id}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 2,
        pocketId: otherPocket.id,
      },
    });
    assert.equal(res2.statusCode, 200);
    assert.equal(res2.json().transaction.pocketId, otherPocket.id);
    assert.equal(res2.json().transaction.budgetPocketId, otherPocket.id);
  });

  test('T-054 & Isolation: Reject PATCH on soft-deleted transaction or another owner transaction (404 NOT_FOUND)', async () => {
    const ownerA = await createTestOwner(db, 'userA@example.com');
    const ownerB = await createTestOwner(db, 'userB@example.com');
    const pA = await createPocket(ownerA.userId, 'Pocket A', 100000);

    // Soft-deleted transaction for ownerA
    const [deletedTxn] = await db
      .insert(transactions)
      .values({
        userId: ownerA.userId,
        type: 'expense',
        amount: 20000,
        pocketId: pA.id,
        budgetPocketId: pA.id,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:00:00',
        deletedAt: new Date(),
      })
      .returning();

    // Active transaction for ownerA
    const [activeTxn] = await db
      .insert(transactions)
      .values({
        userId: ownerA.userId,
        type: 'expense',
        amount: 20000,
        pocketId: pA.id,
        budgetPocketId: pA.id,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:00:00',
      })
      .returning();

    // Owner A attempts to patch soft-deleted -> 404
    const resDeleted = await app.inject({
      method: 'PATCH',
      url: `/v1/transactions/${deletedTxn.id}`,
      headers: { cookie: ownerA.cookieHeader, 'x-csrf-token': ownerA.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
        amount: 15000,
      },
    });
    assert.equal(resDeleted.statusCode, 404);
    assert.equal(resDeleted.json().error.code, 'NOT_FOUND');

    // Owner B attempts to patch owner A's transaction -> 404
    const resCross = await app.inject({
      method: 'PATCH',
      url: `/v1/transactions/${activeTxn.id}`,
      headers: { cookie: ownerB.cookieHeader, 'x-csrf-token': ownerB.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
        amount: 15000,
      },
    });
    assert.equal(resCross.statusCode, 404);
    assert.equal(resCross.json().error.code, 'NOT_FOUND');
  });

  test('Required Test Addition (1): Rejected overdraft and allocation-floor updates roll back atomically (persisted transaction, balances, allocations unchanged)', async () => {
    const owner = await createTestOwner(db);
    const p1 = await createPocket(owner.userId, 'Food', 100000); // 100k opening balance
    const p2 = await createPocket(owner.userId, 'Transport', 100000);

    const startDate = '2026-07-26';
    const endDate = '2026-08-25';
    const [period] = await db.insert(budgetPeriods).values({ userId: owner.userId, startDate, endDate }).returning();

    // Initial allocations: Food=1M, Transport=100k
    const [allocP1] = await db
      .insert(pocketBudgetAllocations)
      .values({ budgetPeriodId: period.id, pocketId: p1.id, allocatedAmount: 1000000 })
      .returning();
    const [allocP2] = await db
      .insert(pocketBudgetAllocations)
      .values({ budgetPeriodId: period.id, pocketId: p2.id, allocatedAmount: 100000 })
      .returning();

    // Existing budget-reallocation of 50k from Food to Transport
    const [reallocTxn] = await db
      .insert(transactions)
      .values({
        userId: owner.userId,
        type: 'transfer',
        amount: 50000,
        fromPocketId: p1.id,
        toPocketId: p2.id,
        transferType: 'budget-reallocation',
        occurredOn: '2026-08-15',
        occurredAtLocalTime: '12:00:00',
        revision: 1,
      })
      .returning();

    // Reallocation had adjusted Food allocation: 1M - 50k = 950k; Transport: 100k + 50k = 150k
    await db
      .update(pocketBudgetAllocations)
      .set({ allocatedAmount: 950000 })
      .where(eq(pocketBudgetAllocations.id, allocP1.id));
    await db
      .update(pocketBudgetAllocations)
      .set({ allocatedAmount: 150000 })
      .where(eq(pocketBudgetAllocations.id, allocP2.id));

    // Case A: Overdraft rejection (e.g. increase realloc amount to 500k: 500k <= 1M allocation, but exceeds p1 balance 100k)
    const resOverdraft = await app.inject({
      method: 'PATCH',
      url: `/v1/transactions/${reallocTxn.id}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
        amount: 500000,
      },
    });
    assert.equal(resOverdraft.statusCode, 422);
    assert.equal(resOverdraft.json().error.code, 'INSUFFICIENT_FUNDS');

    // Assert Case A rollback: transaction unchanged, allocations unchanged
    const [persistedA] = await db.select().from(transactions).where(eq(transactions.id, reallocTxn.id));
    assert.equal(Number(persistedA.amount), 50000);
    assert.equal(persistedA.revision, 1);

    const [allocP1AfterA] = await db.select().from(pocketBudgetAllocations).where(eq(pocketBudgetAllocations.id, allocP1.id));
    assert.equal(Number(allocP1AfterA.allocatedAmount), 950000);

    // Case B: Allocation floor rejection
    // Incur 800k expense on Food in target period
    await db.insert(transactions).values({
      userId: owner.userId,
      type: 'expense',
      amount: 800000,
      pocketId: p1.id,
      occurredOn: '2026-08-10',
      occurredAtLocalTime: '12:00:00',
    });

    // If reallocated amount is updated to 300k: original 50k reversed -> Food alloc=1M; new 300k deducted -> Food alloc=700k, which is < recorded expenses 800k
    const resFloor = await app.inject({
      method: 'PATCH',
      url: `/v1/transactions/${reallocTxn.id}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
        amount: 300000,
      },
    });
    assert.equal(resFloor.statusCode, 422);
    assert.equal(resFloor.json().error.code, 'INSUFFICIENT_ALLOCATION');

    // Assert Case B rollback: transaction unchanged, allocations unchanged
    const [persistedB] = await db.select().from(transactions).where(eq(transactions.id, reallocTxn.id));
    assert.equal(Number(persistedB.amount), 50000);
    assert.equal(persistedB.revision, 1);

    const [allocP1AfterB] = await db.select().from(pocketBudgetAllocations).where(eq(pocketBudgetAllocations.id, allocP1.id));
    const [allocP2AfterB] = await db.select().from(pocketBudgetAllocations).where(eq(pocketBudgetAllocations.id, allocP2.id));
    assert.equal(Number(allocP1AfterB.allocatedAmount), 950000);
    assert.equal(Number(allocP2AfterB.allocatedAmount), 150000);
  });

  test('Required Test Addition (2): Successful material update reverses prior financial/allocation effect and applies replacement effect', async () => {
    const owner = await createTestOwner(db);
    const p1 = await createPocket(owner.userId, 'Food', 500000);
    const p2 = await createPocket(owner.userId, 'Transport', 500000);

    const startDate = '2026-07-26';
    const endDate = '2026-08-25';
    const [period] = await db.insert(budgetPeriods).values({ userId: owner.userId, startDate, endDate }).returning();

    // Initial allocations: Food=300k, Transport=100k
    const [allocP1] = await db
      .insert(pocketBudgetAllocations)
      .values({ budgetPeriodId: period.id, pocketId: p1.id, allocatedAmount: 250000 }) // after initial 50k transfer
      .returning();
    const [allocP2] = await db
      .insert(pocketBudgetAllocations)
      .values({ budgetPeriodId: period.id, pocketId: p2.id, allocatedAmount: 150000 })
      .returning();

    // Existing budget-reallocation of 50k from Food to Transport
    const [reallocTxn] = await db
      .insert(transactions)
      .values({
        userId: owner.userId,
        type: 'transfer',
        amount: 50000,
        fromPocketId: p1.id,
        toPocketId: p2.id,
        transferType: 'budget-reallocation',
        occurredOn: '2026-08-15',
        occurredAtLocalTime: '12:00:00',
        revision: 1,
      })
      .returning();

    // Material update: Change reallocation amount from 50k to 80k
    // Prior effect (+50k reversal on Food, -50k reversal on Transport -> 300k, 100k)
    // New effect (-80k on Food, +80k on Transport -> 220k, 180k)
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/transactions/${reallocTxn.id}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
        amount: 80000,
      },
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.json().transaction.amount, 80000);
    assert.equal(res.json().transaction.revision, 2);

    // Explicitly verify database state for financial & allocation effects
    const [updatedRow] = await db.select().from(transactions).where(eq(transactions.id, reallocTxn.id));
    assert.equal(Number(updatedRow.amount), 80000);
    assert.equal(updatedRow.revision, 2);

    const [allocP1Final] = await db.select().from(pocketBudgetAllocations).where(eq(pocketBudgetAllocations.id, allocP1.id));
    const [allocP2Final] = await db.select().from(pocketBudgetAllocations).where(eq(pocketBudgetAllocations.id, allocP2.id));

    assert.equal(Number(allocP1Final.allocatedAmount), 220000); // 250k + 50k (reverse) - 80k (apply) = 220k
    assert.equal(Number(allocP2Final.allocatedAmount), 180000); // 150k - 50k (reverse) + 80k (apply) = 180k

    // Total budget allocation invariant preserved: 220k + 180k = 400k
    assert.equal(Number(allocP1Final.allocatedAmount) + Number(allocP2Final.allocatedAmount), 400000);
  });
});
