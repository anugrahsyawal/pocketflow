import { test, before, beforeEach, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { createTestApp } from '../helpers/testApp.js';
import { getTestDb, resetTestDatabase, createTestOwner, closeTestDb, TestDatabase } from '../helpers/testDb.js';
import * as schema from '../../src/db/schema.js';

describe('Group 5: Mutation Idempotency & Concurrency', () => {
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

  test('IDEM-01: Identical setup request replay with same clientMutationId returns original 200 OK response with 0 duplicate entities', async () => {
    const owner = await createTestOwner(db);
    const clientMutationId = crypto.randomUUID();
    const payload = {
      clientMutationId,
      selectedPocketKeys: ['food-groceries', 'transportation'],
    };

    const res1 = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload,
    });
    assert.equal(res1.statusCode, 200);

    const res2 = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload,
    });
    assert.equal(res2.statusCode, 200);
    assert.deepEqual(res1.json(), res2.json());

    const pocketRows = await db.select().from(schema.pockets).where(eq(schema.pockets.userId, owner.userId));
    assert.equal(pocketRows.length, 2);
  });

  test('IDEM-02: Setup request retry after completion with NEW clientMutationId returns 409 SETUP_ALREADY_COMPLETED', async () => {
    const owner = await createTestOwner(db);

    await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        selectedPocketKeys: ['food-groceries'],
      },
    });

    const retryRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        selectedPocketKeys: ['food-groceries', 'transportation'],
      },
    });
    assert.equal(retryRes.statusCode, 409);
    assert.equal(retryRes.json().error.code, 'SETUP_ALREADY_COMPLETED');
  });

  test('IDEM-03: Standalone valid POST /v1/categories creation returns 201 Created', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries'] },
    });
    const foodId = setupRes.json().summary.templateKeyToIdMap['food-groceries'];

    const catRes = await app.inject({
      method: 'POST',
      url: '/v1/categories',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), pocketId: foodId, name: 'Snacks', emoji: '🍿' },
    });
    assert.equal(catRes.statusCode, 201);
    assert.equal(catRes.json().category.name, 'Snacks');
  });

  test('IDEM-04: Identical replay of POST /v1/categories with same clientMutationId returns 201 Created with original category object', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries'] },
    });
    const foodId = setupRes.json().summary.templateKeyToIdMap['food-groceries'];
    const clientMutationId = crypto.randomUUID();
    const payload = { clientMutationId, pocketId: foodId, name: 'Snacks', emoji: '🍿' };

    const res1 = await app.inject({
      method: 'POST',
      url: '/v1/categories',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload,
    });
    assert.equal(res1.statusCode, 201);

    const res2 = await app.inject({
      method: 'POST',
      url: '/v1/categories',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload,
    });
    assert.equal(res2.statusCode, 201);
    assert.deepEqual(res1.json(), res2.json());
  });

  test('IDEM-05: POST /v1/categories with reused clientMutationId and different payload returns 409 IDEMPOTENCY_CONFLICT', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries'] },
    });
    const foodId = setupRes.json().summary.templateKeyToIdMap['food-groceries'];
    const clientMutationId = crypto.randomUUID();

    await app.inject({
      method: 'POST',
      url: '/v1/categories',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId, pocketId: foodId, name: 'Snacks', emoji: '🍿' },
    });

    const resDiff = await app.inject({
      method: 'POST',
      url: '/v1/categories',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId, pocketId: foodId, name: 'Other Snacks', emoji: '🍬' },
    });
    assert.equal(resDiff.statusCode, 409);
    assert.equal(resDiff.json().error.code, 'IDEMPOTENCY_CONFLICT');
  });

  test('IDEM-06: Cross-route clientMutationId reuse returns 409 IDEMPOTENCY_CONFLICT', async () => {
    const owner = await createTestOwner(db);
    const sharedMutationId = crypto.randomUUID();

    await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: sharedMutationId, selectedPocketKeys: ['food-groceries'] },
    });

    const catRes = await app.inject({
      method: 'POST',
      url: '/v1/categories',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: sharedMutationId, pocketId: crypto.randomUUID(), name: 'Test', emoji: '⭐' },
    });
    assert.equal(catRes.statusCode, 409);
    assert.equal(catRes.json().error.code, 'IDEMPOTENCY_CONFLICT');
  });

  test('IDEM-07: Concurrent setup requests with IDENTICAL mutation IDs replay one committed 200 OK response', async () => {
    const owner = await createTestOwner(db);
    const clientMutationId = crypto.randomUUID();
    const payload = {
      clientMutationId,
      selectedPocketKeys: ['food-groceries', 'transportation'],
    };

    const [res1, res2] = await Promise.all([
      app.inject({
        method: 'PUT',
        url: '/v1/setup',
        headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
        payload,
      }),
      app.inject({
        method: 'PUT',
        url: '/v1/setup',
        headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
        payload,
      }),
    ]);

    assert.equal(res1.statusCode, 200);
    assert.equal(res2.statusCode, 200);
    assert.deepEqual(res1.json(), res2.json());
  });

  test('IDEM-08: Concurrent setup requests with DIFFERENT mutation IDs yield 1x 200 OK and 1x 409 SETUP_ALREADY_COMPLETED', async () => {
    const owner = await createTestOwner(db);

    const [res1, res2] = await Promise.all([
      app.inject({
        method: 'PUT',
        url: '/v1/setup',
        headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
        payload: {
          clientMutationId: crypto.randomUUID(),
          selectedPocketKeys: ['food-groceries'],
        },
      }),
      app.inject({
        method: 'PUT',
        url: '/v1/setup',
        headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
        payload: {
          clientMutationId: crypto.randomUUID(),
          selectedPocketKeys: ['food-groceries', 'transportation'],
        },
      }),
    ]);

    const statusCodes = [res1.statusCode, res2.statusCode].sort();
    assert.deepEqual(statusCodes, [200, 409]);
  });

  test('IDEM-09: idempotency_records.expires_at is written as NULL for indefinite retention', async () => {
    const owner = await createTestOwner(db);
    const clientMutationId = crypto.randomUUID();
    await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId, selectedPocketKeys: ['food-groceries'] },
    });

    const records = await db
      .select()
      .from(schema.idempotencyRecords)
      .where(
        eq(schema.idempotencyRecords.clientMutationId, clientMutationId)
      );
    assert.equal(records.length, 1);
    assert.equal(records[0].expiresAt, null);
  });
});
