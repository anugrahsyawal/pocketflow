import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Socket } from 'node:net';
import Fastify from 'fastify';
import { createReadinessProbe } from '../../src/db/readiness.js';
import { healthRoutes } from '../../src/routes/health.js';
import { createTestApp } from '../helpers/testApp.js';
import { closeTestDb } from '../helpers/testDb.js';

describe('Liveness and bounded database readiness', () => {
  it('checks a real database via an actual HTTP endpoint without authentication', async () => {
    const app = await createTestApp();
    try {
      const address = await app.listen({ host: '127.0.0.1', port: 0 });
      const result = await fetch(address + '/ready');
      assert.equal(result.status, 200);
      assert.equal(result.headers.get('cache-control'), 'no-store');
      assert.deepEqual(await result.json(), { status: 'ready', service: 'pocketflow-api' });
    } finally { await app.close(); await closeTestDb(); }
  });
  it('keeps liveness independent and redacts readiness failures', async () => {
    const app = Fastify();
    let calls = 0;
    await app.register(healthRoutes, { readiness: async () => {
      calls++; throw new Error('postgres://owner:private-password@internal-host/db');
    } });
    try {
      const live = await app.inject('/health');
      assert.equal(live.statusCode, 200);
      assert.deepEqual(live.json(), { status: 'ok', service: 'pocketflow-api' });
      assert.equal(calls, 0);
      const ready = await app.inject('/ready');
      assert.equal(ready.statusCode, 503);
      assert.equal(ready.headers['cache-control'], 'no-store');
      assert.deepEqual(ready.json(), { status: 'unavailable', service: 'pocketflow-api' });
    } finally { await app.close(); }
  });
  it('returns false when the database connection is refused', async () => {
    const listener = createServer();
    await new Promise<void>(resolve => listener.listen(0, '127.0.0.1', resolve));
    const port = (listener.address() as { port: number }).port;
    await new Promise<void>((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
    assert.equal(await createReadinessProbe(`postgres://test:test@127.0.0.1:${port}/test`, 100)(), false);
  });
  it('bounds stalled probes, shares concurrent work and releases sockets before retry', async () => {
    const sockets = new Set<Socket>();
    const listener = createServer(socket => {
      sockets.add(socket);
      socket.on('data', () => {});
      socket.on('close', () => sockets.delete(socket));
    });
    await new Promise<void>(resolve => listener.listen(0, '127.0.0.1', resolve));
    const port = (listener.address() as { port: number }).port;
    const check = createReadinessProbe(`postgres://test:test@127.0.0.1:${port}/test`, 100);
    try {
      const started = Date.now();
      const first = check();
      assert.equal(check(), first);
      assert.equal(await first, false);
      assert.ok(Date.now() - started < 2000, 'stalled database must not hang readiness');
      const releaseDeadline = Date.now() + 500;
      while (sockets.size && Date.now() < releaseDeadline) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      assert.equal(sockets.size, 0, 'timed-out probe must close its socket');
      const next = check();
      assert.notEqual(next, first);
      assert.equal(await next, false);
    } finally {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
    }
  });
});
