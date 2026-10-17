import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { idempotencyRecords } from '../../src/db/schema.js';
import { createTestApp } from '../helpers/testApp.js';
import { getTestDb, resetTestDatabase, createTestOwner, closeTestDb } from '../helpers/testDb.js';
import { seedMasterData } from '../helpers/masterDataFixture.js';

describe('Batch terminal resolution (DEC-036)', () => {
  let db: Awaited<ReturnType<typeof getTestDb>>, app: Awaited<ReturnType<typeof createTestApp>>;
  let owner: Awaited<ReturnType<typeof createTestOwner>>, ids: Awaited<ReturnType<typeof seedMasterData>>;
  let date: string;
  const send = (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: unknown) => app.inject({ method, url, payload, headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken } });
  const list = async () => (await send('GET', '/v1/transactions?includeArchived=true')).json();
  const item = (amount = 1000) => ({ clientMutationId: randomUUID(), type: 'expense', amount, pocketId: ids.nfc.id, occurredOn: date, occurredAtLocalTime: '11:00', note: '  original  ', categoryId: null });
  const batch = () => ({ clientMutationId: randomUUID(), items: [item(), item(2000)] });
  const resolve = (body: unknown) => send('POST', '/v1/transactions/batch/resolve-attempt', body);
  const create = (body: unknown) => send('POST', '/v1/transactions/batch', body);
  before(async () => { db = await getTestDb(); app = await createTestApp(); });
  after(async () => { await app?.close(); await closeTestDb(); });
  beforeEach(async () => {
    await resetTestDatabase(db); owner = await createTestOwner(db); ids = await seedMasterData(db, owner.userId);
    date = (await list()).transactions[0].occurredOn;
  });

  it('fences rejected batch and all items permanently, without changing financial state', async () => {
    const body = { ...batch(), items: [item(50000), item(50000)] };
    assert.equal((await create(body)).statusCode, 422);
    const before = await list(), pockets = (await send('GET', '/v1/pockets')).json();
    const stopped = await resolve(body);
    assert.equal(stopped.statusCode, 200);
    assert.deepEqual(stopped.json(), { status: 'stopped', clientMutationId: body.clientMutationId, items: body.items.map(i => ({ clientMutationId: i.clientMutationId, status: 'cancelled' })) });
    assert.deepEqual(await list(), before);
    assert.deepEqual((await send('GET', '/v1/pockets')).json(), pockets);
    assert.deepEqual((await resolve(body)).json(), stopped.json());
    const income = { clientMutationId: randomUUID(), type: 'income', amount: 100000, pocketId: ids.nfc.id, occurredOn: date, occurredAtLocalTime: '12:00' };
    assert.equal((await send('POST', '/v1/transactions', income)).statusCode, 201);
    assert.equal((await create(body)).json().error.code, 'MUTATION_CANCELLED');
    for (const entry of body.items) assert.equal((await send('POST', '/v1/transactions', entry)).json().error.code, 'MUTATION_CANCELLED');
    const records = await db.select().from(idempotencyRecords);
    for (const id of [body.clientMutationId, ...body.items.map(i => i.clientMutationId)]) assert.equal(records.find(r => r.clientMutationId === id)?.expiresAt, null);
  });

  it('preserves mixed committed/cancelled outcomes, including later edits and deletes', async () => {
    const body = batch();
    const first = await send('POST', '/v1/transactions', body.items[0]);
    assert.equal(first.statusCode, 201);
    const row = first.json().transaction;
    assert.equal((await send('PATCH', `/v1/transactions/${row.id}`, { clientMutationId: randomUUID(), expectedRevision: 1, note: 'changed' })).statusCode, 200);
    const stopped = await resolve(body);
    assert.equal(stopped.statusCode, 200);
    assert.deepEqual(stopped.json().items[0], { clientMutationId: body.items[0].clientMutationId, status: 'committed', acknowledgement: first.json() });
    assert.equal(stopped.json().items[1].status, 'cancelled');
    assert.equal((await send('DELETE', `/v1/transactions/${row.id}`, { clientMutationId: randomUUID(), expectedRevision: 2, confirmPermanentDelete: true })).statusCode, 200);
    assert.deepEqual((await resolve(body)).json(), stopped.json());
    assert.equal((await create(body)).json().error.code, 'MUTATION_CANCELLED');
  });

  it('preserves committed root acknowledgement after deletion and accepts nullable fields', async () => {
    const body = batch(); body.items[1].note = '';
    const nullableBody = { ...body, items: [body.items[0], { ...body.items[1], note: null }] };
    const created = await create(nullableBody); assert.equal(created.statusCode, 201);
    const row = created.json().transactions[0];
    assert.equal((await send('DELETE', `/v1/transactions/${row.id}`, { clientMutationId: randomUUID(), expectedRevision: 1, confirmPermanentDelete: true })).statusCode, 200);
    const resolved = await resolve(nullableBody); assert.equal(resolved.statusCode, 200);
    assert.deepEqual(resolved.json(), { status: 'committed', clientMutationId: body.clientMutationId, acknowledgement: created.json() });
  });

  it('reports stopped with all items committed when only the root was never submitted', async () => {
    const body = batch();
    for (const entry of body.items) assert.equal((await send('POST', '/v1/transactions', entry)).statusCode, 201);
    const stopped = await resolve(body); assert.equal(stopped.statusCode, 200);
    assert.equal(stopped.json().status, 'stopped');
    assert.ok(stopped.json().items.every((i: { status: string }) => i.status === 'committed'));
    assert.equal((await create(body)).json().error.code, 'MUTATION_CANCELLED');
  });

  it('respects pre-existing item cancellation and blocks reuse through another batch root', async () => {
    const body = batch();
    assert.equal((await send('POST', '/v1/transactions/resolve-attempt', body.items[0])).json().status, 'cancelled');
    assert.equal((await resolve(body)).statusCode, 200);
    assert.equal((await create({ ...body, clientMutationId: randomUUID() })).json().error.code, 'MUTATION_CANCELLED');
  });

  it('rejects changed order, whitespace or omission and rolls back all fences on item conflict', async () => {
    const body = batch();
    assert.equal((await resolve(body)).statusCode, 200);
    const { categoryId: omitted, ...withoutCategory } = body.items[0];
    for (const items of [[...body.items].reverse(), [{ ...body.items[0], note: 'original' }, body.items[1]], [withoutCategory, body.items[1]]]) {
      assert.equal((await resolve({ ...body, items })).json().error.code, 'IDEMPOTENCY_CONFLICT');
    }
    const next = batch();
    assert.equal((await send('POST', '/v1/transactions', next.items[1])).statusCode, 201);
    const conflict = { ...next, items: [next.items[0], { ...next.items[1], amount: 7 }] };
    assert.equal((await resolve(conflict)).json().error.code, 'IDEMPOTENCY_CONFLICT');
    const records = await db.select().from(idempotencyRecords);
    assert.ok(!records.some(r => r.clientMutationId === next.clientMutationId || r.clientMutationId === next.items[0].clientMutationId));
    assert.equal((await create(next)).statusCode, 201);
  });

  it('shares batch shape validation without requiring current domain references', async () => {
    const body = batch();
    for (const invalid of [{ ...body, extra: 1 }, { ...body, items: [] }, { ...body, items: Array.from({ length: 51 }, () => item()) },
      { ...body, items: [body.items[0], body.items[0]] }, { ...body, items: [{ ...item(), clientMutationId: body.clientMutationId }] },
      ...[{ type: 'income' }, { amount: 0 }, { categoryId: 'invalid' }, { note: 8 }, { budgetPocketId: ids.food.id }, { occurredOn: '2026-02-30' }].map(change => ({ ...body, items: [{ ...item(), ...change }] }))]) {
      assert.equal((await resolve(invalid)).statusCode, 400);
      assert.equal((await create(invalid)).statusCode, 400);
    }
    assert.equal((await resolve({ ...body, items: [{ ...item(), pocketId: randomUUID(), categoryId: randomUUID() }] })).statusCode, 200);
  });

  it('requires authentication/CSRF and isolates mutation identities per owner', async () => {
    const body = batch(), url = '/v1/transactions/batch/resolve-attempt';
    assert.equal((await app.inject({ method: 'POST', url, payload: body })).statusCode, 401);
    assert.equal((await app.inject({ method: 'POST', url, payload: body, headers: { cookie: owner.cookieHeader } })).statusCode, 403);
    const original = owner; owner = await createTestOwner(db);
    assert.equal((await resolve(body)).json().status, 'stopped');
    owner = original;
    assert.equal((await create(body)).statusCode, 201);
    assert.equal((await resolve(body)).json().status, 'committed');
  });

  it('concurrent submit/stop and standalone item submission have one durable outcome', async () => {
    for (let i = 0; i < 6; i++) {
      const body = batch();
      const [created, resolved, single] = await Promise.all([create(body), resolve(body), send('POST', '/v1/transactions', body.items[0])]);
      assert.equal(resolved.statusCode, 200);
      const outcome = resolved.json();
      if (outcome.status === 'committed') {
        assert.equal(created.statusCode, 201); assert.equal(single.statusCode, 201);
        assert.deepEqual(outcome.acknowledgement, created.json());
        assert.deepEqual(outcome.acknowledgement.transactions[0], single.json().transaction);
      } else {
        assert.equal(created.json().error.code, 'MUTATION_CANCELLED');
        if (outcome.items[0].status === 'committed') assert.deepEqual(outcome.items[0].acknowledgement, single.json());
        else assert.equal(single.json().error.code, 'MUTATION_CANCELLED');
      }
      assert.deepEqual((await resolve(body)).json(), outcome);
    }
  });

  it('fails closed for malformed root/item acknowledgements and rolls back earlier fences', async () => {
    const body = batch();
    const created = await send('POST', '/v1/transactions', body.items[1]); assert.equal(created.statusCode, 201);
    const ack = created.json();
    for (const reference of ['null', '{}', '{', JSON.stringify({ version: 1, statusCode: 201, body: { transaction: { ...ack.transaction, amount: 9 } } })]) {
      await db.update(idempotencyRecords).set({ responseReference: reference }).where(eq(idempotencyRecords.clientMutationId, body.items[1].clientMutationId));
      assert.equal((await resolve(body)).statusCode, 500);
      assert.equal((await db.select().from(idempotencyRecords).where(eq(idempotencyRecords.clientMutationId, body.items[0].clientMutationId))).length, 0);
    }
    await db.update(idempotencyRecords).set({ responseReference: JSON.stringify({ version: 1, statusCode: 201, body: ack }) }).where(eq(idempotencyRecords.clientMutationId, body.items[1].clientMutationId));
    const stopped = await resolve(body); assert.equal(stopped.statusCode, 200);
    const badResult = { ...stopped.json(), items: [] };
    await db.update(idempotencyRecords).set({ responseReference: JSON.stringify({ version: 1, statusCode: 409, body: { error: { code: 'MUTATION_CANCELLED', message: 'cancelled' }, resolution: badResult } }) }).where(eq(idempotencyRecords.clientMutationId, body.clientMutationId));
    assert.equal((await resolve(body)).statusCode, 500);
  });
});
