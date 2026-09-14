import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';
import { createTestApp } from '../helpers/testApp.js';
import { getTestDb, resetTestDatabase, createTestOwner, closeTestDb, TestDatabase } from '../helpers/testDb.js';
import { pockets, transactions, idempotencyRecords } from '../../src/db/schema.js';

describe('Transaction idempotency regression', { timeout: 60000 }, () => {
  let db: TestDatabase;
  let app: FastifyInstance;
  let headers: Record<string, string>;
  let pocketId: string;
  before(async () => { db = await getTestDb(); app = await createTestApp(); });
  beforeEach(async () => {
    await resetTestDatabase(db);
    const owner = await createTestOwner(db);
    headers = { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken };
    const [p] = await db.insert(pockets).values({ userId: owner.userId, name: 'Test pocket',
      emoji: '💳', groupId: 'living', openingBalance: 100000 }).returning();
    pocketId = p.id;
  });
  after(async () => { await app?.close(); await closeTestDb(); });
  const expense = (amount = 10000) => ({ clientMutationId: randomUUID(), type: 'expense',
    amount, pocketId, occurredOn: '2026-09-14', occurredAtLocalTime: '12:00:00' });
  const post = (payload: object) => app.inject({ method: 'POST', url: '/v1/transactions', headers, payload });
  const batch = (items: object[], clientMutationId = randomUUID()) => app.inject({
    method: 'POST', url: '/v1/transactions/batch', headers, payload: { clientMutationId, items } });
  async function countRows(expected: number) {
    const rows = await db.select().from(transactions).where(eq(transactions.pocketId, pocketId));
    assert.equal(rows.length, expected);
    return rows;
  }
  function sameResponses(a: any, b: any, status = 201) {
    assert.equal(a.statusCode, status, a.body);
    assert.equal(b.statusCode, status, b.body);
    assert.deepEqual(a.json(), b.json());
  }

  test('concurrent identical single POST replays and deducts only once', async () => {
    const item = expense(100000);
    const [a, b] = await Promise.all([post(item), post(item)]);
    sameResponses(a, b);
    const rows = await countRows(1);
    assert.equal(Number(rows[0].amount), 100000);
  });
  test('concurrent changed payload returns 409 and commits only the winner', async () => {
    const item = expense();
    const results = await Promise.all([post(item), post({ ...item, amount: 20000 })]);
    assert.deepEqual(results.map(r => r.statusCode).sort(), [201, 409]);
    assert.equal(results.find(r => r.statusCode === 409)!.json().error.code, 'IDEMPOTENCY_CONFLICT');
    await countRows(1);
  });
  test('same item in different batch roots returns original expense', async () => {
    const item = expense(100000);
    const a = await batch([item]);
    const b = await batch([item]);
    sameResponses(a, b);
    await countRows(1);
  });
  test('single to batch and batch to single reuse the original result', async () => {
    const item = expense();
    const a = await post(item);
    const b = await batch([item]);
    assert.equal(b.statusCode, 201, b.body);
    assert.deepEqual(b.json().transactions[0], a.json().transaction);
    const item2 = expense();
    const c = await batch([item2]);
    const d = await post(item2);
    assert.equal(d.statusCode, 201, d.body);
    assert.deepEqual(d.json().transaction, c.json().transactions[0]);
    await countRows(2);
  });
  test('mixed replay/new items preserve order and charge only new items', async () => {
    const old = expense(90000);
    const a = await post(old);
    const fresh = expense(10000);
    const b = await batch([fresh, old]);
    assert.equal(b.statusCode, 201, b.body);
    assert.deepEqual(b.json().transactions.map((t: any) => t.amount), [10000, 90000]);
    assert.equal(b.json().transactions[1].id, a.json().transaction.id);
    const rows = await countRows(2);
    assert.equal(rows.reduce((sum, row) => sum + Number(row.amount), 0), 100000);
  });
  test('changed reused item rejects the entire batch without new records', async () => {
    const old = expense();
    await batch([old]);
    const root = randomUUID();
    const res = await batch([expense(), { ...old, amount: 20000 }], root);
    assert.equal(res.statusCode, 409, res.body);
    await countRows(1);
    assert.equal((await db.select().from(idempotencyRecords).where(eq(idempotencyRecords.clientMutationId, root))).length, 0);
  });
  test('invalid new item rolls back batch while leaving previous expense intact', async () => {
    const old = expense();
    await post(old);
    const res = await batch([old, expense(), { ...expense(), pocketId: randomUUID() }]);
    assert.equal(res.statusCode, 422, res.body);
    await countRows(1);
  });
  test('simultaneous same-root batch replays entire response', async () => {
    const items = [expense(), expense()];
    const root = randomUUID();
    const [a, b] = await Promise.all([batch(items, root), batch(items, root)]);
    sameResponses(a, b);
    await countRows(2);
  });
  test('simultaneous batches sharing items in reversed order do not duplicate/deadlock', async () => {
    const items = [expense(), expense()];
    const [a, b] = await Promise.all([batch(items), batch([...items].reverse())]);
    assert.equal(a.statusCode, 201, a.body);
    assert.equal(b.statusCode, 201, b.body);
    assert.deepEqual(a.json().transactions, b.json().transactions.reverse());
    await countRows(2);
  });
  test('simultaneous single and batch coordinate on item mutation ID', async () => {
    const item = expense(100000);
    const [a, b] = await Promise.all([post(item), batch([item])]);
    assert.equal(a.statusCode, 201, a.body);
    assert.equal(b.statusCode, 201, b.body);
    assert.deepEqual(a.json().transaction, b.json().transactions[0]);
    await countRows(1);
  });
  test('root/item collision and case-equivalent duplicate item IDs reject before writes', async () => {
    const item = expense();
    assert.equal((await batch([item], item.clientMutationId)).statusCode, 400);
    assert.equal((await batch([item, { ...item, clientMutationId: item.clientMutationId.toUpperCase() }])).statusCode, 400);
    await countRows(0);
  });
  for (const action of ['patch', 'archive', 'restore', 'delete'] as const) {
    test(`concurrent identical ${action} replays before stale revision check`, async () => {
      const created = (await post(expense())).json().transaction;
      let revision = 1;
      if (action === 'restore') {
        const archived = await app.inject({ method: 'POST', url: `/v1/transactions/${created.id}/archive`, headers,
          payload: { clientMutationId: randomUUID(), expectedRevision: 1 } });
        assert.equal(archived.statusCode, 200);
        revision = 2;
      }
      const url = `/v1/transactions/${created.id}` + (action === 'archive' || action === 'restore' ? `/${action}` : '');
      const method = action === 'patch' ? 'PATCH' : action === 'delete' ? 'DELETE' : 'POST';
      const payload = { clientMutationId: randomUUID(), expectedRevision: revision,
        ...(action === 'patch' ? { amount: 20000 } : {}),
        ...(action === 'delete' ? { confirmPermanentDelete: true } : {}) };
      const [a, b] = await Promise.all([1, 2].map(() => app.inject({ method, url, headers, payload })));
      sameResponses(a, b, 200);
      const rows = await countRows(1);
      assert.equal(rows[0].revision, revision + 1);
    });
  }
});
