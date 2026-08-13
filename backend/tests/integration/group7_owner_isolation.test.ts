import { test, before, beforeEach, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { createTestApp } from '../helpers/testApp.js';
import { getTestDb, resetTestDatabase, createTestOwner, closeTestDb, TestDatabase } from '../helpers/testDb.js';

describe('Group 7: Owner Isolation & Access Privacy', () => {
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

  test('ISO-01: GET /v1/pockets/:id for another user\'s pocket returns 404 NOT_FOUND', async () => {
    const owner1 = await createTestOwner(db, 'user1@example.com');
    const owner2 = await createTestOwner(db, 'user2@example.com');

    const setup1 = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner1.cookieHeader, 'x-csrf-token': owner1.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries'] },
    });
    const p1Id = setup1.json().summary.templateKeyToIdMap['food-groceries'];

    const res = await app.inject({
      method: 'GET',
      url: `/v1/pockets/${p1Id}`,
      headers: { cookie: owner2.cookieHeader },
    });
    assert.equal(res.statusCode, 404);
    assert.equal(res.json().error.code, 'NOT_FOUND');
  });

  test('ISO-02: PATCH /v1/pockets/:id for another user\'s pocket returns 404 NOT_FOUND', async () => {
    const owner1 = await createTestOwner(db, 'user1@example.com');
    const owner2 = await createTestOwner(db, 'user2@example.com');

    const setup1 = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner1.cookieHeader, 'x-csrf-token': owner1.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries'] },
    });
    const p1Id = setup1.json().summary.templateKeyToIdMap['food-groceries'];

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${p1Id}`,
      headers: { cookie: owner2.cookieHeader, 'x-csrf-token': owner2.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, name: 'Hacked' },
    });
    assert.equal(res.statusCode, 404);
    assert.equal(res.json().error.code, 'NOT_FOUND');
  });

  test('ISO-03: POST /v1/categories referencing another user\'s pocket returns 422 INVALID_REFERENCE', async () => {
    const owner1 = await createTestOwner(db, 'user1@example.com');
    const owner2 = await createTestOwner(db, 'user2@example.com');

    const setup1 = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner1.cookieHeader, 'x-csrf-token': owner1.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries'] },
    });
    const p1Id = setup1.json().summary.templateKeyToIdMap['food-groceries'];

    const res = await app.inject({
      method: 'POST',
      url: '/v1/categories',
      headers: { cookie: owner2.cookieHeader, 'x-csrf-token': owner2.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), pocketId: p1Id, name: 'Evil Cat', emoji: '😈' },
    });
    assert.equal(res.statusCode, 422);
    assert.equal(res.json().error.code, 'INVALID_REFERENCE');
  });

  test('ISO-04: PATCH /v1/pockets/:id referencing another user\'s pocket as budgetOwnerPocketId returns 422 INVALID_REFERENCE', async () => {
    const owner1 = await createTestOwner(db, 'user1@example.com');
    const owner2 = await createTestOwner(db, 'user2@example.com');

    const setup1 = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner1.cookieHeader, 'x-csrf-token': owner1.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries'] },
    });
    const p1FoodId = setup1.json().summary.templateKeyToIdMap['food-groceries'];

    const setup2 = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner2.cookieHeader, 'x-csrf-token': owner2.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries', 'cash'], cashOpeningBalance: 100 },
    });
    const p2CashId = setup2.json().summary.templateKeyToIdMap['cash'];

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${p2CashId}`,
      headers: { cookie: owner2.cookieHeader, 'x-csrf-token': owner2.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, budgetOwnerPocketId: p1FoodId },
    });
    assert.equal(res.statusCode, 422);
    assert.equal(res.json().error.code, 'INVALID_REFERENCE');
  });

  test('ISO-05: PATCH /v1/categories/:id for another user\'s category returns 404 NOT_FOUND', async () => {
    const owner1 = await createTestOwner(db, 'user1@example.com');
    const owner2 = await createTestOwner(db, 'user2@example.com');

    const setup1 = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner1.cookieHeader, 'x-csrf-token': owner1.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries'] },
    });
    const p1Id = setup1.json().summary.templateKeyToIdMap['food-groceries'];

    const postRes = await app.inject({
      method: 'POST',
      url: '/v1/categories',
      headers: { cookie: owner1.cookieHeader, 'x-csrf-token': owner1.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), pocketId: p1Id, name: 'User 1 Cat', emoji: '☕' },
    });
    const cat1Id = postRes.json().category.id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/categories/${cat1Id}`,
      headers: { cookie: owner2.cookieHeader, 'x-csrf-token': owner2.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, name: 'Hacked Cat' },
    });
    assert.equal(res.statusCode, 404);
    assert.equal(res.json().error.code, 'NOT_FOUND');
  });

  test('ISO-06: GET /v1/categories?pocketId=<OTHER_USER_UUID> returns empty category list 200 OK', async () => {
    const owner1 = await createTestOwner(db, 'user1@example.com');
    const owner2 = await createTestOwner(db, 'user2@example.com');

    const setup1 = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner1.cookieHeader, 'x-csrf-token': owner1.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries'] },
    });
    const p1Id = setup1.json().summary.templateKeyToIdMap['food-groceries'];

    const res = await app.inject({
      method: 'GET',
      url: `/v1/categories?pocketId=${p1Id}`,
      headers: { cookie: owner2.cookieHeader },
    });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { categories: [] });
  });

  test('ISO-07: GET /v1/categories?pocketId=<NON_EXISTENT_UUID> returns empty category list 200 OK', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'GET',
      url: `/v1/categories?pocketId=${crypto.randomUUID()}`,
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { categories: [] });
  });

  test('ISO-08: Error messages for invalid cross-owner references NEVER leak target entity names or ownership status', async () => {
    const owner1 = await createTestOwner(db, 'user1@example.com');
    const owner2 = await createTestOwner(db, 'user2@example.com');

    const setup1 = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner1.cookieHeader, 'x-csrf-token': owner1.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries'] },
    });
    const p1Id = setup1.json().summary.templateKeyToIdMap['food-groceries'];

    const res = await app.inject({
      method: 'POST',
      url: '/v1/categories',
      headers: { cookie: owner2.cookieHeader, 'x-csrf-token': owner2.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), pocketId: p1Id, name: 'Cat', emoji: '☕' },
    });
    assert.equal(res.statusCode, 422);
    const msg = res.json().error.message;
    assert.equal(msg.includes('Food & Groceries'), false);
    assert.equal(msg.includes('user1'), false);
    assert.equal(msg.includes('owner'), false);
  });
});
