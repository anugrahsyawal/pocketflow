import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createServer, type Socket } from 'node:net';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from '../../src/db/schema.js';
import { runPurgeWorker } from '../../src/workers/purgeWorker.js';
import { PURGE_LOCK_NAMESPACE, PURGE_LOCK_KEY } from '../../src/lib/purge.js';
import { getTestDb, resetTestDatabase, createTestOwner, closeTestDb, TEST_DATABASE_URL } from '../helpers/testDb.js';
import { seedMasterData } from '../helpers/masterDataFixture.js';

const env = { NODE_ENV: 'test', PURGE_DATABASE_URL: TEST_DATABASE_URL, DB_CONNECTION_MODE: 'direct' };
function child(args: string[], extra: NodeJS.ProcessEnv = {}) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
    execFile(process.execPath, ['--import', 'tsx', ...args], {
      env: { ...process.env, ...env, DB_SSL_MODE: 'inherit', DB_SSL_CA: undefined, ...extra }, timeout: 15000,
    }, (error, stdout, stderr) => {
      if (error && typeof error.code !== 'number') return reject(error);
      resolve({ code: error ? Number(error.code) : 0, stdout, stderr });
    });
  });
}
describe('One-shot purge worker', () => {
  let db: Awaited<ReturnType<typeof getTestDb>>;
  let owner: Awaited<ReturnType<typeof createTestOwner>>;
  let ids: Awaited<ReturnType<typeof seedMasterData>>;
  before(async () => { db = await getTestDb(); });
  after(async () => { await closeTestDb(); });
  beforeEach(async () => {
    await resetTestDatabase(db); owner = await createTestOwner(db); ids = await seedMasterData(db, owner.userId);
  });
  async function seed(count: number) {
    await db.insert(schema.transactions).values(Array.from({ length: count }, () => ({
      userId: owner.userId, type: 'income', pocketId: ids.food.id, amount: 1000,
      occurredOn: '2026-09-29', occurredAtLocalTime: '09:00:00',
      note: 'private-note-never-log', deletedAt: new Date(Date.now() - 31 * 86400000),
    })));
  }
  it('rejects absent/extra flags before configuration or network access', async () => {
    for (const args of [[], ['--execute', '--execute'], ['--execute', '--cutoff=2099-01-01'], ['--help']]) {
      const result = await runPurgeWorker(args, {});
      assert.equal(result.exitCode, 1); assert.equal(result.summary.code, 'INVALID_ARGUMENTS');
    }
    const result = await child(['src/cli/purge.ts'], { PURGE_DATABASE_URL: 'private-password-invalid' });
    assert.equal(result.code, 1);
    assert.equal(JSON.parse(result.stdout).code, 'INVALID_ARGUMENTS');
    assert.equal(result.stderr, '');
  });
  it('requires separate maintenance URL, valid mode and production TLS', async () => {
    for (const candidate of [
      { NODE_ENV: 'test', DATABASE_URL: TEST_DATABASE_URL },
      { ...env, PURGE_DATABASE_URL: 'secret-invalid' },
      { ...env, DB_CONNECTION_MODE: 'transaction' },
      { ...env, NODE_ENV: 'prod' },
      { ...env, NODE_ENV: 'production', DB_SSL_MODE: 'inherit' },
    ]) {
      const result = await runPurgeWorker(['--execute'], candidate);
      assert.equal(result.summary.code, 'INVALID_CONFIGURATION');
      assert.equal(result.summary.purgedCount, null);
    }
  });
  it('imports CLI/worker without execution or output', async () => {
    const result = await child(['--input-type=module', '-e', 'await import("./src/cli/purge.ts"); await import("./src/workers/purgeWorker.ts")']);
    assert.equal(result.code, 0); assert.equal(result.stdout, ''); assert.equal(result.stderr, '');
  });
  it('executes real CLI once, emits only redacted summary and exits cleanly', async () => {
    await seed(1);
    const result = await child(['src/cli/purge.ts', '--execute']);
    assert.equal(result.code, 0); assert.equal(result.stderr, '');
    const summary = JSON.parse(result.stdout);
    assert.equal(summary.status, 'completed'); assert.equal(summary.purgedCount, 1);
    assert.deepEqual(Object.keys(summary).sort(), ['durationMs', 'purgedCount', 'status']);
    assert.equal(result.stdout.includes('private-note'), false);
    assert.equal((await db.select().from(schema.transactionPurgeLogs)).length, 1);
    assert.equal((await runPurgeWorker(['--execute'], env)).summary.purgedCount, 0);
  });
  it('returns follow-up exit code at batch cap and drains only on explicit next invocation', async () => {
    await seed(501);
    const first = await runPurgeWorker(['--execute'], env);
    assert.equal(first.exitCode, 2); assert.equal(first.summary.status, 'limit_reached');
    assert.equal(first.summary.purgedCount, 500);
    assert.equal((await runPurgeWorker(['--execute'], env)).summary.purgedCount, 1);
  });
  it('reports busy without writes when another client owns the lock', async () => {
    const other = postgres(TEST_DATABASE_URL, { max: 1 });
    try {
      await other.begin(async tx => {
        await tx`SELECT pg_advisory_xact_lock(${PURGE_LOCK_NAMESPACE}::int, ${PURGE_LOCK_KEY}::int)`;
        const result = await runPurgeWorker(['--execute'], env);
        assert.equal(result.exitCode, 0); assert.equal(result.summary.status, 'busy');
        assert.equal(result.summary.purgedCount, 0);
      });
    } finally { await other.end(); }
  });
  it('redacts database failures and does not claim zero writes', async () => {
    const result = await runPurgeWorker(['--execute'], { ...env, PURGE_DATABASE_URL: 'postgres://secret:private-password@127.0.0.1:1/unused' });
    assert.equal(result.exitCode, 1); assert.equal(result.summary.code, 'DATABASE_ERROR');
    assert.equal(result.summary.purgedCount, null);
    assert.equal(JSON.stringify(result).includes('private-password'), false);
  });
  it('deadline closes an in-flight transaction and permits a later explicit retry', async () => {
    await seed(1);
    const other = postgres(TEST_DATABASE_URL, { max: 1 });
    try {
      await other.begin(async tx => {
        await tx`SELECT id FROM transactions WHERE deleted_at IS NOT NULL FOR UPDATE`;
        const target = new URL(TEST_DATABASE_URL);
        target.searchParams.set('application_name', 'pf-purge-deadline-fixture');
        const pending = runPurgeWorker(['--execute'], { ...env, PURGE_DATABASE_URL: target.toString() }, { timeoutMs: 1500 });
        const deadline = Date.now() + 1400;
        let observed = false;
        while (Date.now() < deadline) {
          const rows = await db.execute(sql`SELECT pid FROM pg_stat_activity WHERE application_name = 'pf-purge-deadline-fixture' AND wait_event_type = 'Lock'`);
          if (rows.length) { observed = true; break; }
          await new Promise(resolve => setTimeout(resolve, 20));
        }
        const result = await pending;
        assert.equal(observed, true, 'must observe a live DB transaction waiting on the locked row');
        assert.equal(result.summary.code, 'TIMEOUT');
        assert.equal(result.summary.purgedCount, null);
      });
      assert.equal((await db.select().from(schema.transactionPurgeLogs)).length, 0);
      const until = Date.now() + 4000;
      let result = await runPurgeWorker(['--execute'], env);
      while (result.summary.status === 'busy' && Date.now() < until) {
        await new Promise(resolve => setTimeout(resolve, 25));
        result = await runPurgeWorker(['--execute'], env);
      }
      assert.equal(result.summary.status, 'completed');
      assert.equal(result.summary.purgedCount, 1);
      assert.equal((await db.select().from(schema.transactionPurgeLogs)).length, 1);
    } finally { await other.end(); }
  });
  it('terminates a stalled connection at deadline and on interruption', async () => {
    const sockets = new Set<Socket>();
    const server = createServer(socket => {
      sockets.add(socket); socket.on('data', () => {}); socket.on('close', () => sockets.delete(socket));
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const target = { ...env, PURGE_DATABASE_URL: `postgres://test:test@127.0.0.1:${(server.address() as { port: number }).port}/unused` };
    try {
      const started = Date.now();
      const result = await runPurgeWorker(['--execute'], target, { timeoutMs: 100 });
      assert.equal(result.summary.code, 'TIMEOUT'); assert.equal(result.exitCode, 1);
      assert.ok(Date.now() - started < 3000);
      const controller = new AbortController();
      const pending = runPurgeWorker(['--execute'], target, { signal: controller.signal });
      setTimeout(() => controller.abort(), 100);
      assert.equal((await pending).summary.code, 'INTERRUPTED');
      const until = Date.now() + 1000;
      while (sockets.size && Date.now() < until) await new Promise(resolve => setTimeout(resolve, 10));
      assert.equal(sockets.size, 0, 'deadline/interrupt must close sockets, not just stop waiting');
      assert.equal((await runPurgeWorker(['--execute'], env, { signal: controller.signal })).summary.code, 'INTERRUPTED');
    } finally {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  });
});
