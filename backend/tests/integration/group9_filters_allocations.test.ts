import { test, before, beforeEach, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { createTestApp } from '../helpers/testApp.js';
import { getTestDb, resetTestDatabase, createTestOwner, closeTestDb, TestDatabase } from '../helpers/testDb.js';

describe('Group 9: Filters, Allocations & Ordering', () => {
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

  test('FIL-01: GET /v1/pockets defaults (includeArchived=false) return active pockets ordered by created_at ASC, name ASC', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        selectedPocketKeys: ['food-groceries', 'cash', 'personal-care'],
        cashOpeningBalance: 100000,
      },
    });

    const careId = setupRes.json().summary.templateKeyToIdMap['personal-care'];

    // Archive Personal Care
    await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${careId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, isArchived: true },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/v1/pockets',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(res.statusCode, 200);
    const pockets = res.json().pockets;
    assert.equal(pockets.length, 2);
    assert.equal(pockets.some((p: any) => p.id === careId), false);
  });

  test('FIL-02: GET /v1/pockets?includeArchived=true returns both active and archived pockets', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        selectedPocketKeys: ['food-groceries', 'personal-care'],
      },
    });
    const careId = setupRes.json().summary.templateKeyToIdMap['personal-care'];

    await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${careId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, isArchived: true },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/v1/pockets?includeArchived=true',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(res.statusCode, 200);
    const pockets = res.json().pockets;
    assert.equal(pockets.length, 2);
    assert.ok(pockets.some((p: any) => p.id === careId));
  });

  test('FIL-03: GET /v1/categories defaults return active categories ordered by pocket_id ASC, is_default DESC, created_at ASC, name ASC', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        selectedPocketKeys: ['food-groceries', 'personal-care'],
      },
    });
    const foodId = setupRes.json().summary.templateKeyToIdMap['food-groceries'];

    const customRes = await app.inject({
      method: 'POST',
      url: '/v1/categories',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), pocketId: foodId, name: 'AAA Custom Cat', emoji: '🌟' },
    });
    const customCatId = customRes.json().category.id;

    await app.inject({
      method: 'PATCH',
      url: `/v1/categories/${customCatId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, isArchived: true },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/v1/categories',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(res.statusCode, 200);
    const cats = res.json().categories;
    assert.equal(cats.length, 15);
    assert.equal(cats.some((c: any) => c.id === customCatId), false);
  });

  test('FIL-04: GET /v1/categories?pocketId=<UUID> returns categories filtered by parent pocketId', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        selectedPocketKeys: ['food-groceries', 'personal-care'],
      },
    });
    const foodId = setupRes.json().summary.templateKeyToIdMap['food-groceries'];

    const res = await app.inject({
      method: 'GET',
      url: `/v1/categories?pocketId=${foodId}`,
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(res.statusCode, 200);
    const cats = res.json().categories;
    assert.equal(cats.length, 9);
    for (const c of cats) {
      assert.equal(c.pocketId, foodId);
    }
  });

  test('FIL-05: GET /v1/categories?includeArchived=true returns active and archived categories', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        selectedPocketKeys: ['food-groceries'],
      },
    });
    const foodId = setupRes.json().summary.templateKeyToIdMap['food-groceries'];

    const customRes = await app.inject({
      method: 'POST',
      url: '/v1/categories',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), pocketId: foodId, name: 'AAA Custom Cat', emoji: '🌟' },
    });
    const customCatId = customRes.json().category.id;

    await app.inject({
      method: 'PATCH',
      url: `/v1/categories/${customCatId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, isArchived: true },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/v1/categories?pocketId=${foodId}&includeArchived=true`,
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(res.statusCode, 200);
    const cats = res.json().categories;
    assert.equal(cats.length, 10);
    assert.ok(cats.some((c: any) => c.id === customCatId));
  });

  test('ALLOC-01: Allocated pocket in GET /v1/pockets returns currentPeriodAllocation sub-object with period details and allocated amount', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        selectedPocketKeys: ['food-groceries'],
      },
    });
    const foodId = setupRes.json().summary.templateKeyToIdMap['food-groceries'];

    const res = await app.inject({
      method: 'GET',
      url: `/v1/pockets/${foodId}`,
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(res.statusCode, 200);
    const pocket = res.json().pocket;
    assert.ok(pocket.currentPeriodAllocation);
    assert.equal(pocket.currentPeriodAllocation.allocatedAmount, 1300000);
  });

  test('ALLOC-02: Unallocated pocket in GET /v1/pockets returns currentPeriodAllocation: null', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        selectedPocketKeys: ['food-groceries', 'cash'],
        cashOpeningBalance: 100000,
      },
    });
    const cashId = setupRes.json().summary.templateKeyToIdMap['cash'];

    const res = await app.inject({
      method: 'GET',
      url: `/v1/pockets/${cashId}`,
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().pocket.currentPeriodAllocation, null);
  });
});
