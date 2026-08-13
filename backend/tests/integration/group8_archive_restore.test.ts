import { test, before, beforeEach, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { createTestApp } from '../helpers/testApp.js';
import { getTestDb, resetTestDatabase, createTestOwner, closeTestDb, TestDatabase } from '../helpers/testDb.js';
import * as schema from '../../src/db/schema.js';

describe('Group 8: Budget Owner Fallback, Archive & Restore Rules', () => {
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

  test('ARCH-01: Archiving a pocket sets isArchived: true and isActive: false', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['personal-care'] },
    });
    const pocketId = setupRes.json().summary.templateKeyToIdMap['personal-care'];

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${pocketId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, isArchived: true },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().pocket.isArchived, true);
    assert.equal(res.json().pocket.isActive, false);
  });

  test('ARCH-02: Restoring an archived pocket sets isArchived: false and isActive: true', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['personal-care'] },
    });
    const pocketId = setupRes.json().summary.templateKeyToIdMap['personal-care'];

    await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${pocketId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, isArchived: true },
    });

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${pocketId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 2, isArchived: false },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().pocket.isArchived, false);
    assert.equal(res.json().pocket.isActive, true);
  });

  test('ARCH-03: Archiving target pocket referenced as budget owner by active Cash pocket returns 422 INVALID_REFERENCE', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries', 'cash'], cashOpeningBalance: 100000 },
    });
    const foodId = setupRes.json().summary.templateKeyToIdMap['food-groceries'];

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${foodId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, isArchived: true },
    });
    assert.equal(res.statusCode, 422);
    assert.equal(res.json().error.code, 'INVALID_REFERENCE');
  });

  test('ARCH-04: Archiving Cash pocket retains budgetOwnerPocketId in database', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries', 'cash'], cashOpeningBalance: 100000 },
    });
    const foodId = setupRes.json().summary.templateKeyToIdMap['food-groceries'];
    const cashId = setupRes.json().summary.templateKeyToIdMap['cash'];

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${cashId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, isArchived: true },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().pocket.budgetOwnerPocketId, foodId);
  });

  test('ARCH-05: Restoring Cash pocket when target budget owner is archived returns 422 INVALID_REFERENCE', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries', 'cash'], cashOpeningBalance: 100000 },
    });
    const foodId = setupRes.json().summary.templateKeyToIdMap['food-groceries'];
    const cashId = setupRes.json().summary.templateKeyToIdMap['cash'];

    // Archive Cash
    await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${cashId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, isArchived: true },
    });

    // Archive Food (now permitted since Cash is archived)
    await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${foodId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, isArchived: true },
    });

    // Restore Cash -> fails because Food is archived
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${cashId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 2, isArchived: false },
    });
    assert.equal(res.statusCode, 422);
    assert.equal(res.json().error.code, 'INVALID_REFERENCE');
  });

  test('ARCH-06: Restoring Cash pocket while providing valid active replacement budgetOwnerPocketId succeeds', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries', 'cash', 'personal-care'], cashOpeningBalance: 100000 },
    });
    const foodId = setupRes.json().summary.templateKeyToIdMap['food-groceries'];
    const cashId = setupRes.json().summary.templateKeyToIdMap['cash'];
    const careId = setupRes.json().summary.templateKeyToIdMap['personal-care'];

    await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${cashId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, isArchived: true },
    });

    await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${foodId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, isArchived: true },
    });

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${cashId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 2, isArchived: false, budgetOwnerPocketId: careId },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().pocket.isArchived, false);
    assert.equal(res.json().pocket.budgetOwnerPocketId, careId);
  });

  test('ARCH-07: Restoring Cash pocket with retained null budgetOwnerPocketId mapping succeeds using payment pocket fallback', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries', 'cash'], cashOpeningBalance: 100000 },
    });
    const cashId = setupRes.json().summary.templateKeyToIdMap['cash'];

    // Clear budgetOwnerPocketId to null on Cash
    await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${cashId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, budgetOwnerPocketId: null },
    });

    // Archive Cash
    await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${cashId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 2, isArchived: true },
    });

    // Restore Cash with retained null
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${cashId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 3, isArchived: false },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().pocket.budgetOwnerPocketId, null);
  });

  test('ARCH-08: Restoring Cash pocket while providing budgetOwnerPocketId: null in replacement payload succeeds', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries', 'cash'], cashOpeningBalance: 100000 },
    });
    const foodId = setupRes.json().summary.templateKeyToIdMap['food-groceries'];
    const cashId = setupRes.json().summary.templateKeyToIdMap['cash'];

    await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${cashId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, isArchived: true },
    });

    await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${foodId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, isArchived: true },
    });

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${cashId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 2, isArchived: false, budgetOwnerPocketId: null },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().pocket.budgetOwnerPocketId, null);
  });

  test('ARCH-09: Active Cash pocket clearing budgetOwnerPocketId: null succeeds using payment pocket fallback', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries', 'cash'], cashOpeningBalance: 100000 },
    });
    const cashId = setupRes.json().summary.templateKeyToIdMap['cash'];

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${cashId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, budgetOwnerPocketId: null },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().pocket.budgetOwnerPocketId, null);
  });

  test('ARCH-10: Setting budgetOwnerPocketId on a non-Cash/NFC pocket returns 422 INVALID_REFERENCE', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries', 'personal-care'] },
    });
    const foodId = setupRes.json().summary.templateKeyToIdMap['food-groceries'];
    const careId = setupRes.json().summary.templateKeyToIdMap['personal-care'];

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${foodId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, budgetOwnerPocketId: careId },
    });
    assert.equal(res.statusCode, 422);
    assert.equal(res.json().error.code, 'INVALID_REFERENCE');
  });

  test('ARCH-11: POST /v1/categories under an archived parent pocket returns 422 INVALID_REFERENCE', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['personal-care'] },
    });
    const careId = setupRes.json().summary.templateKeyToIdMap['personal-care'];

    await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${careId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, isArchived: true },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/categories',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), pocketId: careId, name: 'New Cat', emoji: '💈' },
    });
    assert.equal(res.statusCode, 422);
    assert.equal(res.json().error.code, 'INVALID_REFERENCE');
  });

  test('ARCH-12: Restoring a category under an archived parent pocket returns 422 INVALID_REFERENCE', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['personal-care'] },
    });
    const careId = setupRes.json().summary.templateKeyToIdMap['personal-care'];

    const postRes = await app.inject({
      method: 'POST',
      url: '/v1/categories',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), pocketId: careId, name: 'Haircut', emoji: '💈' },
    });
    const catId = postRes.json().category.id;

    // Archive category
    await app.inject({
      method: 'PATCH',
      url: `/v1/categories/${catId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, isArchived: true },
    });

    // Archive parent pocket
    await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${careId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, isArchived: true },
    });

    // Attempt restoring category under archived parent -> 422
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/categories/${catId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 2, isArchived: false },
    });
    assert.equal(res.statusCode, 422);
    assert.equal(res.json().error.code, 'INVALID_REFERENCE');
  });

  test('ARCH-13: Archiving a category sets isArchived: true and isActive: false', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['personal-care'] },
    });
    const careId = setupRes.json().summary.templateKeyToIdMap['personal-care'];

    const postRes = await app.inject({
      method: 'POST',
      url: '/v1/categories',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), pocketId: careId, name: 'Spa', emoji: '🧘' },
    });
    const catId = postRes.json().category.id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/categories/${catId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, isArchived: true },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().category.isArchived, true);
    assert.equal(res.json().category.isActive, false);
  });

  test('ARCH-14: Restoring a category sets isArchived: false and isActive: true', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['personal-care'] },
    });
    const careId = setupRes.json().summary.templateKeyToIdMap['personal-care'];

    const postRes = await app.inject({
      method: 'POST',
      url: '/v1/categories',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), pocketId: careId, name: 'Spa', emoji: '🧘' },
    });
    const catId = postRes.json().category.id;

    await app.inject({
      method: 'PATCH',
      url: `/v1/categories/${catId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, isArchived: true },
    });

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/categories/${catId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 2, isArchived: false },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().category.isArchived, false);
    assert.equal(res.json().category.isActive, true);
  });

  test('ARCH-DRIFT-01: Target pocket with isActive=false but isArchived=false (drift state) is rejected with 422', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries', 'cash', 'personal-care'], cashOpeningBalance: 100000 },
    });
    const cashId = setupRes.json().summary.templateKeyToIdMap['cash'];
    const careId = setupRes.json().summary.templateKeyToIdMap['personal-care'];

    // Manually force personal-care into inactive drift state (isActive = false, isArchived = false) in DB
    await db.update(schema.pockets).set({ isActive: false }).where(eq(schema.pockets.id, careId));

    // Attempt setting cash budgetOwnerPocketId to inactive care pocket -> 422
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${cashId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, budgetOwnerPocketId: careId },
    });
    assert.equal(res.statusCode, 422);
    assert.equal(res.json().error.code, 'INVALID_REFERENCE');
  });

  test('ARCH-DRIFT-02: Active non-Cash/NFC drift row pointing to target DOES NOT block archiving target pocket', async () => {
    const owner = await createTestOwner(db);
    const setupRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), selectedPocketKeys: ['food-groceries', 'personal-care'] },
    });
    const foodId = setupRes.json().summary.templateKeyToIdMap['food-groceries'];
    const careId = setupRes.json().summary.templateKeyToIdMap['personal-care'];

    // Manually set budgetOwnerPocketId on personal-care in DB (drift state: non-cash pocket pointing to target)
    await db.update(schema.pockets).set({ budgetOwnerPocketId: foodId }).where(eq(schema.pockets.id, careId));

    // Attempt archiving food-groceries -> DOES NOT block because personal-care is not Cash or NFC Card!
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/pockets/${foodId}`,
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: { clientMutationId: crypto.randomUUID(), expectedRevision: 1, isArchived: true },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().pocket.isArchived, true);
  });
});
