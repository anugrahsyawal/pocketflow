import { test, before, beforeEach, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { createTestApp } from '../helpers/testApp.js';
import { getTestDb, resetTestDatabase, createTestOwner, closeTestDb, TestDatabase } from '../helpers/testDb.js';

describe('Group 6: Revision Control & No-Op Payload Semantics', () => {
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

  test('REV-01: PATCH /v1/pockets/:id with matching expectedRevision increments revision by 1', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries'] },
    });
    const pocketId = setupRes.json().summary.templateKeyToIdMap['food-groceries'];

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${pocketId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
        name: 'Updated Food Name',
      },
    });
    assert.equal(res.statusCode, 200);
    const pocket = res.json().pocket;
    assert.equal(pocket.name, 'Updated Food Name');
    assert.equal(pocket.revision, 2);
  });

  test('REV-02: PATCH /v1/pockets/:id with stale expectedRevision returns 409 REVISION_CONFLICT', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries'] },
    });
    const pocketId = setupRes.json().summary.templateKeyToIdMap['food-groceries'];

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${pocketId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 99, // Stale revision
        name: 'Stale Update',
      },
    });
    assert.equal(res.statusCode, 409);
    assert.equal(res.json().error.code, 'REVISION_CONFLICT');
  });

  test('REV-03: PATCH /v1/pockets/:id with NO mutable fields returns 400 INVALID_INPUT', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries'] },
    });
    const pocketId = setupRes.json().summary.templateKeyToIdMap['food-groceries'];

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${pocketId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
      },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.code, 'INVALID_INPUT');
  });

  test('REV-04: PATCH /v1/pockets/:id with same values returns 200 OK with revision UNCHANGED', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries'] },
    });
    const pocketId = setupRes.json().summary.templateKeyToIdMap['food-groceries'];

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${pocketId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
        name: 'Food & Groceries', // Existing value
      },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().pocket.revision, 1); // Unchanged!
  });

  test('REV-05: Attempting to pass templateKey in PATCH /v1/pockets/:id returns 400 INVALID_INPUT', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries'] },
    });
    const pocketId = setupRes.json().summary.templateKeyToIdMap['food-groceries'];

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${pocketId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
        templateKey: 'cash', // Read-only!
      },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.code, 'INVALID_INPUT');
  });

  test('REV-06: PATCH /v1/categories/:id with matching expectedRevision updates category and increments revision', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries'] },
    });
    const foodPocketId = setupRes.json().summary.templateKeyToIdMap['food-groceries'];

    const postRes = await app.inject({
      method: 'POST',
      url: '/v1/categories',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), pocketId: foodPocketId, name: 'Orig', emoji: '☕' },
    });
    const catId = postRes.json().category.id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/categories/${catId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
        name: 'New Name',
      },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().category.name, 'New Name');
    assert.equal(res.json().category.revision, 2);
  });

  test('REV-07: PATCH /v1/categories/:id with stale expectedRevision returns 409 REVISION_CONFLICT', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries'] },
    });
    const foodPocketId = setupRes.json().summary.templateKeyToIdMap['food-groceries'];

    const postRes = await app.inject({
      method: 'POST',
      url: '/v1/categories',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), pocketId: foodPocketId, name: 'Orig', emoji: '☕' },
    });
    const catId = postRes.json().category.id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/categories/${catId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 5,
        name: 'Stale',
      },
    });
    assert.equal(res.statusCode, 409);
    assert.equal(res.json().error.code, 'REVISION_CONFLICT');
  });

  test('REV-08: PATCH /v1/categories/:id with NO mutable fields returns 400 INVALID_INPUT', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries'] },
    });
    const foodPocketId = setupRes.json().summary.templateKeyToIdMap['food-groceries'];

    const postRes = await app.inject({
      method: 'POST',
      url: '/v1/categories',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), pocketId: foodPocketId, name: 'Orig', emoji: '☕' },
    });
    const catId = postRes.json().category.id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/categories/${catId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
      },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.code, 'INVALID_INPUT');
  });

  test('REV-09: PATCH /v1/categories/:id with same existing values returns 200 OK with revision UNCHANGED', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries'] },
    });
    const foodPocketId = setupRes.json().summary.templateKeyToIdMap['food-groceries'];

    const postRes = await app.inject({
      method: 'POST',
      url: '/v1/categories',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), pocketId: foodPocketId, name: 'Orig', emoji: '☕' },
    });
    const catId = postRes.json().category.id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/categories/${catId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        expectedRevision: 1,
        name: 'Orig', // Same value
      },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().category.revision, 1);
  });
});
