import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../../src/db/schema.js';
import { purgeDeletedTransactions, PURGE_LOCK_NAMESPACE, PURGE_LOCK_KEY } from '../../src/lib/purge.js';
import { getTestDb, resetTestDatabase, createTestOwner, closeTestDb, TEST_DATABASE_URL } from '../helpers/testDb.js';
import { seedMasterData } from '../helpers/masterDataFixture.js';

describe('Atomic bounded tombstone purge', () => {
  let db: Awaited<ReturnType<typeof getTestDb>>;
  let owner: Awaited<ReturnType<typeof createTestOwner>>;
  let ids: Awaited<ReturnType<typeof seedMasterData>>;
  const now = new Date('2026-11-04T10:00:00.000Z');
  const cutoff = new Date(now.getTime() - 30 * 86400000);
  const older = new Date(cutoff.getTime() - 86400000);
  before(async () => { db = await getTestDb(); });
  after(async () => { await closeTestDb(); });
  beforeEach(async () => {
    await resetTestDatabase(db);
    owner = await createTestOwner(db);
    ids = await seedMasterData(db, owner.userId);
  });
  async function row(deletedAt: Date | null, archivedAt: Date | null = null, id?: string) {
    const [created] = await db.insert(schema.transactions).values({
      id, userId: owner.userId, type: 'income', pocketId: ids.food.id,
      amount: 1000, occurredOn: '2026-09-29', occurredAtLocalTime: '09:00:00', deletedAt, archivedAt,
    }).returning();
    return created;
  }
  const run = (batchLimit?: number) => purgeDeletedTransactions({ db, now, batchLimit });
  it('preserves active, archived-only and younger rows; purges exact boundary with audit', async () => {
    const boundary = await row(cutoff), old = await row(older);
    const young = await row(new Date(cutoff.getTime() + 1));
    const active = await row(null), archived = await row(null, older);
    const result = await run();
    assert.equal(result.status, 'completed');
    assert.deepEqual(result.purgedTransactionIds, [old.id, boundary.id]);
    const remaining = (await db.select().from(schema.transactions)).map(t => t.id);
    for (const t of [young, active, archived]) assert.ok(remaining.includes(t.id));
    const logs = await db.select().from(schema.transactionPurgeLogs);
    assert.equal(logs.length, 2);
    assert.equal(JSON.parse(logs[0].metadata!).amount, 1000);
    assert.equal(logs[0].purgedAt.toISOString(), now.toISOString());
    assert.equal((await run()).purgedCount, 0); // lost result / retry cannot duplicate audit
    assert.equal((await db.select().from(schema.transactionPurgeLogs)).length, 2);
  });
  it('uses stable ordering and caps each batch without claiming an exact remainder', async () => {
    const a = await row(older, null, '00000000-0000-4000-8000-000000000001');
    const b = await row(older, null, '00000000-0000-4000-8000-000000000002');
    await row(cutoff);
    const first = await run(2);
    assert.equal(first.status, 'limit_reached');
    assert.deepEqual(first.purgedTransactionIds, [a.id, b.id]);
    assert.equal((await run(2)).purgedCount, 1);
    assert.equal((await run(2)).status, 'completed');
    assert.equal((await db.select().from(schema.transactionPurgeLogs)).length, 3);
  });
  it('rejects unbounded batches and retention-shortening overrides before writes', async () => {
    await row(older);
    for (const batchLimit of [0, -1, 501, 1.5, NaN]) await assert.rejects(run(batchLimit), /batch limit/);
    await assert.rejects(purgeDeletedTransactions({ db, now, retentionDays: 1 }), /retention/);
    await assert.rejects(purgeDeletedTransactions({ db, now, cutoffDate: now }), /shorten/);
    assert.equal((await db.select().from(schema.transactionPurgeLogs)).length, 0);
  });
  it('enforces the default 500-row cap and drains the remaining row on retry', async () => {
    await db.insert(schema.transactions).values(Array.from({ length: 501 }, () => ({
      userId: owner.userId, type: 'income', pocketId: ids.food.id, amount: 1000,
      occurredOn: '2026-09-29', occurredAtLocalTime: '09:00:00', deletedAt: older,
    })));
    const first = await run();
    assert.equal(first.purgedCount, 500);
    assert.equal(first.status, 'limit_reached');
    assert.equal((await run()).purgedCount, 1);
    assert.equal((await db.select().from(schema.transactionPurgeLogs)).length, 501);
  });
  it('uses database time when no test clock is provided', async () => {
    const [clock] = await db.execute(sql`SELECT transaction_timestamp() AS now`);
    const date = new Date(String(clock.now));
    const old = await row(new Date(date.getTime() - 31 * 86400000));
    const young = await row(new Date(date.getTime() - 29 * 86400000));
    const result = await purgeDeletedTransactions({ db });
    assert.deepEqual(result.purgedTransactionIds, [old.id]);
    assert.equal((await db.select().from(schema.transactions).where(eq(schema.transactions.id, young.id))).length, 1);
  });
  it('skips a cross-client lock holder, then safely races two clients without duplicate audit', async () => {
    const target = await row(older);
    const otherSql = postgres(TEST_DATABASE_URL, { max: 1 });
    const otherDb = drizzle(otherSql, { schema });
    try {
      await otherDb.transaction(async tx => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(${PURGE_LOCK_NAMESPACE}::int, ${PURGE_LOCK_KEY}::int)`);
        assert.deepEqual(await run(), { status: 'busy', purgedCount: 0, purgedTransactionIds: [] });
      });
      const results = await Promise.all([run(), purgeDeletedTransactions({ db: otherDb, now })]);
      assert.equal(results.reduce((n, r) => n + r.purgedCount, 0), 1);
      assert.equal((await db.select().from(schema.transactionPurgeLogs)).length, 1);
      assert.equal((await db.select().from(schema.transactions).where(eq(schema.transactions.id, target.id))).length, 0);
    } finally { await otherSql.end(); }
  });
  it('rolls back deletion when audit insertion fails', async () => {
    const target = await row(older);
    await db.execute(sql`CREATE FUNCTION pf_test_audit_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit-fixture-failure'; END $$`);
    await db.execute(sql`CREATE TRIGGER pf_test_audit_fail BEFORE INSERT ON transaction_purge_logs FOR EACH ROW EXECUTE FUNCTION pf_test_audit_fail()`);
    try {
      await assert.rejects(run());
      assert.equal((await db.select().from(schema.transactions).where(eq(schema.transactions.id, target.id))).length, 1);
      assert.equal((await db.select().from(schema.transactionPurgeLogs)).length, 0);
    } finally {
      await db.execute(sql`DROP TRIGGER pf_test_audit_fail ON transaction_purge_logs`);
      await db.execute(sql`DROP FUNCTION pf_test_audit_fail()`);
    }
    assert.equal((await run()).purgedCount, 1);
  });
  it('rolls back audit when a delete trigger suppresses the deletion', async () => {
    const target = await row(older);
    await db.execute(sql`CREATE FUNCTION pf_test_delete_skip() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$`);
    await db.execute(sql`CREATE TRIGGER pf_test_delete_skip BEFORE DELETE ON transactions FOR EACH ROW EXECUTE FUNCTION pf_test_delete_skip()`);
    try {
      await assert.rejects(run(), /delete count mismatch/);
      assert.equal((await db.select().from(schema.transactionPurgeLogs)).length, 0);
      assert.equal((await db.select().from(schema.transactions).where(eq(schema.transactions.id, target.id))).length, 1);
    } finally {
      await db.execute(sql`DROP TRIGGER pf_test_delete_skip ON transactions`);
      await db.execute(sql`DROP FUNCTION pf_test_delete_skip()`);
    }
    assert.equal((await run()).purgedCount, 1);
  });
  it('times out a locked candidate and releases its advisory lock for a later run', async () => {
    const target = await row(older);
    const otherSql = postgres(TEST_DATABASE_URL, { max: 1 });
    try {
      await otherSql.begin(async tx => {
        await tx`SELECT id FROM transactions WHERE id = ${target.id} FOR UPDATE`;
        await assert.rejects(run()); // production 2-second lock timeout, not a test-only bypass
      });
      assert.equal((await db.select().from(schema.transactionPurgeLogs)).length, 0);
      assert.equal((await run()).purgedCount, 1);
    } finally { await otherSql.end(); }
  });
  it('cancels a slow audit statement and rolls back before a successful retry', async () => {
    const target = await row(older);
    await db.execute(sql`CREATE FUNCTION pf_test_audit_slow() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(12); RETURN NEW; END $$`);
    await db.execute(sql`CREATE TRIGGER pf_test_audit_slow BEFORE INSERT ON transaction_purge_logs FOR EACH ROW EXECUTE FUNCTION pf_test_audit_slow()`);
    try {
      await assert.rejects(run()); // real production statement timeout cancels DB work
      assert.equal((await db.select().from(schema.transactionPurgeLogs)).length, 0);
      assert.equal((await db.select().from(schema.transactions).where(eq(schema.transactions.id, target.id))).length, 1);
    } finally {
      await db.execute(sql`DROP TRIGGER pf_test_audit_slow ON transaction_purge_logs`);
      await db.execute(sql`DROP FUNCTION pf_test_audit_slow()`);
    }
    assert.equal((await run()).purgedCount, 1);
  });
});
