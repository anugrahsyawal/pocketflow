import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Socket } from 'node:net';
import postgres from 'postgres';
import { databaseOptions } from '../../src/db/connectionOptions.js';
import { getTestDb, closeTestDb, TEST_DATABASE_URL } from '../helpers/testDb.js';

describe('Database connection profiles', () => {
  const url = 'postgres://owner:private-password@example.com/pocketflow';
  it('preserves direct local defaults and supports session mode', () => {
    assert.deepEqual(databaseOptions(url, {}), { max: 10 });
    assert.deepEqual(databaseOptions(url, { DB_CONNECTION_MODE: 'session' }), { max: 10 });
  });
  it('bounds transaction mode and disables prepared statements and pipelining', async () => {
    const options = databaseOptions(url, { DB_CONNECTION_MODE: 'transaction' });
    assert.deepEqual(options, { max: 1, prepare: false, max_pipeline: 1 });
    const client = postgres(url + '?max=99&prepare=true&max_pipeline=100', options);
    try {
      assert.equal(client.options.max, 1);
      assert.equal(client.options.prepare, false);
      assert.equal((client.options as typeof client.options & { max_pipeline: number }).max_pipeline, 1);
    } finally { await client.end({ timeout: 0 }); }
  });
  it('requires server certificate verification in production', () => {
    assert.deepEqual(databaseOptions(url, { NODE_ENV: 'production' }).ssl, { rejectUnauthorized: true });
    assert.throws(() => databaseOptions(url, { NODE_ENV: 'production', DB_SSL_MODE: 'inherit' }), /DB_SSL_MODE/);
  });
  it('rejects unknown profiles and weak TLS URL overrides without leaking secrets', () => {
    assert.throws(() => databaseOptions(url, { DB_CONNECTION_MODE: 'typo' }), /DB_CONNECTION_MODE/);
    assert.throws(() => databaseOptions(url, { DB_SSL_MODE: 'disable' }), /DB_SSL_MODE/);
    for (const query of ['sslmode=disable', 'sslmode=require', 'ssl=false',
      'sslmode=verify-full&sslmode=disable', 'sslrootcert=/private/file']) {
      assert.throws(() => databaseOptions(url + '?' + query, { NODE_ENV: 'production' }),
        error => error instanceof Error && !error.message.includes('private-password') && /Configuration error/.test(error.message));
    }
  });
  it('accepts a PEM trust root only with verification enabled', () => {
    const ca = '-----BEGIN CERTIFICATE-----\nfixture-only\n-----END CERTIFICATE-----';
    assert.deepEqual(databaseOptions(url, { DB_SSL_MODE: 'verify-full', DB_SSL_CA: ca }).ssl,
      { rejectUnauthorized: true, ca });
    assert.throws(() => databaseOptions(url, { DB_SSL_CA: ca }), /requires/);
    assert.throws(() => databaseOptions(url, { NODE_ENV: 'production', DB_SSL_CA: 'not a cert' }), /PEM/);
  });
  it('refuses plaintext when a server declines TLS, without sending credentials', async () => {
    const sockets = new Set<Socket>();
    const received: Buffer[] = [];
    const server = createServer(socket => {
      sockets.add(socket);
      socket.on('data', bytes => { received.push(bytes); socket.write('N'); });
      socket.on('close', () => sockets.delete(socket));
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = `postgres://owner:private-password@127.0.0.1:${(server.address() as { port: number }).port}/test`;
    const client = postgres(address, { ...databaseOptions(address, { NODE_ENV: 'production' }), connect_timeout: 1 });
    try {
      await assert.rejects(client`SELECT 1`);
      const bytes = Buffer.concat(received);
      assert.ok(bytes.length >= 8);
      assert.equal(bytes.readInt32BE(4), 80877103);
      // This driver attempts TLS even after N; subsequent bytes may be a TLS ClientHello,
      // but must never be a plaintext PostgreSQL startup/authentication packet.
      if (bytes.length > 8) assert.equal(bytes[8], 0x16);
      assert.equal(bytes.includes(Buffer.from('private-password')), false);
      assert.equal(bytes.includes(Buffer.from('user\0owner\0')), false);
    } finally {
      await client.end({ timeout: 0 });
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  });
  it('runs concurrent reads and transaction rollback/locks with the opt-in profile on local PostgreSQL', async () => {
    await getTestDb();
    const client = postgres(TEST_DATABASE_URL, databaseOptions(TEST_DATABASE_URL, { DB_CONNECTION_MODE: 'transaction' }));
    try {
      const rows = await Promise.all(Array.from({ length: 12 }, (_, n) => client`SELECT ${n}::int AS n`));
      assert.deepEqual(rows.map(row => row[0].n), Array.from({ length: 12 }, (_, n) => n));
      await assert.rejects(client.begin(async tx => {
        await tx`SELECT pg_advisory_xact_lock(987654321)`;
        await tx`SET LOCAL statement_timeout = '1s'`;
        assert.equal((await tx`SELECT 7 AS n`)[0].n, 7);
        throw new Error('rollback-fixture');
      }), /rollback-fixture/);
      assert.equal((await client`SELECT 8 AS n`)[0].n, 8);
    } finally { await client.end({ timeout: 0 }); await closeTestDb(); }
  });
});
