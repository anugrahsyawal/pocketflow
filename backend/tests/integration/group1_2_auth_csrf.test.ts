import { test, before, beforeEach, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { createTestApp } from '../helpers/testApp.js';
import { getTestDb, resetTestDatabase, createTestOwner, closeTestDb, TestDatabase } from '../helpers/testDb.js';

describe('Group 1 & 2: Authentication and CSRF Security Checks', () => {
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

  // Group 1: Authentication Security Checks
  test('AUTH-01: Unauthenticated GET /v1/setup returns 401 UNAUTHENTICATED', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/setup' });
    assert.equal(res.statusCode, 401);
    const body = res.json();
    assert.equal(body.error.code, 'UNAUTHENTICATED');
    assert.equal(body.error.statusCode, 401);
  });

  test('AUTH-02: Unauthenticated PUT /v1/setup returns 401 UNAUTHENTICATED', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries'] },
    });
    assert.equal(res.statusCode, 401);
    const body = res.json();
    assert.equal(body.error.code, 'UNAUTHENTICATED');
  });

  test('AUTH-03: Unauthenticated GET /v1/pockets returns 401 UNAUTHENTICATED', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/pockets' });
    assert.equal(res.statusCode, 401);
    const body = res.json();
    assert.equal(body.error.code, 'UNAUTHENTICATED');
  });

  test('AUTH-04: Unauthenticated GET /v1/pockets/:id returns 401 UNAUTHENTICATED', async () => {
    const res = await app.inject({ method: 'GET', url: `/v1/pockets/${crypto.randomUUID()}` });
    assert.equal(res.statusCode, 401);
    const body = res.json();
    assert.equal(body.error.code, 'UNAUTHENTICATED');
  });

  test('AUTH-05: Unauthenticated PATCH /v1/pockets/:id returns 401 UNAUTHENTICATED', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${crypto.randomUUID()}`,
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, name: 'New Name' },
    });
    assert.equal(res.statusCode, 401);
    const body = res.json();
    assert.equal(body.error.code, 'UNAUTHENTICATED');
  });

  test('AUTH-06: Unauthenticated GET /v1/categories returns 401 UNAUTHENTICATED', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/categories' });
    assert.equal(res.statusCode, 401);
    const body = res.json();
    assert.equal(body.error.code, 'UNAUTHENTICATED');
  });

  test('AUTH-07: Unauthenticated POST /v1/categories returns 401 UNAUTHENTICATED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/categories',
      payload: { clientMutationId: crypto.randomUUID(), pocketId: crypto.randomUUID(), name: 'Cat', emoji: '☕' },
    });
    assert.equal(res.statusCode, 401);
    const body = res.json();
    assert.equal(body.error.code, 'UNAUTHENTICATED');
  });

  test('AUTH-08: Unauthenticated PATCH /v1/categories/:id returns 401 UNAUTHENTICATED', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/categories/${crypto.randomUUID()}`,
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, name: 'Cat' },
    });
    assert.equal(res.statusCode, 401);
    const body = res.json();
    assert.equal(body.error.code, 'UNAUTHENTICATED');
  });

  // Group 2: CSRF Security Checks
  test('CSRF-01: PUT /v1/setup with missing X-CSRF-Token returns 403 INVALID_CSRF_TOKEN', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries'] },
    });
    assert.equal(res.statusCode, 403);
    const body = res.json();
    assert.equal(body.error.code, 'INVALID_CSRF_TOKEN');
  });

  test('CSRF-02: PUT /v1/setup with invalid X-CSRF-Token returns 403 INVALID_CSRF_TOKEN', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': 'wrong-csrf-token' },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries'] },
    });
    assert.equal(res.statusCode, 403);
    const body = res.json();
    assert.equal(body.error.code, 'INVALID_CSRF_TOKEN');
  });

  test('CSRF-03: POST /v1/categories with missing X-CSRF-Token returns 403 INVALID_CSRF_TOKEN', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/categories',
      headers: { cookie: owner.cookieHeader },
      payload: { clientMutationId: crypto.randomUUID(), pocketId: crypto.randomUUID(), name: 'Cat', emoji: '☕' },
    });
    assert.equal(res.statusCode, 403);
    const body = res.json();
    assert.equal(body.error.code, 'INVALID_CSRF_TOKEN');
  });

  test('CSRF-04: POST /v1/categories with invalid X-CSRF-Token returns 403 INVALID_CSRF_TOKEN', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/categories',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': 'invalid-token' },
      payload: { clientMutationId: crypto.randomUUID(), pocketId: crypto.randomUUID(), name: 'Cat', emoji: '☕' },
    });
    assert.equal(res.statusCode, 403);
    const body = res.json();
    assert.equal(body.error.code, 'INVALID_CSRF_TOKEN');
  });

  test('CSRF-05: PATCH /v1/pockets/:id with missing X-CSRF-Token returns 403 INVALID_CSRF_TOKEN', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${crypto.randomUUID()}`,
      headers: { cookie: owner.cookieHeader },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, name: 'Name' },
    });
    assert.equal(res.statusCode, 403);
    const body = res.json();
    assert.equal(body.error.code, 'INVALID_CSRF_TOKEN');
  });

  test('CSRF-06: PATCH /v1/pockets/:id with invalid X-CSRF-Token returns 403 INVALID_CSRF_TOKEN', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${crypto.randomUUID()}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': 'invalid-token' },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, name: 'Name' },
    });
    assert.equal(res.statusCode, 403);
    const body = res.json();
    assert.equal(body.error.code, 'INVALID_CSRF_TOKEN');
  });

  test('CSRF-07: PATCH /v1/categories/:id with missing X-CSRF-Token returns 403 INVALID_CSRF_TOKEN', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/categories/${crypto.randomUUID()}`,
      headers: { cookie: owner.cookieHeader },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, name: 'Name' },
    });
    assert.equal(res.statusCode, 403);
    const body = res.json();
    assert.equal(body.error.code, 'INVALID_CSRF_TOKEN');
  });

  test('CSRF-08: PATCH /v1/categories/:id with invalid X-CSRF-Token returns 403 INVALID_CSRF_TOKEN', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/categories/${crypto.randomUUID()}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': 'invalid-token' },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, name: 'Name' },
    });
    assert.equal(res.statusCode, 403);
    const body = res.json();
    assert.equal(body.error.code, 'INVALID_CSRF_TOKEN');
  });
});
