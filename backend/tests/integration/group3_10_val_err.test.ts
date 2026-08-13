import { test, before, beforeEach, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { createTestApp } from '../helpers/testApp.js';
import { getTestDb, resetTestDatabase, createTestOwner, closeTestDb, TestDatabase } from '../helpers/testDb.js';

describe('Group 3 & 10: Input Validation, Parameter & Path Parsing and Error Normalization', () => {
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

  // Group 3: Input Validation
  test('VAL-01: Omitted includeArchived query parameter defaults to false', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/pockets',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { pockets: [] });
  });

  test('VAL-02: Explicit includeArchived=true parses valid boolean string', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/pockets?includeArchived=true',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { pockets: [] });
  });

  test('VAL-03: Unknown query parameter GET /v1/pockets?unknownParam=123 returns 400 INVALID_INPUT', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/pockets?unknownParam=123',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.code, 'INVALID_INPUT');
  });

  test('VAL-04: Unknown query parameter GET /v1/categories?foo=bar returns 400 INVALID_INPUT', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/categories?foo=bar',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.code, 'INVALID_INPUT');
  });

  test('VAL-05: Unknown body property in PUT /v1/setup returns 400 INVALID_INPUT', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries'], extraField: 123 },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.code, 'INVALID_INPUT');
  });

  test('VAL-06: Unknown body property in POST /v1/categories returns 400 INVALID_INPUT', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/categories',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), pocketId: crypto.randomUUID(), name: 'Cat', emoji: '☕', bogus: true },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.code, 'INVALID_INPUT');
  });

  test('VAL-07: Unknown body property in PATCH /v1/pockets/:id returns 400 INVALID_INPUT', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${crypto.randomUUID()}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, name: 'Food', invalidProp: 'bad' },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.code, 'INVALID_INPUT');
  });

  test('VAL-08: Unknown body property in PATCH /v1/categories/:id returns 400 INVALID_INPUT', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/categories/${crypto.randomUUID()}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, name: 'Cat', fooBar: 1 },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.code, 'INVALID_INPUT');
  });

  test('VAL-09: Invalid UUID format path param GET /v1/pockets/invalid-uuid returns 400 INVALID_INPUT', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/pockets/invalid-uuid',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.code, 'INVALID_INPUT');
  });

  test('VAL-10: Invalid UUID format path param PATCH /v1/pockets/not-a-uuid returns 400 INVALID_INPUT', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/pockets/not-a-uuid',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, name: 'New' },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.code, 'INVALID_INPUT');
  });

  test('VAL-11: Invalid UUID format path param PATCH /v1/categories/12345 returns 400 INVALID_INPUT', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/categories/12345',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, name: 'New' },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.code, 'INVALID_INPUT');
  });

  test('VAL-12: Syntactically valid non-v4 UUID string (e.g. v1 UUID) returns 400 INVALID_INPUT', async () => {
    const owner = await createTestOwner(db);
    const v1Uuid = 'c7e2b18f-3a4b-11ed-a261-0242ac120002'; // UUID v1
    const res = await app.inject({
      method: 'GET',
      url: `/v1/pockets/${v1Uuid}`,
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.code, 'INVALID_INPUT');
  });

  test('VAL-13: Empty or whitespace-only string input for name or emoji returns 400 INVALID_INPUT', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/categories',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), pocketId: crypto.randomUUID(), name: '   ', emoji: '☕' },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.code, 'INVALID_INPUT');
  });

  // Group 10: Error Envelope & Validation Normalization
  test('ERR-01: Standard error responses omit details property from JSON envelope', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/setup' });
    assert.equal(res.statusCode, 401);
    const body = res.json();
    assert.equal('details' in body.error, false);
  });

  test('ERR-02: Fastify validation errors are normalized to code INVALID_INPUT, statusCode 400', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: 'not-a-uuid', selectedPocketKeys: [] },
    });
    assert.equal(res.statusCode, 400);
    const body = res.json();
    assert.equal(body.error.code, 'INVALID_INPUT');
    assert.equal(body.error.statusCode, 400);
  });

  test('ERR-03: error.statusCode matches HTTP response header status code in error responses', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/pockets' });
    assert.equal(res.statusCode, res.json().error.statusCode);
  });

  test('ERR-04: Invalid UUID path parameters return 400 Bad Request INVALID_INPUT', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/pockets/abc-xyz',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.code, 'INVALID_INPUT');
  });

  test('ERR-05: Unknown body properties return 400 Bad Request INVALID_INPUT', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/categories',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), pocketId: crypto.randomUUID(), name: 'Cat', emoji: '☕', unknown: 123 },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.code, 'INVALID_INPUT');
  });
});
