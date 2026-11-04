import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadAndValidateEnv } from '../../src/config/env.js';

describe('Production configuration boundary', () => {
  let saved: NodeJS.ProcessEnv;
  beforeEach(() => {
    saved = { ...process.env };
    Object.assign(process.env, {
      NODE_ENV: 'production', PORT: '3000',
      DATABASE_URL: 'postgres://owner:private-password@localhost/pocketflow',
      CORS_ORIGIN: 'https://pocketflow.example',
      SESSION_SECRET: '74d2f1b5c09e83a6d7f0b4189a2c65e3f7b018cad5962e40',
    });
  });
  afterEach(() => { process.env = saved; });
  it('accepts explicit production configuration', () => {
    assert.equal(loadAndValidateEnv().corsOrigin, 'https://pocketflow.example');
  });
  it('rejects misspelled environments instead of silently disabling secure cookies', () => {
    process.env.NODE_ENV = 'prod';
    assert.throws(loadAndValidateEnv, /NODE_ENV/);
  });
  it('rejects partial, fractional, empty and out-of-range ports', () => {
    for (const value of ['3000oops', '3.5', '', '0', '65536', '-1']) {
      process.env.PORT = value;
      assert.throws(loadAndValidateEnv, /PORT/);
    }
  });
  it('requires explicit HTTPS production origin', () => {
    delete process.env.CORS_ORIGIN;
    assert.throws(loadAndValidateEnv, /explicit/);
    process.env.CORS_ORIGIN = 'http://localhost:5173';
    assert.throws(loadAndValidateEnv, /HTTPS/);
  });
  it('rejects credentials, wildcard and non-origin URL components', () => {
    for (const value of ['*', 'https://user:private-password@example.com', 'https://example.com/path',
      'https://example.com?query=1', 'https://example.com#fragment']) {
      process.env.CORS_ORIGIN = value;
      assert.throws(loadAndValidateEnv, error => error instanceof Error &&
        /CORS_ORIGIN/.test(error.message) && !error.message.includes('private-password'));
    }
  });
  it('rejects short, repeated and example production secrets', () => {
    for (const value of ['short', 'x'.repeat(40), 'replace-with-a-long-random-secret',
      'test-session-secret-at-least-32-bytes-long-super-secret!']) {
      process.env.SESSION_SECRET = value;
      assert.throws(loadAndValidateEnv, /production SESSION_SECRET/);
    }
  });
  it('validates database URL without exposing credentials', () => {
    for (const value of ['private-password', 'https://owner:private-password@example.com/db',
      'postgres://owner:private-password@localhost/']) {
      process.env.DATABASE_URL = value;
      assert.throws(loadAndValidateEnv, error => error instanceof Error &&
        /DATABASE_URL/.test(error.message) && !error.message.includes('private-password'));
    }
  });
  it('preserves local defaults and development secret behavior', () => {
    process.env.NODE_ENV = 'development';
    process.env.SESSION_SECRET = 'local-only';
    delete process.env.PORT;
    delete process.env.CORS_ORIGIN;
    assert.equal(loadAndValidateEnv().port, 3000);
    assert.equal(loadAndValidateEnv().corsOrigin, 'http://localhost:5173');
  });
});
