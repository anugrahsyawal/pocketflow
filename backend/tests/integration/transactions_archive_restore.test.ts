import { test, before, beforeEach, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { createTestApp } from '../helpers/testApp.js';
import { getTestDb, resetTestDatabase, createTestOwner, closeTestDb, TestDatabase } from '../helpers/testDb.js';
import { pockets, categories, budgetPeriods, pocketBudgetAllocations, transactions } from '../../src/db/schema.js';

describe('POST /v1/transactions/:id/archive & restore Integration Tests', () => {
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

  test('T-005 & T-006: Reject archive and restore without session cookie (401 UNAUTHENTICATED)', async () => {
    const resArchive = await app.inject({
      method: 'POST',
      url: `/v1/transactions/${crypto.randomUUID()}/archive`,
      headers: { 'x-csrf-token': 'any-token' },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
      },
    });
    assert.equal(resArchive.statusCode, 401);
    assert.equal(resArchive.json().error.code, 'UNAUTHENTICATED');

    const resRestore = await app.inject({
      method: 'POST',
      url: `/v1/transactions/${crypto.randomUUID()}/restore`,
      headers: { 'x-csrf-token': 'any-token' },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
      },
    });
    assert.equal(resRestore.statusCode, 401);
    assert.equal(resRestore.json().error.code, 'UNAUTHENTICATED');
  });

  test('Reject archive and restore with missing or invalid CSRF token (403 INVALID_CSRF_TOKEN)', async () => {
    const owner = await createTestOwner(db);

    const resArchive = await app.inject({
      method: 'POST',
      url: `/v1/transactions/${crypto.randomUUID()}/archive`,
      headers: { cookie: owner.cookieHeader },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
      },
    });
    assert.equal(resArchive.statusCode, 403);
    assert.equal(resArchive.json().error.code, 'INVALID_CSRF_TOKEN');

    const resRestore = await app.inject({
      method: 'POST',
      url: `/v1/transactions/${crypto.randomUUID()}/restore`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': 'invalid-csrf-token' },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
      },
    });
    assert.equal(resRestore.statusCode, 403);
    assert.equal(resRestore.json().error.code, 'INVALID_CSRF_TOKEN');
  });

  test('Replay stored 200 OK on retrying archive and restore with matching clientMutationId, and reject 409 IDEMPOTENCY_CONFLICT on payload collision', async () => {
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

    const archiveMutationId = crypto.randomUUID();
    const payload = {
      clientMutationId: archiveMutationId,
      expectedRevision: 1,
    };

    // 1. Archive request
    const res1 = await app.inject({
      method: 'POST',
      url: `/v1/transactions/${txn.id}/archive`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload,
    });
    assert.equal(res1.statusCode, 200);
    const body1 = res1.json().transaction;
    assert.equal(body1.isArchived, true);
    assert.equal(body1.revision, 2);

    // 2. Exact retry of archive -> replays 200 OK
    const res2 = await app.inject({
      method: 'POST',
      url: `/v1/transactions/${txn.id}/archive`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload,
    });
    assert.equal(res2.statusCode, 200);
    assert.deepEqual(res1.json(), res2.json());

    // 3. Collision: Reuse mutation ID with different expectedRevision -> 409 IDEMPOTENCY_CONFLICT
    const resCollision = await app.inject({
      method: 'POST',
      url: `/v1/transactions/${txn.id}/archive`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: archiveMutationId,
        expectedRevision: 2,
      },
    });
    assert.equal(resCollision.statusCode, 409);
    assert.equal(resCollision.json().error.code, 'IDEMPOTENCY_CONFLICT');
  });

  test('T-030: Reject archive and restore on stale expectedRevision (409 REVISION_CONFLICT)', async () => {
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

    // Archive with stale expectedRevision 1
    const resArchive = await app.inject({
      method: 'POST',
      url: `/v1/transactions/${txn.id}/archive`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
      },
    });
    assert.equal(resArchive.statusCode, 409);
    assert.equal(resArchive.json().error.code, 'REVISION_CONFLICT');

    // Archive with correct revision 2 -> succeeds
    const resArchiveOk = await app.inject({
      method: 'POST',
      url: `/v1/transactions/${txn.id}/archive`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 2,
      },
    });
    assert.equal(resArchiveOk.statusCode, 200);
    assert.equal(resArchiveOk.json().transaction.revision, 3);

    // Restore with stale expectedRevision 2
    const resRestore = await app.inject({
      method: 'POST',
      url: `/v1/transactions/${txn.id}/restore`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 2,
      },
    });
    assert.equal(resRestore.statusCode, 409);
    assert.equal(resRestore.json().error.code, 'REVISION_CONFLICT');
  });

  test('No-Op semantics: Calling archive on already-archived txn or restore on already-active txn returns 200 OK with revision UNCHANGED', async () => {
    const owner = await createTestOwner(db);
    const p1 = await createPocket(owner.userId, 'Main', 100000);

    const [activeTxn] = await db
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

    // Calling restore on active txn (archivedAt == null) -> No-Op, returns 200 OK, revision remains 1
    const resRestoreNoOp = await app.inject({
      method: 'POST',
      url: `/v1/transactions/${activeTxn.id}/restore`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
      },
    });
    assert.equal(resRestoreNoOp.statusCode, 200);
    assert.equal(resRestoreNoOp.json().transaction.revision, 1);
    assert.equal(resRestoreNoOp.json().transaction.isArchived, false);

    // Archive active txn -> transitions to archived, revision becomes 2
    const resArchive = await app.inject({
      method: 'POST',
      url: `/v1/transactions/${activeTxn.id}/archive`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
      },
    });
    assert.equal(resArchive.statusCode, 200);
    assert.equal(resArchive.json().transaction.revision, 2);
    assert.equal(resArchive.json().transaction.isArchived, true);

    // Calling archive again on archived txn -> No-Op, returns 200 OK, revision remains 2
    const resArchiveNoOp = await app.inject({
      method: 'POST',
      url: `/v1/transactions/${activeTxn.id}/archive`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 2,
      },
    });
    assert.equal(resArchiveNoOp.statusCode, 200);
    assert.equal(resArchiveNoOp.json().transaction.revision, 2);
    assert.equal(resArchiveNoOp.json().transaction.isArchived, true);
  });

  test('T-054 & Isolation: Reject archive and restore on soft-deleted or cross-owner transaction (404 NOT_FOUND)', async () => {
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
      })
      .returning();

    // Owner A attempts to archive soft-deleted -> 404
    const resDeleted = await app.inject({
      method: 'POST',
      url: `/v1/transactions/${deletedTxn.id}/archive`,
      headers: { cookie: ownerA.cookieHeader, 'x-csrf-token': ownerA.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
      },
    });
    assert.equal(resDeleted.statusCode, 404);
    assert.equal(resDeleted.json().error.code, 'NOT_FOUND');

    // Owner B attempts to archive owner A's transaction -> 404
    const resCrossArchive = await app.inject({
      method: 'POST',
      url: `/v1/transactions/${activeTxnA.id}/archive`,
      headers: { cookie: ownerB.cookieHeader, 'x-csrf-token': ownerB.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
      },
    });
    assert.equal(resCrossArchive.statusCode, 404);
    assert.equal(resCrossArchive.json().error.code, 'NOT_FOUND');

    // Owner B attempts to restore owner A's transaction -> 404
    const resCrossRestore = await app.inject({
      method: 'POST',
      url: `/v1/transactions/${activeTxnA.id}/restore`,
      headers: { cookie: ownerB.cookieHeader, 'x-csrf-token': ownerB.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
      },
    });
    assert.equal(resCrossRestore.statusCode, 404);
    assert.equal(resCrossRestore.json().error.code, 'NOT_FOUND');
  });

  test('T-047 & T-050: Archive removes financial effect from derived balances, and restore reapplies financial effect (with overdraft rejection)', async () => {
    const owner = await createTestOwner(db);
    const p1 = await createPocket(owner.userId, 'Main', 50000); // 50k opening balance

    // 1. Create expense of 40k -> remaining balance is 10k
    const [txn] = await db
      .insert(transactions)
      .values({
        userId: owner.userId,
        type: 'expense',
        amount: 40000,
        pocketId: p1.id,
        budgetPocketId: p1.id,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:00:00',
        revision: 1,
      })
      .returning();

    // Another 20k expense would fail while active (10k < 20k)
    const resExpFail = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        type: 'expense',
        amount: 20000,
        pocketId: p1.id,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:05:00',
      },
    });
    assert.equal(resExpFail.statusCode, 422);

    // 2. Archive 40k transaction -> balance restored to 50k
    const resArchive = await app.inject({
      method: 'POST',
      url: `/v1/transactions/${txn.id}/archive`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
      },
    });
    assert.equal(resArchive.statusCode, 200);
    assert.equal(resArchive.json().transaction.isArchived, true);
    assert.ok(resArchive.json().transaction.archivedAt !== null);

    // Now a 35k expense succeeds because the 40k is archived (50k - 35k = 15k left)
    const resExpOk = await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        type: 'expense',
        amount: 35000,
        pocketId: p1.id,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:10:00',
      },
    });
    assert.equal(resExpOk.statusCode, 201);

    // 3. Attempt to restore the 40k transaction -> remaining balance is only 15k -> rejects with 422 INSUFFICIENT_FUNDS
    const resRestoreOverdraft = await app.inject({
      method: 'POST',
      url: `/v1/transactions/${txn.id}/restore`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 2,
      },
    });
    assert.equal(resRestoreOverdraft.statusCode, 422);
    assert.equal(resRestoreOverdraft.json().error.code, 'INSUFFICIENT_FUNDS');

    // 4. Add income of 50k (balance becomes 15k + 50k = 65k)
    await db.insert(transactions).values({
      userId: owner.userId,
      type: 'income',
      amount: 50000,
      pocketId: p1.id,
      occurredOn: '2026-08-24',
      occurredAtLocalTime: '12:15:00',
    });

    // 5. Restore 40k transaction -> now succeeds (65k >= 40k, leaves 25k)
    const resRestoreOk = await app.inject({
      method: 'POST',
      url: `/v1/transactions/${txn.id}/restore`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 2,
      },
    });
    assert.equal(resRestoreOk.statusCode, 200);
    assert.equal(resRestoreOk.json().transaction.isArchived, false);
    assert.equal(resRestoreOk.json().transaction.archivedAt, null);
    assert.equal(resRestoreOk.json().transaction.revision, 3);
  });

  test('Restore rejects with 422 INVALID_REFERENCE if payment pocket or category was archived', async () => {
    const owner = await createTestOwner(db);
    const p1 = await createPocket(owner.userId, 'Food', 100000);
    const c1 = await createCategory(owner.userId, p1.id, 'Groceries');

    // Create and archive an expense with category c1
    const [txn] = await db
      .insert(transactions)
      .values({
        userId: owner.userId,
        type: 'expense',
        amount: 20000,
        pocketId: p1.id,
        categoryId: c1.id,
        budgetPocketId: p1.id,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '12:00:00',
        archivedAt: new Date(),
        revision: 1,
      })
      .returning();

    // Archive category c1
    await db.update(categories).set({ isArchived: true, isActive: false }).where(eq(categories.id, c1.id));

    // Restore should fail with 422 INVALID_REFERENCE
    const resRestoreCat = await app.inject({
      method: 'POST',
      url: `/v1/transactions/${txn.id}/restore`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
      },
    });
    assert.equal(resRestoreCat.statusCode, 422);
    assert.equal(resRestoreCat.json().error.code, 'INVALID_REFERENCE');

    // Reactivate category c1, but archive pocket p1
    await db.update(categories).set({ isArchived: false, isActive: true }).where(eq(categories.id, c1.id));
    await db.update(pockets).set({ isArchived: true, isActive: false }).where(eq(pockets.id, p1.id));

    // Restore should fail with 422 INVALID_REFERENCE
    const resRestorePocket = await app.inject({
      method: 'POST',
      url: `/v1/transactions/${txn.id}/restore`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
      },
    });
    assert.equal(resRestorePocket.statusCode, 422);
    assert.equal(resRestorePocket.json().error.code, 'INVALID_REFERENCE');
  });

  test('Budget Reallocation: Archive reverses allocation adjustments and Restore reapplies with floor check', async () => {
    const owner = await createTestOwner(db);
    const p1 = await createPocket(owner.userId, 'Food', 500000);
    const p2 = await createPocket(owner.userId, 'Transport', 500000);

    const startDate = '2026-07-26';
    const endDate = '2026-08-25';
    const [period] = await db.insert(budgetPeriods).values({ userId: owner.userId, startDate, endDate }).returning();

    // Initial allocations before realloc: Food=300k, Transport=100k
    // After 50k realloc from Food to Transport: Food=250k, Transport=150k
    const [allocP1] = await db
      .insert(pocketBudgetAllocations)
      .values({ budgetPeriodId: period.id, pocketId: p1.id, allocatedAmount: 250000 })
      .returning();
    const [allocP2] = await db
      .insert(pocketBudgetAllocations)
      .values({ budgetPeriodId: period.id, pocketId: p2.id, allocatedAmount: 150000 })
      .returning();

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

    // 1. Archive the budget-reallocation -> Food gets 50k back (300k), Transport gets 50k deducted (100k)
    const resArchive = await app.inject({
      method: 'POST',
      url: `/v1/transactions/${reallocTxn.id}/archive`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
      },
    });
    assert.equal(resArchive.statusCode, 200);

    const [allocP1AfterArchive] = await db.select().from(pocketBudgetAllocations).where(eq(pocketBudgetAllocations.id, allocP1.id));
    const [allocP2AfterArchive] = await db.select().from(pocketBudgetAllocations).where(eq(pocketBudgetAllocations.id, allocP2.id));
    assert.equal(Number(allocP1AfterArchive.allocatedAmount), 300000);
    assert.equal(Number(allocP2AfterArchive.allocatedAmount), 100000);

    // 2. Now record expenses on Food in that period: 280k
    await db.insert(transactions).values({
      userId: owner.userId,
      type: 'expense',
      amount: 280000,
      pocketId: p1.id,
      occurredOn: '2026-08-10',
      occurredAtLocalTime: '12:00:00',
    });

    // 3. Attempting to restore the 50k budget-reallocation would reduce Food allocation to 300k - 50k = 250k (< recorded expenses 280k)
    // Must be rejected with 422 INSUFFICIENT_ALLOCATION
    const resRestoreFloor = await app.inject({
      method: 'POST',
      url: `/v1/transactions/${reallocTxn.id}/restore`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 2,
      },
    });
    assert.equal(resRestoreFloor.statusCode, 422);
    assert.equal(resRestoreFloor.json().error.code, 'INSUFFICIENT_ALLOCATION');
  });

  test('Required Test: Archive of a budget-reallocation enforces allocation floor on destination pocket (toAlloc - amount < recorded expenses rejects with 422 and preserves state atomically)', async () => {
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
    // If we archive the 80k reallocation, Transport allocation would become 180k - 80k = 100k.
    // But Transport already incurred 150k in expenses in this period!
    // Archiving MUST be rejected with 422 INSUFFICIENT_ALLOCATION.
    await db.insert(transactions).values({
      userId: owner.userId,
      type: 'expense',
      amount: 150000,
      pocketId: p2.id,
      occurredOn: '2026-08-10',
      occurredAtLocalTime: '12:00:00',
    });

    const resArchive = await app.inject({
      method: 'POST',
      url: `/v1/transactions/${reallocTxn.id}/archive`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
      },
    });

    assert.equal(resArchive.statusCode, 422);
    assert.equal(resArchive.json().error.code, 'INSUFFICIENT_ALLOCATION');
    assert.equal(
      resArchive.json().error.message,
      'Reallocated budget allocation cannot be less than expenses already incurred in this period'
    );

    // Verify complete atomic rollback:
    // 1. Transaction remains unarchived with revision 1
    const [persistedTxn] = await db.select().from(transactions).where(eq(transactions.id, reallocTxn.id));
    assert.equal(persistedTxn.archivedAt, null);
    assert.equal(persistedTxn.revision, 1);

    // 2. Both pocket allocations remain untouched
    const [persistedAllocP1] = await db.select().from(pocketBudgetAllocations).where(eq(pocketBudgetAllocations.id, allocP1.id));
    const [persistedAllocP2] = await db.select().from(pocketBudgetAllocations).where(eq(pocketBudgetAllocations.id, allocP2.id));
    assert.equal(Number(persistedAllocP1.allocatedAmount), 200000);
    assert.equal(Number(persistedAllocP2.allocatedAmount), 180000);
  });
});
