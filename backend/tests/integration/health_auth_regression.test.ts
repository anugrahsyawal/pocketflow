import { test, before, beforeEach, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { createTestApp } from '../helpers/testApp.js';
import { getTestDb, resetTestDatabase, createTestOwner, closeTestDb, TestDatabase } from '../helpers/testDb.js';

describe('Health and Auth Endpoint Regression Checks', () => {
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

  test('GET /health returns 200 OK with status ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { status: 'ok', service: 'pocketflow-api' });
  });

  test('GET /v1/me returns owner info when authenticated', async () => {
    const owner = await createTestOwner(db, 'me.test@example.com');
    const res = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.user.email, 'me.test@example.com');
    assert.equal(body.user.displayName, 'Test Owner');
  });

  test('GET /v1/auth/csrf returns csrf token when authenticated', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/csrf',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.ok(body.csrfToken);
  });
});
