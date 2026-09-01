import { test, before, beforeEach, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { createTestApp } from '../helpers/testApp.js';
import { getTestDb, resetTestDatabase, createTestOwner, closeTestDb, TestDatabase } from '../helpers/testDb.js';
import { pockets, categories, transactions } from '../../src/db/schema.js';

describe('POST /v1/transactions/batch Integration Tests', () => {
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

  test('T-003: Reject POST /v1/transactions/batch without session cookie (401 UNAUTHENTICATED)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/transactions/batch',
      headers: { 'x-csrf-token': 'any-token' },
      payload: {
        clientMutationId: crypto.randomUUID(),
        items: [],
      },
    });

    assert.equal(res.statusCode, 401);
    assert.equal(res.json().error.code, 'UNAUTHENTICATED');
  });

  test('T-009: Reject POST /v1/transactions/batch with missing or invalid CSRF token (403 INVALID_CSRF_TOKEN)', async () => {
    const owner = await createTestOwner(db);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/transactions/batch',
      headers: { cookie: owner.cookieHeader },
      payload: {
        clientMutationId: crypto.randomUUID(),
        items: [],
      },
    });

    assert.equal(res.statusCode, 403);
    assert.equal(res.json().error.code, 'INVALID_CSRF_TOKEN');
  });

  test('T-019: Create multiple valid expense transactions in batch and verify all entries save and return 201 Created', async () => {
    const owner = await createTestOwner(db);
    const p1 = await createPocket(owner.userId, 'Food', 200000);
    const p2 = await createPocket(owner.userId, 'Transport', 100000);
    const c1 = await createCategory(owner.userId, p1.id, 'Groceries');

    const rootMutationId = crypto.randomUUID();
    const item1Id = crypto.randomUUID();
    const item2Id = crypto.randomUUID();

    const res = await app.inject({
      method: 'POST',
      url: '/v1/transactions/batch',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: rootMutationId,
        items: [
          {
            clientMutationId: item1Id,
            type: 'expense',
            amount: 25000,
            pocketId: p1.id,
            categoryId: c1.id,
            occurredOn: '2026-08-24',
            occurredAtLocalTime: '08:15:00',
            note: 'Breakfast',
          },
          {
            clientMutationId: item2Id,
            type: 'expense',
            amount: 15000,
            pocketId: p2.id,
            occurredOn: '2026-08-24',
            occurredAtLocalTime: '08:45:00',
            note: 'Train fare',
          },
        ],
      },
    });

    assert.equal(res.statusCode, 201);
    const body = res.json();
    assert.equal(body.transactions.length, 2);

    assert.equal(body.transactions[0].amount, 25000);
    assert.equal(body.transactions[0].pocketId, p1.id);
    assert.equal(body.transactions[0].categoryId, c1.id);
    assert.equal(body.transactions[0].note, 'Breakfast');

    assert.equal(body.transactions[1].amount, 15000);
    assert.equal(body.transactions[1].pocketId, p2.id);
    assert.equal(body.transactions[1].note, 'Train fare');

    // Verify written to database
    const saved = await db.select().from(transactions).where(eq(transactions.userId, owner.userId));
    assert.equal(saved.length, 2);
  });

  test('T-020: Replay batch response when POST /v1/transactions/batch is retried with identical root clientMutationId', async () => {
    const owner = await createTestOwner(db);
    const p1 = await createPocket(owner.userId, 'Food', 200000);
    const rootMutationId = crypto.randomUUID();

    const payload = {
      clientMutationId: rootMutationId,
      items: [
        {
          clientMutationId: crypto.randomUUID(),
          type: 'expense',
          amount: 25000,
          pocketId: p1.id,
          occurredOn: '2026-08-24',
          occurredAtLocalTime: '08:15:00',
          note: 'Item 1',
        },
        {
          clientMutationId: crypto.randomUUID(),
          type: 'expense',
          amount: 35000,
          pocketId: p1.id,
          occurredOn: '2026-08-24',
          occurredAtLocalTime: '12:15:00',
          note: 'Item 2',
        },
      ],
    };

    const res1 = await app.inject({
      method: 'POST',
      url: '/v1/transactions/batch',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload,
    });
    assert.equal(res1.statusCode, 201);
    const txns1 = res1.json().transactions;

    // Retry identical batch
    const res2 = await app.inject({
      method: 'POST',
      url: '/v1/transactions/batch',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload,
    });
    assert.equal(res2.statusCode, 201);
    const txns2 = res2.json().transactions;

    assert.deepEqual(txns1, txns2);

    // Verify only 2 transactions exist in DB (no duplicates created)
    const saved = await db.select().from(transactions).where(eq(transactions.userId, owner.userId));
    assert.equal(saved.length, 2);
  });

  test('T-021: Reject entire batch and verify complete SQL rollback (0 items saved) if a single item fails validation', async () => {
    const owner = await createTestOwner(db);
    const p1 = await createPocket(owner.userId, 'Food', 50000); // 50k balance

    // Item 1 is valid (20k), but Item 2 exceeds remaining funds (40k, total 60k > 50k)
    const res = await app.inject({
      method: 'POST',
      url: '/v1/transactions/batch',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        items: [
          {
            clientMutationId: crypto.randomUUID(),
            type: 'expense',
            amount: 20000,
            pocketId: p1.id,
            occurredOn: '2026-08-24',
            occurredAtLocalTime: '08:15:00',
            note: 'Valid item',
          },
          {
            clientMutationId: crypto.randomUUID(),
            type: 'expense',
            amount: 40000,
            pocketId: p1.id,
            occurredOn: '2026-08-24',
            occurredAtLocalTime: '12:15:00',
            note: 'Overdraft item',
          },
        ],
      },
    });

    assert.equal(res.statusCode, 422);
    assert.equal(res.json().error.code, 'INSUFFICIENT_FUNDS');

    // Verify all-or-nothing: 0 transactions saved in DB
    const saved = await db.select().from(transactions).where(eq(transactions.userId, owner.userId));
    assert.equal(saved.length, 0);
  });

  test('T-022: Reject batch with 409 IDEMPOTENCY_CONFLICT if any item clientMutationId is reused with different payload', async () => {
    const owner = await createTestOwner(db);
    const pocket = await createPocket(owner.userId, 'Main', 100000);
    const reusedItemMutationId = crypto.randomUUID();

    // First single transaction using this mutation ID
    await app.inject({
      method: 'POST',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: reusedItemMutationId,
        type: 'expense',
        amount: 10000,
        pocketId: pocket.id,
        occurredOn: '2026-08-24',
        occurredAtLocalTime: '10:00:00',
      },
    });

    // Now submit a batch where an item reuses this mutation ID with a different amount (20000)
    const resBatch = await app.inject({
      method: 'POST',
      url: '/v1/transactions/batch',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        items: [
          {
            clientMutationId: reusedItemMutationId,
            type: 'expense',
            amount: 20000,
            pocketId: pocket.id,
            occurredOn: '2026-08-24',
            occurredAtLocalTime: '10:00:00',
          },
        ],
      },
    });

    assert.equal(resBatch.statusCode, 409);
    assert.equal(resBatch.json().error.code, 'IDEMPOTENCY_CONFLICT');
  });

  test('Combined Balance Deduction: Multiple expenses on same pocket succeed if sum <= balance, reject if sum > balance', async () => {
    const owner = await createTestOwner(db);
    const p1 = await createPocket(owner.userId, 'Main', 60000); // 60k balance

    // 25k + 35k = 60k -> exactly drains balance -> SUCCEEDS
    const res1 = await app.inject({
      method: 'POST',
      url: '/v1/transactions/batch',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        items: [
          {
            clientMutationId: crypto.randomUUID(),
            type: 'expense',
            amount: 25000,
            pocketId: p1.id,
            occurredOn: '2026-08-24',
            occurredAtLocalTime: '10:00:00',
          },
          {
            clientMutationId: crypto.randomUUID(),
            type: 'expense',
            amount: 35000,
            pocketId: p1.id,
            occurredOn: '2026-08-24',
            occurredAtLocalTime: '11:00:00',
          },
        ],
      },
    });
    assert.equal(res1.statusCode, 201);
    assert.equal(res1.json().transactions.length, 2);

    // Further batch with 1k -> fails because balance is now 0
    const res2 = await app.inject({
      method: 'POST',
      url: '/v1/transactions/batch',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        items: [
          {
            clientMutationId: crypto.randomUUID(),
            type: 'expense',
            amount: 1000,
            pocketId: p1.id,
            occurredOn: '2026-08-24',
            occurredAtLocalTime: '12:00:00',
          },
        ],
      },
    });
    assert.equal(res2.statusCode, 422);
    assert.equal(res2.json().error.code, 'INSUFFICIENT_FUNDS');
  });

  test('Per-Item Category Scoping (DEC-030.4): Rejects batch if an item references a category from another pocket', async () => {
    const owner = await createTestOwner(db);
    const p1 = await createPocket(owner.userId, 'Food', 100000);
    const p2 = await createPocket(owner.userId, 'Transport', 100000);

    const c1 = await createCategory(owner.userId, p1.id, 'Food Cat');
    const c2 = await createCategory(owner.userId, p2.id, 'Transport Cat');

    // Item 1 is valid (P1 + c1), but Item 2 references P1 with c2 (belongs to P2)
    const res = await app.inject({
      method: 'POST',
      url: '/v1/transactions/batch',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        items: [
          {
            clientMutationId: crypto.randomUUID(),
            type: 'expense',
            amount: 10000,
            pocketId: p1.id,
            categoryId: c1.id,
            occurredOn: '2026-08-24',
            occurredAtLocalTime: '10:00:00',
          },
          {
            clientMutationId: crypto.randomUUID(),
            type: 'expense',
            amount: 10000,
            pocketId: p1.id,
            categoryId: c2.id,
            occurredOn: '2026-08-24',
            occurredAtLocalTime: '11:00:00',
          },
        ],
      },
    });

    assert.equal(res.statusCode, 422);
    assert.equal(res.json().error.code, 'INVALID_REFERENCE');

    // Verify 0 items saved
    const saved = await db.select().from(transactions).where(eq(transactions.userId, owner.userId));
    assert.equal(saved.length, 0);
  });

  test('Cash and NFC Card budget snapshot deriving in batch items (DEC-024)', async () => {
    const owner = await createTestOwner(db);
    const foodPocket = await createPocket(owner.userId, 'Food', 500000, 'food-groceries');
    const cashPocket = await createPocket(owner.userId, 'Cash', 200000, 'cash', foodPocket.id);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/transactions/batch',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        items: [
          {
            clientMutationId: crypto.randomUUID(),
            type: 'expense',
            amount: 20000,
            pocketId: cashPocket.id,
            occurredOn: '2026-08-24',
            occurredAtLocalTime: '10:00:00',
          },
        ],
      },
    });

    assert.equal(res.statusCode, 201);
    const txn = res.json().transactions[0];
    assert.equal(txn.pocketId, cashPocket.id);
    assert.equal(txn.budgetPocketId, foodPocket.id);
  });

  test('Batch shape validations return 400 INVALID_INPUT', async () => {
    const owner = await createTestOwner(db);
    const p1 = await createPocket(owner.userId, 'Main', 100000);

    // Empty items array (minItems: 1)
    const resEmpty = await app.inject({
      method: 'POST',
      url: '/v1/transactions/batch',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        items: [],
      },
    });
    assert.equal(resEmpty.statusCode, 400);
    assert.equal(resEmpty.json().error.code, 'INVALID_INPUT');

    // Duplicate clientMutationId within items
    const dupMutationId = crypto.randomUUID();
    const resDup = await app.inject({
      method: 'POST',
      url: '/v1/transactions/batch',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        items: [
          {
            clientMutationId: dupMutationId,
            type: 'expense',
            amount: 10000,
            pocketId: p1.id,
            occurredOn: '2026-08-24',
            occurredAtLocalTime: '10:00:00',
          },
          {
            clientMutationId: dupMutationId,
            type: 'expense',
            amount: 15000,
            pocketId: p1.id,
            occurredOn: '2026-08-24',
            occurredAtLocalTime: '11:00:00',
          },
        ],
      },
    });
    assert.equal(resDup.statusCode, 400);
    assert.equal(resDup.json().error.code, 'INVALID_INPUT');

    // Non-expense item type
    const resNonExpense = await app.inject({
      method: 'POST',
      url: '/v1/transactions/batch',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        items: [
          {
            clientMutationId: crypto.randomUUID(),
            type: 'income',
            amount: 10000,
            pocketId: p1.id,
            occurredOn: '2026-08-24',
            occurredAtLocalTime: '10:00:00',
          },
        ],
      },
    });
    assert.equal(resNonExpense.statusCode, 400);
    assert.equal(resNonExpense.json().error.code, 'INVALID_INPUT');
  });
});
