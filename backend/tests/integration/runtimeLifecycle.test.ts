import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { buildApp } from '../../src/app.js';
import { startPersistentServer } from '../../src/runtime.js';
import { isPurgeSchedulerRunning, stopPurgeScheduler } from '../../src/lib/purge.js';
import { closeDb } from '../../src/db/client.js';
import type { AppConfig } from '../../src/config/env.js';

const config: AppConfig = {
  nodeEnv: 'test', port: 0, host: '127.0.0.1',
  databaseUrl: 'postgres://test:test@127.0.0.1:1/runtime_test_unused',
  corsOrigin: 'http://localhost:5173', sessionSecret: 'runtime-test-only',
};

describe('Persistent runtime and app-factory boundary', () => {
  let saved: NodeJS.ProcessEnv;
  beforeEach(() => {
    saved = { ...process.env };
    Object.assign(process.env, { NODE_ENV: 'test', DATABASE_URL: config.databaseUrl,
      SESSION_SECRET: config.sessionSecret, CORS_ORIGIN: config.corsOrigin });
  });
  afterEach(async () => { stopPurgeScheduler(); await closeDb(); process.env = saved; });
  it('imports and builds the HTTP app without a listener or maintenance timer', async () => {
    assert.equal(isPurgeSchedulerRunning(), false);
    const app = await buildApp(config);
    try {
      await app.ready();
      assert.equal(app.server.listening, false);
      assert.equal(isPurgeSchedulerRunning(), false);
      const health = await app.inject('/health');
      assert.equal(health.statusCode, 200);
      assert.equal((await app.inject('/internal/purge')).statusCode, 404);
      assert.equal((await app.inject('/v1/purge')).statusCode, 404);
    } finally { await app.close(); }
  });
  it('starts maintenance only with a listening persistent server and stops it on close', async () => {
    const app = await startPersistentServer(config);
    try {
      assert.equal(app.server.listening, true);
      assert.equal(isPurgeSchedulerRunning(), true);
      const address = app.server.address() as { port: number };
      assert.equal((await fetch(`http://127.0.0.1:${address.port}/health`)).status, 200);
      const independentApp = await buildApp(config);
      await independentApp.ready();
      await independentApp.close();
      assert.equal(isPurgeSchedulerRunning(), true, 'closing an app factory must not stop runtime maintenance');
    } finally { await app.close(); }
    assert.equal(app.server.listening, false);
    assert.equal(isPurgeSchedulerRunning(), false);
  });
  it('cleans up a failed listen without starting maintenance', async () => {
    const blocker = createServer();
    await new Promise<void>(resolve => blocker.listen(0, '127.0.0.1', resolve));
    const port = (blocker.address() as { port: number }).port;
    try {
      await assert.rejects(startPersistentServer({ ...config, port }), { code: 'EADDRINUSE' });
      assert.equal(isPurgeSchedulerRunning(), false);
    } finally {
      await new Promise<void>((resolve, reject) => blocker.close(error => error ? reject(error) : resolve()));
    }
    const recovered = await startPersistentServer(config);
    await recovered.close();
    assert.equal(isPurgeSchedulerRunning(), false);
  });
});
