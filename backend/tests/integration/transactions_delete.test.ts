import { test, before, beforeEach, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { createTestApp } from '../helpers/testApp.js';
import { getTestDb, resetTestDatabase, createTestOwner, closeTestDb, TestDatabase } from '../helpers/testDb.js';
import { pockets, categories, budgetPeriods, pocketBudgetAllocations, transactions } from '../../src/db/schema.js';

describe('DELETE /v1/transactions/:id Integration Tests', () => {
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

  test('T-007: Reject DELETE /v1/transactions/:id without session cookie (401 UNAUTHENTICATED)', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/v1/transactions/${crypto.randomUUID()}`,
      headers: { 'x-csrf-token': 'any-token' },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
        confirmPermanentDelete: true,
      },
    });
    assert.equal(res.statusCode, 401);
    assert.equal(res.json().error.code, 'UNAUTHENTICATED');
  });

  test('T-011: Reject DELETE /v1/transactions/:id with missing or invalid CSRF token (403 INVALID_CSRF_TOKEN)', async () => {
    const owner = await createTestOwner(db);

    const res1 = await app.inject({
      method: 'DELETE',
      url: `/v1/transactions/${crypto.randomUUID()}`,
      headers: { cookie: owner.cookieHeader },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
        confirmPermanentDelete: true,
      },
    });
    assert.equal(res1.statusCode, 403);
    assert.equal(res1.json().error.code, 'INVALID_CSRF_TOKEN');

    const res2 = await app.inject({
      method: 'DELETE',
      url: `/v1/transactions/${crypto.randomUUID()}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': 'invalid-csrf-token' },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
        confirmPermanentDelete: true,
      },
    });
    assert.equal(res2.statusCode, 403);
    assert.equal(res2.json().error.code, 'INVALID_CSRF_TOKEN');
  });

  test('T-051: Reject DELETE /v1/transactions/:id when confirmPermanentDelete is missing, false, or invalid (400 INVALID_INPUT)', async () => {
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
        revision: 1,
      })
      .returning();

    // 1. Missing confirmPermanentDelete
    const resMissing = await app.inject({
      method: 'DELETE',
      url: `/v1/transactions/${txn.id}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
      },
    });
    assert.equal(resMissing.statusCode, 400);
    assert.equal(resMissing.json().error.code, 'INVALID_INPUT');

    // 2. confirmPermanentDelete is false
    const resFalse = await app.inject({
      method: 'DELETE',
      url: `/v1/transactions/${txn.id}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
        confirmPermanentDelete: false,
      },
    });
    assert.equal(resFalse.statusCode, 400);
    assert.equal(resFalse.json().error.code, 'INVALID_INPUT');

    // 3. Unknown property in payload
    const resUnknown = await app.inject({
      method: 'DELETE',
      url: `/v1/transactions/${txn.id}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
        confirmPermanentDelete: true,
        extraProperty: 'disallowed',
      },
    });
    assert.equal(resUnknown.statusCode, 400);
    assert.equal(resUnknown.json().error.code, 'INVALID_INPUT');
  });

  test('T-026: Replay stored 200 OK response for retried DELETE request with matching clientMutationId, and reject 409 IDEMPOTENCY_CONFLICT on payload collision', async () => {
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
        revision: 1,
      })
      .returning();

    const deleteMutationId = crypto.randomUUID();
    const payload = {
      clientMutationId: deleteMutationId,
      expectedRevision: 1,
      confirmPermanentDelete: true,
    };

    // 1. First DELETE request
    const res1 = await app.inject({
      method: 'DELETE',
      url: `/v1/transactions/${txn.id}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload,
    });
    assert.equal(res1.statusCode, 200);
    const body1 = res1.json();
    assert.equal(body1.success, true);
    assert.equal(body1.deletedTransactionId, txn.id);
    assert.ok(typeof body1.deletedAt === 'string');

    // 2. Exact retry with same clientMutationId -> replays 200 OK
    const res2 = await app.inject({
      method: 'DELETE',
      url: `/v1/transactions/${txn.id}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload,
    });
    assert.equal(res2.statusCode, 200);
    assert.deepEqual(res1.json(), res2.json());

    // 3. Collision: Reuse mutation ID with different expectedRevision -> 409 IDEMPOTENCY_CONFLICT
    const resCollision = await app.inject({
      method: 'DELETE',
      url: `/v1/transactions/${txn.id}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: deleteMutationId,
        expectedRevision: 2,
        confirmPermanentDelete: true,
      },
    });
    assert.equal(resCollision.statusCode, 409);
    assert.equal(resCollision.json().error.code, 'IDEMPOTENCY_CONFLICT');
  });

  test('Reject DELETE on stale expectedRevision (409 REVISION_CONFLICT)', async () => {
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
        revision: 2,
      })
      .returning();

    const res = await app.inject({
      method: 'DELETE',
      url: `/v1/transactions/${txn.id}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1, // stale revision
        confirmPermanentDelete: true,
      },
    });
    assert.equal(res.statusCode, 409);
    assert.equal(res.json().error.code, 'REVISION_CONFLICT');
  });

  test('T-054 & Isolation: Reject DELETE on already soft-deleted or cross-owner transaction (404 NOT_FOUND)', async () => {
    const ownerA = await createTestOwner(db, 'ownerA@example.com');
    const ownerB = await createTestOwner(db, 'ownerB@example.com');
    const pA = await createPocket(ownerA.userId, 'Pocket A', 100000);

    // Soft-deleted transaction
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
        revision: 1,
      })
      .returning();

    // Active transaction for owner A
    const [activeTxnA] = await db
      .insert(transactions)
      .values({
        userId: ownerA.userId,
        type: 'expense',
        amount: 20000,
        pocketId: pA.id,
        budgetPocketId: pA.id,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:00:00',
        revision: 1,
      })
      .returning();

    // Owner A attempts to delete already-deleted -> 404
    const resDeleted = await app.inject({
      method: 'DELETE',
      url: `/v1/transactions/${deletedTxn.id}`,
      headers: { cookie: ownerA.cookieHeader, 'x-csrf-token': ownerA.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
        confirmPermanentDelete: true,
      },
    });
    assert.equal(resDeleted.statusCode, 404);
    assert.equal(resDeleted.json().error.code, 'NOT_FOUND');

    // Owner B attempts to delete owner A's transaction -> 404
    const resCross = await app.inject({
      method: 'DELETE',
      url: `/v1/transactions/${activeTxnA.id}`,
      headers: { cookie: ownerB.cookieHeader, 'x-csrf-token': ownerB.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
        confirmPermanentDelete: true,
      },
    });
    assert.equal(resCross.statusCode, 404);
    assert.equal(resCross.json().error.code, 'NOT_FOUND');
  });

  test('T-052 & T-053: Soft-delete tombstone is retained in DB with deletedAt and immediately excluded from list and derived balance', async () => {
    const owner = await createTestOwner(db);
    const p1 = await createPocket(owner.userId, 'Main', 50000); // 50k opening balance

    // Create 30k expense
    const [txn] = await db
      .insert(transactions)
      .values({
        userId: owner.userId,
        type: 'expense',
        amount: 30000,
        pocketId: p1.id,
        budgetPocketId: p1.id,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:00:00',
        revision: 1,
      })
      .returning();

    // Delete the transaction
    const resDelete = await app.inject({
      method: 'DELETE',
      url: `/v1/transactions/${txn.id}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
        confirmPermanentDelete: true,
      },
    });
    assert.equal(resDelete.statusCode, 200);
    assert.equal(resDelete.json().success, true);
    assert.equal(resDelete.json().deletedTransactionId, txn.id);

    // 1. Tombstone remains in database with deletedAt populated (not physically removed)
    const [tombstoneRow] = await db.select().from(transactions).where(eq(transactions.id, txn.id));
    assert.ok(tombstoneRow);
    assert.ok(tombstoneRow.deletedAt !== null);
    assert.equal(tombstoneRow.revision, 2);

    // 2. Excluded from GET /v1/transactions (even with includeArchived=true)
    const resList = await app.inject({
      method: 'GET',
      url: '/v1/transactions?includeArchived=true',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(resList.statusCode, 200);
    assert.equal(resList.json().transactions.length, 0);

    // 3. Financial effect removed: pocket balance restored to 50k (a 50k expense now succeeds)
    const resExp = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        type: 'expense',
        amount: 50000,
        pocketId: p1.id,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:30:00',
      },
    });
    assert.equal(resExp.statusCode, 201);
  });

  test('Active vs Archived Deletion: Active budget-reallocation reverses allocation; archived budget-reallocation deletes without double reversal', async () => {
    const owner = await createTestOwner(db);
    const p1 = await createPocket(owner.userId, 'Food', 500000);
    const p2 = await createPocket(owner.userId, 'Transport', 500000);

    const startDate = '2026-07-26';
    const endDate = '2026-08-25';
    const [period] = await db.insert(budgetPeriods).values({ userId: owner.userId, startDate, endDate }).returning();

    // Case 1: Active budget reallocation deletion
    const [allocP1] = await db
      .insert(pocketBudgetAllocations)
      .values({ budgetPeriodId: period.id, pocketId: p1.id, allocatedAmount: 250000 }) // after 50k realloc
      .returning();
    const [allocP2] = await db
      .insert(pocketBudgetAllocations)
      .values({ budgetPeriodId: period.id, pocketId: p2.id, allocatedAmount: 150000 })
      .returning();

    const [activeReallocTxn] = await db
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

    const resDeleteActive = await app.inject({
      method: 'DELETE',
      url: `/v1/transactions/${activeReallocTxn.id}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
        confirmPermanentDelete: true,
      },
    });
    assert.equal(resDeleteActive.statusCode, 200);

    // Active delete reversed allocations: Food -> 300k, Transport -> 100k
    const [allocP1AfterActiveDel] = await db.select().from(pocketBudgetAllocations).where(eq(pocketBudgetAllocations.id, allocP1.id));
    const [allocP2AfterActiveDel] = await db.select().from(pocketBudgetAllocations).where(eq(pocketBudgetAllocations.id, allocP2.id));
    assert.equal(Number(allocP1AfterActiveDel.allocatedAmount), 300000);
    assert.equal(Number(allocP2AfterActiveDel.allocatedAmount), 100000);

    // Case 2: Archived budget reallocation deletion
    // Create an already-archived transaction (allocations are already 300k and 100k)
    const [archivedReallocTxn] = await db
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
        archivedAt: new Date(),
        revision: 2,
      })
      .returning();

    const resDeleteArchived = await app.inject({
      method: 'DELETE',
      url: `/v1/transactions/${archivedReallocTxn.id}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 2,
        confirmPermanentDelete: true,
      },
    });
    assert.equal(resDeleteArchived.statusCode, 200);

    // Allocations remain unchanged (no double reversal)
    const [allocP1AfterArchivedDel] = await db.select().from(pocketBudgetAllocations).where(eq(pocketBudgetAllocations.id, allocP1.id));
    const [allocP2AfterArchivedDel] = await db.select().from(pocketBudgetAllocations).where(eq(pocketBudgetAllocations.id, allocP2.id));
    assert.equal(Number(allocP1AfterArchivedDel.allocatedAmount), 300000);
    assert.equal(Number(allocP2AfterArchivedDel.allocatedAmount), 100000);
  });

  test('Allocation Floor Rollback: Deleting active budget-reallocation transfer rejects with 422 INSUFFICIENT_ALLOCATION if destination allocation drops below recorded expenses', async () => {
    const owner = await createTestOwner(db);
    const p1 = await createPocket(owner.userId, 'Food', 500000);
    const p2 = await createPocket(owner.userId, 'Transport', 500000);

    const startDate = '2026-07-26';
    const endDate = '2026-08-25';
    const [period] = await db.insert(budgetPeriods).values({ userId: owner.userId, startDate, endDate }).returning();

    // Initial allocations: Food=200k, Transport=100k + 80k reallocated = 180k
    const [allocP1] = await db
      .insert(pocketBudgetAllocations)
      .values({ budgetPeriodId: period.id, pocketId: p1.id, allocatedAmount: 200000 })
      .returning();
    const [allocP2] = await db
      .insert(pocketBudgetAllocations)
      .values({ budgetPeriodId: period.id, pocketId: p2.id, allocatedAmount: 180000 })
      .returning();

    // Active budget-reallocation of 80k from Food to Transport
    const [reallocTxn] = await db
      .insert(transactions)
      .values({
        userId: owner.userId,
        type: 'transfer',
        amount: 80000,
        fromPocketId: p1.id,
        toPocketId: p2.id,
        transferType: 'budget-reallocation',
        occurredOn: '2026-08-15',
        occurredAtLocalTime: '12:00:00',
        revision: 1,
      })
      .returning();

    // Record 150k expenses on Transport in that period
    // Transport currently has 180k allocated.
    // Deleting the active 80k reallocation would reduce Transport allocation to 180k - 80k = 100k.
    // But Transport has 150k in recorded expenses in this period!
    // DELETE MUST be rejected with 422 INSUFFICIENT_ALLOCATION.
    await db.insert(transactions).values({
      userId: owner.userId,
      type: 'expense',
      amount: 150000,
      pocketId: p2.id,
      occurredOn: '2026-08-10',
      occurredAtLocalTime: '12:00:00',
    });

    const resDelete = await app.inject({
      method: 'DELETE',
      url: `/v1/transactions/${reallocTxn.id}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
        confirmPermanentDelete: true,
      },
    });

    assert.equal(resDelete.statusCode, 422);
    assert.equal(resDelete.json().error.code, 'INSUFFICIENT_ALLOCATION');
    assert.equal(
      resDelete.json().error.message,
      'Reallocated budget allocation cannot be less than expenses already incurred in this period'
    );

    // Verify complete atomic rollback:
    // 1. Transaction remains un-deleted with revision 1
    const [persistedTxn] = await db.select().from(transactions).where(eq(transactions.id, reallocTxn.id));
    assert.equal(persistedTxn.deletedAt, null);
    assert.equal(persistedTxn.revision, 1);

    // 2. Both pocket allocations remain untouched
    const [persistedAllocP1] = await db.select().from(pocketBudgetAllocations).where(eq(pocketBudgetAllocations.id, allocP1.id));
    const [persistedAllocP2] = await db.select().from(pocketBudgetAllocations).where(eq(pocketBudgetAllocations.id, allocP2.id));
    assert.equal(Number(persistedAllocP1.allocatedAmount), 200000);
    assert.equal(Number(persistedAllocP2.allocatedAmount), 180000);
  });
});
