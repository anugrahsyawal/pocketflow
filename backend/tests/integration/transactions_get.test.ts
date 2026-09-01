import { test, before, beforeEach, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { FastifyInstance } from 'fastify';
import { createTestApp } from '../helpers/testApp.js';
import { getTestDb, resetTestDatabase, createTestOwner, closeTestDb, TestDatabase } from '../helpers/testDb.js';
import { pockets, categories, transactions } from '../../src/db/schema.js';

describe('GET /v1/transactions Integration Tests', () => {
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

  // Helper to create basic pocket
  async function createPocket(userId: string, name: string) {
    const [p] = await db
      .insert(pockets)
      .values({
        userId,
        name,
        emoji: '💳',
        groupId: 'living',
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

  test('T-001: Reject GET /v1/transactions without session cookie (401 UNAUTHENTICATED)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/transactions',
    });

    assert.equal(res.statusCode, 401);
    const body = res.json();
    assert.equal(body.error.code, 'UNAUTHENTICATED');
    assert.equal(body.error.statusCode, 401);
  });

  test('Reject GET /v1/transactions with invalid session cookie (401 UNAUTHENTICATED)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/transactions',
      headers: { cookie: 'sid=invalid-non-existent-session-token' },
    });

    assert.equal(res.statusCode, 401);
    const body = res.json();
    assert.equal(body.error.code, 'UNAUTHENTICATED');
    assert.equal(body.error.statusCode, 401);
  });

  test('Empty transaction list returns 200 OK with default pagination envelope', async () => {
    const owner = await createTestOwner(db);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader },
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.deepEqual(body.transactions, []);
    assert.deepEqual(body.pagination, {
      page: 1,
      limit: 50,
      total: 0,
      totalPages: 0,
      hasMore: false,
    });
  });

  test('GET /v1/transactions returns transaction list conforming to OpenAPI entity schema', async () => {
    const owner = await createTestOwner(db);
    const pocket = await createPocket(owner.userId, 'Food');
    const category = await createCategory(owner.userId, pocket.id, 'Groceries');

    await db.insert(transactions).values({
      userId: owner.userId,
      type: 'expense',
      amount: 45000,
      pocketId: pocket.id,
      categoryId: category.id,
      budgetPocketId: pocket.id,
      occurredOn: '2026-08-24',
      occurredAtLocalTime: '14:30:00',
      note: 'Makan siang Nasi Padang',
      revision: 1,
    });

    const res = await app.inject({
      method: 'GET',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader },
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.transactions.length, 1);

    const txn = body.transactions[0];
    assert.ok(typeof txn.id === 'string' && txn.id.length > 0);
    assert.equal(txn.type, 'expense');
    assert.equal(txn.amount, 45000);
    assert.equal(txn.pocketId, pocket.id);
    assert.equal(txn.fromPocketId, null);
    assert.equal(txn.toPocketId, null);
    assert.equal(txn.categoryId, category.id);
    assert.equal(txn.budgetPocketId, pocket.id);
    assert.equal(txn.transferType, null);
    assert.equal(txn.incomeSource, null);
    assert.equal(txn.occurredOn, '2026-08-24');
    assert.equal(txn.occurredAtLocalTime, '14:30:00');
    assert.equal(txn.note, 'Makan siang Nasi Padang');
    assert.equal(txn.isArchived, false);
    assert.equal(txn.archivedAt, null);
    assert.equal(txn.revision, 1);
    assert.ok(typeof txn.createdAt === 'string');
    assert.ok(typeof txn.updatedAt === 'string');

    assert.deepEqual(body.pagination, {
      page: 1,
      limit: 50,
      total: 1,
      totalPages: 1,
      hasMore: false,
    });
  });

  test('GET /v1/transactions sorts deterministically by occurredOn DESC, occurredAtLocalTime DESC, createdAt DESC', async () => {
    const owner = await createTestOwner(db);
    const pocket = await createPocket(owner.userId, 'Main');

    const [t1] = await db
      .insert(transactions)
      .values({
        userId: owner.userId,
        type: 'expense',
        amount: 10000,
        pocketId: pocket.id,
        occurredOn: '2026-08-20',
        occurredAtLocalTime: '10:00:00',
        note: 'Oldest date',
      })
      .returning();

    const [t2] = await db
      .insert(transactions)
      .values({
        userId: owner.userId,
        type: 'expense',
        amount: 20000,
        pocketId: pocket.id,
        occurredOn: '2026-08-25',
        occurredAtLocalTime: '08:00:00',
        note: 'Newer date, earlier time',
      })
      .returning();

    const [t3] = await db
      .insert(transactions)
      .values({
        userId: owner.userId,
        type: 'expense',
        amount: 30000,
        pocketId: pocket.id,
        occurredOn: '2026-08-25',
        occurredAtLocalTime: '18:00:00',
        note: 'Newer date, later time',
      })
      .returning();

    const res = await app.inject({
      method: 'GET',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader },
    });

    assert.equal(res.statusCode, 200);
    const list = res.json().transactions;
    assert.equal(list.length, 3);
    assert.equal(list[0].id, t3.id); // 2026-08-25 18:00:00
    assert.equal(list[1].id, t2.id); // 2026-08-25 08:00:00
    assert.equal(list[2].id, t1.id); // 2026-08-20 10:00:00
  });

  test('GET /v1/transactions respects custom pagination (page, limit) and calculates totalPages/hasMore accurately', async () => {
    const owner = await createTestOwner(db);
    const pocket = await createPocket(owner.userId, 'Main');

    for (let i = 1; i <= 5; i++) {
      await db.insert(transactions).values({
        userId: owner.userId,
        type: 'expense',
        amount: i * 1000,
        pocketId: pocket.id,
        occurredOn: `2026-08-0${i}`,
        occurredAtLocalTime: '12:00:00',
        note: `Item ${i}`,
      });
    }

    // Page 1, limit 2
    const res1 = await app.inject({
      method: 'GET',
      url: '/v1/transactions?page=1&limit=2',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(res1.statusCode, 200);
    const body1 = res1.json();
    assert.equal(body1.transactions.length, 2);
    assert.deepEqual(body1.pagination, {
      page: 1,
      limit: 2,
      total: 5,
      totalPages: 3,
      hasMore: true,
    });

    // Page 2, limit 2
    const res2 = await app.inject({
      method: 'GET',
      url: '/v1/transactions?page=2&limit=2',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(res2.statusCode, 200);
    const body2 = res2.json();
    assert.equal(body2.transactions.length, 2);
    assert.deepEqual(body2.pagination, {
      page: 2,
      limit: 2,
      total: 5,
      totalPages: 3,
      hasMore: true,
    });

    // Page 3, limit 2
    const res3 = await app.inject({
      method: 'GET',
      url: '/v1/transactions?page=3&limit=2',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(res3.statusCode, 200);
    const body3 = res3.json();
    assert.equal(body3.transactions.length, 1);
    assert.deepEqual(body3.pagination, {
      page: 3,
      limit: 2,
      total: 5,
      totalPages: 3,
      hasMore: false,
    });
  });

  test('T-053: Soft-deleted transactions (deletedAt != null) are NEVER returned in GET /v1/transactions even with includeArchived=true', async () => {
    const owner = await createTestOwner(db);
    const pocket = await createPocket(owner.userId, 'Main');

    // Active
    await db.insert(transactions).values({
      userId: owner.userId,
      type: 'expense',
      amount: 15000,
      pocketId: pocket.id,
      occurredOn: '2026-08-24',
      occurredAtLocalTime: '12:00:00',
      note: 'Active Item',
    });

    // Soft-deleted tombstone
    await db.insert(transactions).values({
      userId: owner.userId,
      type: 'expense',
      amount: 25000,
      pocketId: pocket.id,
      occurredOn: '2026-08-24',
      occurredAtLocalTime: '12:00:00',
      note: 'Tombstone Item',
      deletedAt: new Date(),
    });

    const resDefault = await app.inject({
      method: 'GET',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(resDefault.statusCode, 200);
    assert.equal(resDefault.json().transactions.length, 1);
    assert.equal(resDefault.json().transactions[0].note, 'Active Item');

    const resIncludeArchived = await app.inject({
      method: 'GET',
      url: '/v1/transactions?includeArchived=true',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(resIncludeArchived.statusCode, 200);
    assert.equal(resIncludeArchived.json().transactions.length, 1);
    assert.equal(resIncludeArchived.json().transactions[0].note, 'Active Item');
  });

  test('T-048 & T-049: Archived transactions (archivedAt != null) are excluded by default and included when includeArchived=true', async () => {
    const owner = await createTestOwner(db);
    const pocket = await createPocket(owner.userId, 'Main');

    await db.insert(transactions).values({
      userId: owner.userId,
      type: 'expense',
      amount: 10000,
      pocketId: pocket.id,
      occurredOn: '2026-08-24',
      occurredAtLocalTime: '10:00:00',
      note: 'Active Transaction',
    });

    await db.insert(transactions).values({
      userId: owner.userId,
      type: 'expense',
      amount: 20000,
      pocketId: pocket.id,
      occurredOn: '2026-08-24',
      occurredAtLocalTime: '11:00:00',
      note: 'Archived Transaction',
      archivedAt: new Date(),
    });

    // Default (includeArchived=false)
    const resDefault = await app.inject({
      method: 'GET',
      url: '/v1/transactions',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(resDefault.statusCode, 200);
    const listDefault = resDefault.json().transactions;
    assert.equal(listDefault.length, 1);
    assert.equal(listDefault[0].note, 'Active Transaction');
    assert.equal(listDefault[0].isArchived, false);

    // includeArchived=true
    const resArchived = await app.inject({
      method: 'GET',
      url: '/v1/transactions?includeArchived=true',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(resArchived.statusCode, 200);
    const listArchived = resArchived.json().transactions;
    assert.equal(listArchived.length, 2);
    const archivedTxn = listArchived.find((t: any) => t.note === 'Archived Transaction');
    assert.ok(archivedTxn);
    assert.equal(archivedTxn.isArchived, true);
    assert.ok(typeof archivedTxn.archivedAt === 'string');
  });

  test('T-055: Filter by type (expense, income, transfer)', async () => {
    const owner = await createTestOwner(db);
    const p1 = await createPocket(owner.userId, 'P1');
    const p2 = await createPocket(owner.userId, 'P2');

    await db.insert(transactions).values({
      userId: owner.userId,
      type: 'expense',
      amount: 10000,
      pocketId: p1.id,
      occurredOn: '2026-08-24',
      occurredAtLocalTime: '10:00:00',
      note: 'Expense Item',
    });

    await db.insert(transactions).values({
      userId: owner.userId,
      type: 'income',
      amount: 50000,
      pocketId: p1.id,
      incomeSource: 'gaji',
      occurredOn: '2026-08-24',
      occurredAtLocalTime: '11:00:00',
      note: 'Income Item',
    });

    await db.insert(transactions).values({
      userId: owner.userId,
      type: 'transfer',
      amount: 5000,
      fromPocketId: p1.id,
      toPocketId: p2.id,
      transferType: 'normal',
      occurredOn: '2026-08-24',
      occurredAtLocalTime: '12:00:00',
      note: 'Transfer Item',
    });

    // Filter type=expense
    const resExp = await app.inject({
      method: 'GET',
      url: '/v1/transactions?type=expense',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(resExp.statusCode, 200);
    assert.equal(resExp.json().transactions.length, 1);
    assert.equal(resExp.json().transactions[0].type, 'expense');

    // Filter type=income
    const resInc = await app.inject({
      method: 'GET',
      url: '/v1/transactions?type=income',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(resInc.statusCode, 200);
    assert.equal(resInc.json().transactions.length, 1);
    assert.equal(resInc.json().transactions[0].type, 'income');

    // Filter type=transfer
    const resTrf = await app.inject({
      method: 'GET',
      url: '/v1/transactions?type=transfer',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(resTrf.statusCode, 200);
    assert.equal(resTrf.json().transactions.length, 1);
    assert.equal(resTrf.json().transactions[0].type, 'transfer');
  });

  test('T-055: Filter by pocketId matches payment pocketId, fromPocketId, or toPocketId', async () => {
    const owner = await createTestOwner(db);
    const p1 = await createPocket(owner.userId, 'P1');
    const p2 = await createPocket(owner.userId, 'P2');
    const p3 = await createPocket(owner.userId, 'P3');

    // Expense on P1
    await db.insert(transactions).values({
      userId: owner.userId,
      type: 'expense',
      amount: 10000,
      pocketId: p1.id,
      occurredOn: '2026-08-24',
      occurredAtLocalTime: '10:00:00',
      note: 'Expense on P1',
    });

    // Transfer P1 -> P2
    await db.insert(transactions).values({
      userId: owner.userId,
      type: 'transfer',
      amount: 5000,
      fromPocketId: p1.id,
      toPocketId: p2.id,
      transferType: 'normal',
      occurredOn: '2026-08-24',
      occurredAtLocalTime: '11:00:00',
      note: 'Transfer P1 to P2',
    });

    // Expense on P3
    await db.insert(transactions).values({
      userId: owner.userId,
      type: 'expense',
      amount: 7000,
      pocketId: p3.id,
      occurredOn: '2026-08-24',
      occurredAtLocalTime: '12:00:00',
      note: 'Expense on P3',
    });

    // Filter pocketId = P1 -> matches Expense on P1 and Transfer P1 -> P2
    const resP1 = await app.inject({
      method: 'GET',
      url: `/v1/transactions?pocketId=${p1.id}`,
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(resP1.statusCode, 200);
    assert.equal(resP1.json().transactions.length, 2);

    // Filter pocketId = P2 -> matches Transfer P1 -> P2
    const resP2 = await app.inject({
      method: 'GET',
      url: `/v1/transactions?pocketId=${p2.id}`,
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(resP2.statusCode, 200);
    assert.equal(resP2.json().transactions.length, 1);
    assert.equal(resP2.json().transactions[0].note, 'Transfer P1 to P2');
  });

  test('T-055: Filter by categoryId', async () => {
    const owner = await createTestOwner(db);
    const pocket = await createPocket(owner.userId, 'Main');
    const cat1 = await createCategory(owner.userId, pocket.id, 'Food');
    const cat2 = await createCategory(owner.userId, pocket.id, 'Transport');

    await db.insert(transactions).values({
      userId: owner.userId,
      type: 'expense',
      amount: 10000,
      pocketId: pocket.id,
      categoryId: cat1.id,
      occurredOn: '2026-08-24',
      occurredAtLocalTime: '10:00:00',
      note: 'Food item',
    });

    await db.insert(transactions).values({
      userId: owner.userId,
      type: 'expense',
      amount: 20000,
      pocketId: pocket.id,
      categoryId: cat2.id,
      occurredOn: '2026-08-24',
      occurredAtLocalTime: '11:00:00',
      note: 'Transport item',
    });

    const res = await app.inject({
      method: 'GET',
      url: `/v1/transactions?categoryId=${cat1.id}`,
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(res.statusCode, 200);
    const list = res.json().transactions;
    assert.equal(list.length, 1);
    assert.equal(list[0].categoryId, cat1.id);
  });

  test('T-055: Filter by date range (startDate and endDate)', async () => {
    const owner = await createTestOwner(db);
    const pocket = await createPocket(owner.userId, 'Main');

    await db.insert(transactions).values({
      userId: owner.userId,
      type: 'expense',
      amount: 10000,
      pocketId: pocket.id,
      occurredOn: '2026-08-01',
      occurredAtLocalTime: '10:00:00',
      note: 'Early August',
    });

    await db.insert(transactions).values({
      userId: owner.userId,
      type: 'expense',
      amount: 20000,
      pocketId: pocket.id,
      occurredOn: '2026-08-15',
      occurredAtLocalTime: '10:00:00',
      note: 'Mid August',
    });

    await db.insert(transactions).values({
      userId: owner.userId,
      type: 'expense',
      amount: 30000,
      pocketId: pocket.id,
      occurredOn: '2026-08-30',
      occurredAtLocalTime: '10:00:00',
      note: 'Late August',
    });

    // Date range 2026-08-10 to 2026-08-20
    const res = await app.inject({
      method: 'GET',
      url: '/v1/transactions?startDate=2026-08-10&endDate=2026-08-20',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(res.statusCode, 200);
    const list = res.json().transactions;
    assert.equal(list.length, 1);
    assert.equal(list[0].note, 'Mid August');
  });

  test('T-055: Filter by search keyword against note (case-insensitive substring)', async () => {
    const owner = await createTestOwner(db);
    const pocket = await createPocket(owner.userId, 'Main');

    await db.insert(transactions).values({
      userId: owner.userId,
      type: 'expense',
      amount: 15000,
      pocketId: pocket.id,
      occurredOn: '2026-08-24',
      occurredAtLocalTime: '10:00:00',
      note: 'Makan Nasi Padang enak',
    });

    await db.insert(transactions).values({
      userId: owner.userId,
      type: 'expense',
      amount: 25000,
      pocketId: pocket.id,
      occurredOn: '2026-08-24',
      occurredAtLocalTime: '11:00:00',
      note: 'Beli bensin pertalite',
    });

    const res = await app.inject({
      method: 'GET',
      url: '/v1/transactions?search=nasi+padang',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(res.statusCode, 200);
    const list = res.json().transactions;
    assert.equal(list.length, 1);
    assert.equal(list[0].note, 'Makan Nasi Padang enak');
  });

  test('T-056: Owner Isolation - GET /v1/transactions returns only transactions of authenticated owner', async () => {
    const ownerA = await createTestOwner(db, 'ownerA@example.com');
    const ownerB = await createTestOwner(db, 'ownerB@example.com');

    const pocketA = await createPocket(ownerA.userId, 'Pocket A');
    const pocketB = await createPocket(ownerB.userId, 'Pocket B');

    await db.insert(transactions).values({
      userId: ownerA.userId,
      type: 'expense',
      amount: 50000,
      pocketId: pocketA.id,
      occurredOn: '2026-08-24',
      occurredAtLocalTime: '10:00:00',
      note: 'Owner A Txn',
    });

    await db.insert(transactions).values({
      userId: ownerB.userId,
      type: 'expense',
      amount: 75000,
      pocketId: pocketB.id,
      occurredOn: '2026-08-24',
      occurredAtLocalTime: '11:00:00',
      note: 'Owner B Txn',
    });

    // Query as Owner A
    const resA = await app.inject({
      method: 'GET',
      url: '/v1/transactions',
      headers: { cookie: ownerA.cookieHeader },
    });
    assert.equal(resA.statusCode, 200);
    assert.equal(resA.json().transactions.length, 1);
    assert.equal(resA.json().transactions[0].note, 'Owner A Txn');

    // Query as Owner B
    const resB = await app.inject({
      method: 'GET',
      url: '/v1/transactions',
      headers: { cookie: ownerB.cookieHeader },
    });
    assert.equal(resB.statusCode, 200);
    assert.equal(resB.json().transactions.length, 1);
    assert.equal(resB.json().transactions[0].note, 'Owner B Txn');
  });

  test('Query parameter validation returns 400 INVALID_INPUT for bad inputs', async () => {
    const owner = await createTestOwner(db);

    // Unknown query param
    const res1 = await app.inject({
      method: 'GET',
      url: '/v1/transactions?foo=bar',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(res1.statusCode, 400);
    assert.equal(res1.json().error.code, 'INVALID_INPUT');

    // Invalid page (< 1 or non-integer)
    const res2 = await app.inject({
      method: 'GET',
      url: '/v1/transactions?page=0',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(res2.statusCode, 400);
    assert.equal(res2.json().error.code, 'INVALID_INPUT');

    // Invalid limit (> 100 or < 1)
    const res3 = await app.inject({
      method: 'GET',
      url: '/v1/transactions?limit=101',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(res3.statusCode, 400);
    assert.equal(res3.json().error.code, 'INVALID_INPUT');

    // Invalid type enum
    const res4 = await app.inject({
      method: 'GET',
      url: '/v1/transactions?type=invalid_type',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(res4.statusCode, 400);
    assert.equal(res4.json().error.code, 'INVALID_INPUT');

    // Invalid pocketId UUID
    const res5 = await app.inject({
      method: 'GET',
      url: '/v1/transactions?pocketId=not-a-uuid',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(res5.statusCode, 400);
    assert.equal(res5.json().error.code, 'INVALID_INPUT');

    // Invalid startDate
    const res6 = await app.inject({
      method: 'GET',
      url: '/v1/transactions?startDate=2026-13-45',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(res6.statusCode, 400);
    assert.equal(res6.json().error.code, 'INVALID_INPUT');

    // Search > 100 chars
    const longSearch = 'a'.repeat(101);
    const res7 = await app.inject({
      method: 'GET',
      url: `/v1/transactions?search=${longSearch}`,
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(res7.statusCode, 400);
    assert.equal(res7.json().error.code, 'INVALID_INPUT');

    // Invalid includeArchived
    const res8 = await app.inject({
      method: 'GET',
      url: '/v1/transactions?includeArchived=maybe',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(res8.statusCode, 400);
    assert.equal(res8.json().error.code, 'INVALID_INPUT');
  });
});
