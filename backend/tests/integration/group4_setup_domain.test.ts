import { test, before, beforeEach, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { sql, eq } from 'drizzle-orm';
import { createTestApp } from '../helpers/testApp.js';
import { getTestDb, resetTestDatabase, createTestOwner, closeTestDb, TestDatabase } from '../helpers/testDb.js';
import * as schema from '../../src/db/schema.js';
import { getCurrentAsiaJakartaPeriodDates, validateUuidV4 } from '../../src/lib/validation.js';

describe('Group 4: Setup Domain, Marker & Budget Period Boundaries', () => {
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

  test('SETUP-01: Period calculation for date <= 25th', async () => {
    const dates = getCurrentAsiaJakartaPeriodDates(new Date('2026-08-15T10:00:00Z'));
    assert.equal(dates.startDate, '2026-07-26');
    assert.equal(dates.endDate, '2026-08-25');
  });

  test('SETUP-02: Period calculation for date >= 26th', async () => {
    const dates = getCurrentAsiaJakartaPeriodDates(new Date('2026-08-26T10:00:00Z'));
    assert.equal(dates.startDate, '2026-08-26');
    assert.equal(dates.endDate, '2026-09-25');
  });

  test('SETUP-03: Rejection of budgetPeriodStartDay parameter returns 400 INVALID_INPUT', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        selectedPocketKeys: ['food-groceries'],
        budgetPeriodStartDay: 1,
      },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.code, 'INVALID_INPUT');
  });

  test('SETUP-04: Full 12-pocket selection setup creates 12 pockets, 10 allocations, Rp5,800,000, 44 categories', async () => {
    const owner = await createTestOwner(db);
    const all12Keys = [
      'food-groceries',
      'cash',
      'transportation',
      'nfc-card',
      'personal-care',
      'entertainment',
      'housing-utilities',
      'sinking-fund',
      'self-investment',
      'investments',
      'emergency-buffer',
      'term-deposit',
    ];
    const res = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        selectedPocketKeys: all12Keys,
        cashOpeningBalance: 200000,
        nfcOpeningBalance: 100000,
      },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.summary.pocketsCreated, 12);
    assert.equal(body.summary.categoriesCreated, 44);
    assert.equal(body.summary.totalAllocatedAmount, 5800000);
  });

  test('SETUP-05: Subset 3-pocket selection setup creates 3 pockets, 2 allocations, Rp1,500,000, 15 categories', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        selectedPocketKeys: ['food-groceries', 'cash', 'transportation'],
        cashOpeningBalance: 100000,
      },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.summary.pocketsCreated, 3);
    assert.equal(body.summary.categoriesCreated, 15);
    assert.equal(body.summary.totalAllocatedAmount, 1500000);

    // Assert actual DB allocation row count equals 2
    const allocRows = await db.select().from(schema.pocketBudgetAllocations);
    assert.equal(allocRows.length, 2);
  });

  test('SETUP-06: Per-pocket opening balance matching allocation for allocated pockets', async () => {
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
    assert.equal(setupRes.statusCode, 200);

    const pocketsRes = await app.inject({
      method: 'GET',
      url: '/v1/pockets',
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(pocketsRes.statusCode, 200);
    const food = pocketsRes.json().pockets.find((p: any) => p.templateKey === 'food-groceries');
    assert.equal(food.openingBalance, 1300000);
  });

  test('SETUP-07: cashOpeningBalance supplied populates Cash pocket openingBalance', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        selectedPocketKeys: ['food-groceries', 'cash'],
        cashOpeningBalance: 350000,
      },
    });
    assert.equal(res.statusCode, 200);
    const cashId = res.json().summary.templateKeyToIdMap['cash'];

    const cashRes = await app.inject({
      method: 'GET',
      url: `/v1/pockets/${cashId}`,
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(cashRes.json().pocket.openingBalance, 350000);
  });

  test('SETUP-08: nfcOpeningBalance supplied populates NFC Card pocket openingBalance', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        selectedPocketKeys: ['transportation', 'nfc-card'],
        nfcOpeningBalance: 150000,
      },
    });
    assert.equal(res.statusCode, 200);
    const nfcId = res.json().summary.templateKeyToIdMap['nfc-card'];

    const nfcRes = await app.inject({
      method: 'GET',
      url: `/v1/pockets/${nfcId}`,
      headers: { cookie: owner.cookieHeader },
    });
    assert.equal(nfcRes.json().pocket.openingBalance, 150000);
  });

  test('SETUP-09: Missing companion pocket food-groceries when cash selected returns 422 INVALID_REFERENCE', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        selectedPocketKeys: ['cash'],
        cashOpeningBalance: 100000,
      },
    });
    assert.equal(res.statusCode, 422);
    assert.equal(res.json().error.code, 'INVALID_REFERENCE');
  });

  test('SETUP-10: Missing companion pocket transportation when nfc-card selected returns 422 INVALID_REFERENCE', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        selectedPocketKeys: ['nfc-card'],
        nfcOpeningBalance: 50000,
      },
    });
    assert.equal(res.statusCode, 422);
    assert.equal(res.json().error.code, 'INVALID_REFERENCE');
  });

  test('SETUP-11: cashOpeningBalance omitted when cash selected returns 400 INVALID_INPUT', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        selectedPocketKeys: ['food-groceries', 'cash'],
      },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.code, 'INVALID_INPUT');
  });

  test('SETUP-12: cashOpeningBalance supplied when cash NOT selected returns 400 INVALID_INPUT', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        selectedPocketKeys: ['food-groceries'],
        cashOpeningBalance: 100000,
      },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.code, 'INVALID_INPUT');
  });

  test('SETUP-13: nfcOpeningBalance omitted when nfc-card selected returns 400 INVALID_INPUT', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        selectedPocketKeys: ['transportation', 'nfc-card'],
      },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.code, 'INVALID_INPUT');
  });

  test('SETUP-14: nfcOpeningBalance supplied when nfc-card NOT selected returns 400 INVALID_INPUT', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        selectedPocketKeys: ['transportation'],
        nfcOpeningBalance: 50000,
      },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.code, 'INVALID_INPUT');
  });

  test('SETUP-15: Successful setup marker persistence in users.setup_completed_at', async () => {
    const owner = await createTestOwner(db);
    const res = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        selectedPocketKeys: ['food-groceries'],
      },
    });
    assert.equal(res.statusCode, 200);

    const userRows = await db.select().from(schema.users).where(eq(schema.users.id, owner.userId));
    assert.ok(userRows[0].setupCompletedAt);
    // Assert DB setupCompletedAt ISO string exactly equals response completedAt
    assert.equal(userRows[0].setupCompletedAt.toISOString(), res.json().completedAt);
  });

  test('SETUP-16: Mid-transaction failure triggers atomic SQL rollback of all inserted setup entities', async () => {
    const owner = await createTestOwner(db);

    // Inject test-only PostgreSQL trigger on pocketflow_test_7b3 DB
    await db.execute(
      sql`
        CREATE OR REPLACE FUNCTION test_fail_setup_alloc_func() RETURNS trigger AS $$
        BEGIN
          RAISE EXCEPTION 'test_injected_mid_tx_failure';
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS test_fail_setup_alloc_trig ON pocket_budget_allocations;

        CREATE TRIGGER test_fail_setup_alloc_trig
        BEFORE INSERT ON pocket_budget_allocations
        FOR EACH ROW EXECUTE FUNCTION test_fail_setup_alloc_func();
      `
    );

    try {
      const res = await app.inject({
        method: 'PUT',
        url: '/v1/setup',
        headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
        payload: {
          clientMutationId: crypto.randomUUID(),
          selectedPocketKeys: ['food-groceries', 'transportation'],
        },
      });

      assert.equal(res.statusCode, 500);

      // Verify atomic rollback directly on dedicated test DB
      const userRows = await db.select().from(schema.users).where(eq(schema.users.id, owner.userId));
      assert.equal(userRows[0].setupCompletedAt, null);

      const pocketRows = await db.select().from(schema.pockets).where(eq(schema.pockets.userId, owner.userId));
      assert.equal(pocketRows.length, 0);

      const categoryRows = await db.select().from(schema.categories).where(eq(schema.categories.userId, owner.userId));
      assert.equal(categoryRows.length, 0);

      const periodRows = await db.select().from(schema.budgetPeriods).where(eq(schema.budgetPeriods.userId, owner.userId));
      assert.equal(periodRows.length, 0);

      const allocRows = await db.select().from(schema.pocketBudgetAllocations);
      assert.equal(allocRows.length, 0);

      const idemRows = await db.select().from(schema.idempotencyRecords).where(eq(schema.idempotencyRecords.userId, owner.userId));
      assert.equal(idemRows.length, 0);
    } finally {
      // Clean trigger and function reliably
      await db.execute(
        sql`
          DROP TRIGGER IF EXISTS test_fail_setup_alloc_trig ON pocket_budget_allocations;
          DROP FUNCTION IF EXISTS test_fail_setup_alloc_func();
        `
      );
    }
  });

  test('SETUP-17: Clean retry following mid-transaction rollback succeeds using same owner', async () => {
    const owner = await createTestOwner(db);

    // Inject trigger to cause mid-tx failure on first attempt
    await db.execute(
      sql`
        CREATE OR REPLACE FUNCTION test_fail_setup_alloc_func() RETURNS trigger AS $$
        BEGIN
          RAISE EXCEPTION 'test_injected_mid_tx_failure';
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS test_fail_setup_alloc_trig ON pocket_budget_allocations;

        CREATE TRIGGER test_fail_setup_alloc_trig
        BEFORE INSERT ON pocket_budget_allocations
        FOR EACH ROW EXECUTE FUNCTION test_fail_setup_alloc_func();
      `
    );

    try {
      const res1 = await app.inject({
        method: 'PUT',
        url: '/v1/setup',
        headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
        payload: {
          clientMutationId: crypto.randomUUID(),
          selectedPocketKeys: ['food-groceries', 'transportation'],
        },
      });
      assert.equal(res1.statusCode, 500);
    } finally {
      // Remove injected trigger BEFORE retry attempt
      await db.execute(
        sql`
          DROP TRIGGER IF EXISTS test_fail_setup_alloc_trig ON pocket_budget_allocations;
          DROP FUNCTION IF EXISTS test_fail_setup_alloc_func();
        `
      );
    }

    // Perform clean retry with the SAME owner
    const retryRes = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        selectedPocketKeys: ['food-groceries', 'transportation'],
      },
    });

    assert.equal(retryRes.statusCode, 200);
    assert.equal(retryRes.json().isSetupCompleted, true);

    const userRows = await db.select().from(schema.users).where(eq(schema.users.id, owner.userId));
    assert.ok(userRows[0].setupCompletedAt);
  });

  test('SETUP-18: templateKeyToIdMap strictly equals selectedPocketKeys mapped to valid UUIDs', async () => {
    const owner = await createTestOwner(db);
    const selectedPocketKeys = ['food-groceries', 'transportation'];
    const res = await app.inject({
      method: 'PUT',
      url: '/v1/setup',
      headers: { cookie: owner.cookieHeader, 'x-csrf-token': owner.csrfToken },
      payload: {
        clientMutationId: crypto.randomUUID(),
        selectedPocketKeys,
      },
    });
    assert.equal(res.statusCode, 200);
    const map = res.json().summary.templateKeyToIdMap;

    // Assert Object.keys(map).sort() deep-equal selectedPocketKeys.sort()
    assert.deepEqual(Object.keys(map).sort(), selectedPocketKeys.sort());

    // Assert each map value is a valid RFC UUID v4 using validateUuidV4 helper
    for (const id of Object.values(map)) {
      assert.equal(validateUuidV4(id as string, 'templateKeyToIdMap value'), id);
    }
  });

  test('SETUP-19: Database pockets.template_key populated for setup pockets', async () => {
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
    const pocketRows = await db.select().from(schema.pockets).where(eq(schema.pockets.userId, owner.userId));
    assert.equal(pocketRows[0].templateKey, 'food-groceries');
  });

  test('SETUP-20: Partial unique index pockets_owner_template_key_idx prevents duplicate template_key per owner', async () => {
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

    // Attempting direct DB insert of duplicate template_key for same user throws 23505
    await assert.rejects(async () => {
      await db.insert(schema.pockets).values({
        userId: owner.userId,
        templateKey: 'food-groceries',
        name: 'Duplicate Food',
        emoji: '🍱',
        groupId: 'daily',
        isSpendable: true,
        isActive: true,
        isArchived: false,
        openingBalance: 0,
        revision: 1,
      });
    }, (err: any) => err?.code === '23505' || err?.message?.includes('pockets_owner_template_key_idx'));
  });
});
