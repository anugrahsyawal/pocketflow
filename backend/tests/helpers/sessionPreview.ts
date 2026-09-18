/** Disposable browser QA only. Never runs against the development database. */
import { getTestDb, resetTestDatabase, createTestOwner, closeTestDb } from './testDb.js';
import { createTestApp } from './testApp.js';
import { users } from '../../src/db/schema.js';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';

if (new URL(process.env.DATABASE_URL!).pathname !== '/pocketflow_test_7c1_preview') {
  throw new Error('Preview requires dedicated pocketflow_test_7c1_preview database');
}
const db = await getTestDb();
await resetTestDatabase(db);
const owner = await createTestOwner(db, 'preview@example.com');
await db.update(users).set({passwordHash:await argon2.hash('Disposable-preview-123!')}).where(eq(users.id,owner.userId));
const app = await createTestApp();
await app.listen({port:3000,host:'127.0.0.1'});
console.log('Disposable session preview listening on loopback port 3000');
async function stop() { await app.close(); await closeTestDb(); process.exit(0); }
process.once('SIGINT', () => void stop());
process.once('SIGTERM', () => void stop());
