import postgres from 'postgres';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { sql } from 'drizzle-orm';
import * as schema from '../../src/db/schema.js';
import { generateSecureTokens } from '../../src/lib/auth.js';
import { getDb, closeDb } from '../../src/db/client.js';

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  'postgres://pocketflow:pocketflow_dev_secret@127.0.0.1:5432/pocketflow_test_7b3';

// Set environment variables before any route or config imports read them
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.SESSION_SECRET = 'test-session-secret-at-least-32-bytes-long-super-secret!';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.PORT = '3000';
process.env.HOST = '127.0.0.1';

export type TestDatabase = PostgresJsDatabase<typeof schema>;

export async function getTestDb(): Promise<TestDatabase> {
  // Safety Assertion
  const urlObj = new URL(process.env.DATABASE_URL!);
  const dbName = urlObj.pathname.replace(/^\//, '');

  if (dbName === 'pocketflow' || !dbName.includes('_test_')) {
    throw new Error(
      `SAFETY VIOLATION: Integration tests MUST NOT run against database '${dbName}'. Expected test database name containing '_test_' (e.g. pocketflow_test_7b3).`
    );
  }

  // Ensure test database exists
  const adminUrl = `${urlObj.protocol}//${urlObj.username}:${urlObj.password}@${urlObj.host}/postgres`;
  const adminSql = postgres(adminUrl, { max: 1 });

  try {
    const dbCheck = await adminSql`SELECT 1 FROM pg_database WHERE datname = ${dbName}`;
    if (dbCheck.length === 0) {
      await adminSql`CREATE DATABASE ${adminSql(dbName)}`;
    }
  } finally {
    await adminSql.end({ timeout: 5 });
  }

  // Initialize DB client
  const db = getDb(process.env.DATABASE_URL);

  // Run migrations against test DB
  await migrate(db, { migrationsFolder: './drizzle' });

  return db;
}

export async function resetTestDatabase(db: TestDatabase): Promise<void> {
  // Safety re-check
  const urlObj = new URL(process.env.DATABASE_URL!);
  const dbName = urlObj.pathname.replace(/^\//, '');
  if (dbName === 'pocketflow' || !dbName.includes('_test_')) {
    throw new Error('SAFETY VIOLATION: Refusing to reset non-test database!');
  }

  await db.execute(
    sql`TRUNCATE TABLE idempotency_records, transactions, pocket_budget_allocations, categories, pockets, budget_periods, auth_sessions, users CASCADE;`
  );
}

export async function createTestOwner(
  db: TestDatabase,
  customEmail?: string
): Promise<{
  userId: string;
  email: string;
  sessionToken: string;
  csrfToken: string;
  cookieHeader: string;
}> {
  const email = customEmail || `owner-${crypto.randomUUID()}@example.com`;
  const displayName = 'Test Owner';
  const passwordHash = 'argon2_hashed_password';

  const userRows = await db
    .insert(schema.users)
    .values({
      email,
      displayName,
      passwordHash,
    })
    .returning();

  const userId = userRows[0].id;
  const tokens = generateSecureTokens();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.insert(schema.authSessions).values({
    userId,
    tokenHash: tokens.tokenHash,
    csrfTokenHash: tokens.csrfTokenHash,
    expiresAt,
  });

  return {
    userId,
    email,
    sessionToken: tokens.sessionToken,
    csrfToken: tokens.csrfToken,
    cookieHeader: `sid=${tokens.sessionToken}`,
  };
}

export async function closeTestDb(): Promise<void> {
  await closeDb();
}
