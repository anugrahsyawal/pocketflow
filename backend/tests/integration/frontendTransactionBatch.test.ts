import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { SessionClient } from '../../../frontend/src/lib/api/sessionClient.js';
import { type TransactionBatchRequest, snapshotBatchRequest } from '../../../frontend/src/lib/api/transactionBatch.js';
import { createTestApp } from '../helpers/testApp.js';
import { getTestDb, resetTestDatabase, createTestOwner, closeTestDb } from '../helpers/testDb.js';
import { seedMasterData } from '../helpers/masterDataFixture.js';

describe('Connected batch transport', () => {
  let db: Awaited<ReturnType<typeof getTestDb>>, app: Awaited<ReturnType<typeof createTestApp>>, address: string;
  let owner: Awaited<ReturnType<typeof createTestOwner>>, ids: Awaited<ReturnType<typeof seedMasterData>>, client: SessionClient;
  let writes: { path: string; body: unknown }[], date: string;
  const transport: typeof fetch = (path, init) => {
    if (init?.method === 'POST' && String(path).includes('/transactions')) writes.push({ path: String(path), body: JSON.parse(String(init.body)) });
    return fetch(address + String(path), { ...init, headers: { ...init?.headers, cookie: owner.cookieHeader } });
  };
  const request = (): TransactionBatchRequest => ({ ownerId: owner.userId, body: { clientMutationId: randomUUID(), items: [1000, 2000].map(amount => ({ clientMutationId: randomUUID(), type: 'expense', amount, pocketId: ids.nfc.id, occurredOn: date, occurredAtLocalTime: '11:00', note: '  original  ', categoryId: null })) } });
  before(async () => { db = await getTestDb(); app = await createTestApp(); address = await app.listen({ host: '127.0.0.1', port: 0 }); });
  after(async () => { await app?.close(); await closeTestDb(); });
  beforeEach(async () => {
    await resetTestDatabase(db); owner = await createTestOwner(db); ids = await seedMasterData(db, owner.userId);
    writes = []; client = new SessionClient(transport); date = (await client.listTransactions()).transactions[0].occurredOn;
  });

  it('returns ordered original acknowledgements and preserves mixed stopped outcomes', async () => {
    const input = request(), ack = await client.createTransactionBatch(input);
    assert.deepEqual(ack.map(t => t.amount), [1000, 2000]); assert.equal(ack[0].note, 'original');
    assert.equal(ack[0].budgetPocketId, ids.transport.id);
    await client.editTransaction({ ownerId: owner.userId, transactionId: ack[0].id, transactionType: 'expense', clientMutationId: randomUUID(), expectedRevision: 1, changes: { note: 'later' } });
    assert.deepEqual(await client.createTransactionBatch(input), ack);
    assert.deepEqual(await client.resolveTransactionBatch(input), { status: 'committed', clientMutationId: input.body.clientMutationId, acknowledgement: { transactions: ack } });
    const mixed = request();
    const first = await transport('/v1/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': (await (await transport('/v1/auth/csrf')).json()).csrfToken }, body: JSON.stringify(mixed.body.items[0]) });
    assert.equal(first.status, 201); const original = await first.json();
    const result = await client.resolveTransactionBatch(mixed);
    assert.deepEqual(result, { status: 'stopped', clientMutationId: mixed.body.clientMutationId, items: [
      { status: 'committed', clientMutationId: mixed.body.items[0].clientMutationId, acknowledgement: original },
      { status: 'cancelled', clientMutationId: mixed.body.items[1].clientMutationId } ] });
    assert.deepEqual(await client.resolveTransactionBatch(mixed), result);
    await assert.rejects(client.createTransactionBatch(mixed), { code: 'MUTATION_CANCELLED' });
  });

  it('deep snapshots before owner preflight and retries only explicitly after a lost response', async () => {
    const input = request(), original = structuredClone(input); let lose = true;
    client = new SessionClient(async (path, init) => {
      if (String(path) === '/v1/me') { input.body.items[0].amount = 999; input.body.items.reverse(); input.body.clientMutationId = randomUUID(); }
      const response = await transport(path, init);
      if (String(path) === '/v1/transactions/batch' && lose) { lose = false; throw new Error('lost response'); }
      return response;
    });
    await assert.rejects(client.createTransactionBatch(input), { code: 'NETWORK_ERROR' }); assert.equal(writes.length, 1);
    const ack = await client.createTransactionBatch(original);
    assert.equal(writes.length, 2); assert.deepEqual(writes[0], writes[1]); assert.deepEqual(writes[0].body, original.body);
    assert.deepEqual(ack.map(t => t.amount), [1000, 2000]);
  });

  it('rejects invalid identities/fields before network and isolates owner before writes', async () => {
    const input = request();
    const badBodies = [{ ...input.body, items: [] }, { ...input.body, extra: true },
      { ...input.body, items: [input.body.items[0], input.body.items[0]] },
      { ...input.body, items: [{ ...input.body.items[0], clientMutationId: input.body.clientMutationId.toUpperCase() }] },
      { ...input.body, items: Array(2) },
      ...[{ type: 'income' }, { amount: 0 }, { amount: 1.1 }, { categoryId: undefined }, { note: undefined }, { note: 'x'.repeat(501) }, { budgetPocketId: ids.food.id }, { occurredOn: '2026-02-30' }, { occurredAtLocalTime: '24:00' }].map(change => ({ ...input.body, items: [{ ...input.body.items[0], ...change }] }))];
    for (const body of badBodies) {
      await assert.rejects(client.createTransactionBatch({ ...input, body } as any), { code: 'INVALID_INPUT' });
      await assert.rejects(client.resolveTransactionBatch({ ...input, body } as any), { code: 'INVALID_INPUT' });
    }
    const snapshot = snapshotBatchRequest(input); assert.deepEqual(snapshot, input); assert.notEqual(snapshot.body.items[0], input.body.items[0]);
    owner = await createTestOwner(db); await assert.rejects(client.createTransactionBatch(input), { code: 'OWNER_CHANGED' }); assert.equal(writes.length, 0);
  });

  it('bounds CSRF retry, rechecks owner and never retries business errors', async () => {
    const input = request(); let attempts = 0;
    client = new SessionClient(async (path, init) => {
      if (String(path) === '/v1/transactions/batch') { attempts++; if (attempts === 1) return new Response(JSON.stringify({ error: { code: 'INVALID_CSRF_TOKEN' } }), { status: 403 }); }
      return transport(path, init);
    });
    assert.equal((await client.createTransactionBatch(input)).length, 2); assert.equal(attempts, 2);
    attempts = 0;
    client = new SessionClient((path, init) => {
      if (String(path) === '/v1/transactions/batch') { attempts++; return Promise.resolve(new Response(JSON.stringify({ error: { code: 'INVALID_CSRF_TOKEN' } }), { status: 403 })); }
      return transport(path, init);
    });
    await assert.rejects(client.createTransactionBatch(request()), { code: 'INVALID_CSRF_TOKEN' }); assert.equal(attempts, 2);
    const insufficient = request(); insufficient.body.items[0].amount = 999999; writes = []; client = new SessionClient(transport);
    await assert.rejects(client.createTransactionBatch(insufficient), { code: 'INSUFFICIENT_FUNDS' }); assert.equal(writes.length, 1);
    assert.equal((await client.resolveTransactionBatch(insufficient)).status, 'stopped');
    await assert.rejects(client.createTransactionBatch(insufficient), { code: 'MUTATION_CANCELLED' });
  });

  it('rejects wrong, partial, reordered, duplicate or over-permissive acknowledgements', async () => {
    const input = request(), ack = await client.createTransactionBatch(input);
    const row = ack[0];
    const invalids = [null, {}, { transactions: ack, extra: true }, { transactions: [row] }, { transactions: [...ack].reverse() }, { transactions: [row, row] },
      ...[{ revision: 2 }, { amount: 7 }, { note: 'wrong' }, { budgetPocketId: null }, { pocketId: ids.food.id }, { ownerId: owner.userId }].map(change => ({ transactions: [{ ...row, ...change }, ack[1]] }))];
    for (const fake of invalids) {
      client = new SessionClient((path, init) => String(path) === '/v1/transactions/batch' ? Promise.resolve(new Response(JSON.stringify(fake), { status: 201 })) : transport(path, init));
      await assert.rejects(client.createTransactionBatch(input), { code: 'INVALID_RESPONSE' });
    }
    const cancelled = input.body.items.map(item => ({ clientMutationId: item.clientMutationId, status: 'cancelled' }));
    const stopped = { status: 'stopped', clientMutationId: input.body.clientMutationId, items: cancelled };
    for (const fake of [{ ...stopped, status: 'cancelled' }, { ...stopped, clientMutationId: randomUUID() }, { ...stopped, items: [] },
      { ...stopped, items: [...cancelled].reverse() }, { ...stopped, items: [{ ...cancelled[0], acknowledgement: null }, cancelled[1]] },
      { ...stopped, extra: true }, { status: 'committed', clientMutationId: input.body.clientMutationId, acknowledgement: { transactions: ack }, items: cancelled }]) {
      client = new SessionClient((path, init) => String(path).endsWith('/resolve-attempt') ? Promise.resolve(new Response(JSON.stringify(fake), { status: 200 })) : transport(path, init));
      await assert.rejects(client.resolveTransactionBatch(input), { code: 'INVALID_RESPONSE' });
    }
  });
});
