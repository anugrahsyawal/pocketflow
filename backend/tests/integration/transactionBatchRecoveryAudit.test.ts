import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createTestApp } from '../helpers/testApp.js';
import { getTestDb, resetTestDatabase, createTestOwner, closeTestDb } from '../helpers/testDb.js';
import { seedMasterData } from '../helpers/masterDataFixture.js';

// Characterization of existing endpoints, not approval of a batch resolution contract.
describe('Batch recovery audit (existing API)', () => {
  let db: Awaited<ReturnType<typeof getTestDb>>;
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let owner: Awaited<ReturnType<typeof createTestOwner>>;
  let ids: Awaited<ReturnType<typeof seedMasterData>>;
  let occurredOn: string;
  const send = async (method: 'POST' | 'PATCH', url: string, payload: unknown) => {
    const csrf = (await app.inject({ method: 'GET', url: '/v1/auth/csrf', headers: { cookie: owner.cookieHeader } })).json().csrfToken;
    return app.inject({ method, url, headers: { cookie: owner.cookieHeader, 'x-csrf-token': csrf }, payload });
  };
  const list = async () => (await app.inject({ method: 'GET', url: '/v1/transactions?type=expense', headers: { cookie: owner.cookieHeader } })).json().transactions;
  const item = (amount: number) => ({ clientMutationId: randomUUID(), type: 'expense', amount, pocketId: ids.nfc.id, occurredOn, occurredAtLocalTime: '11:00' });
  before(async () => { db = await getTestDb(); app = await createTestApp(); });
  after(async () => { await app?.close(); await closeTestDb(); });
  beforeEach(async () => {
    await resetTestDatabase(db);
    owner = await createTestOwner(db);
    ids = await seedMasterData(db, owner.userId);
    occurredOn = (await list())[0].occurredOn;
  });

  it('rolls back new items on insufficient balance, but identical retry can later commit', async () => {
    const original = await list();
    const body = { clientMutationId: randomUUID(), items: [item(50000), item(50000)] };
    const rejected = await send('POST', '/v1/transactions/batch', body);
    assert.equal(rejected.statusCode, 422);
    assert.equal(rejected.json().error.code, 'INSUFFICIENT_FUNDS');
    assert.deepEqual(await list(), original);
    const funded = await send('POST', '/v1/transactions', { ...item(20000), type: 'income' });
    assert.equal(funded.statusCode, 201);
    const accepted = await send('POST', '/v1/transactions/batch', body);
    assert.equal(accepted.statusCode, 201);
    assert.equal(accepted.json().transactions.length, 2);
    assert.equal((await list()).length, original.length + 2);
  });

  it('preserves a previously committed item when the enclosing batch fails', async () => {
    const first = item(10000);
    const created = await send('POST', '/v1/transactions', first);
    assert.equal(created.statusCode, 201);
    const beforeBatch = await list();
    const body = { clientMutationId: randomUUID(), items: [first, item(80000)] };
    assert.equal((await send('POST', '/v1/transactions/batch', body)).statusCode, 422);
    assert.deepEqual(await list(), beforeBatch);
    assert.equal((await send('POST', '/v1/transactions', { ...item(20000), type: 'income' })).statusCode, 201);
    const accepted = await send('POST', '/v1/transactions/batch', body);
    assert.equal(accepted.statusCode, 201);
    assert.deepEqual(accepted.json().transactions[0], created.json().transaction);
    assert.equal((await list()).length, beforeBatch.length + 1);
  });

  it('replays ordered original acknowledgements even after an item is edited', async () => {
    const body = { clientMutationId: randomUUID(), items: [item(5000), item(6000)] };
    const created = await send('POST', '/v1/transactions/batch', body);
    assert.equal(created.statusCode, 201);
    const first = created.json().transactions[0];
    const edited = await send('PATCH', `/v1/transactions/${first.id}`, { clientMutationId: randomUUID(), expectedRevision: 1, note: 'Later edit' });
    assert.equal(edited.statusCode, 200);
    const replay = await send('POST', '/v1/transactions/batch', body);
    assert.equal(replay.statusCode, 201);
    assert.deepEqual(replay.json(), created.json());
    assert.equal((await list()).find((entry: { id: string }) => entry.id === first.id).note, 'Later edit');
  });
});
