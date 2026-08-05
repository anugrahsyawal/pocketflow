import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { loadAndValidateEnv } from '../config/env.js';
import { getDb, closeDb } from './client.js';

async function runMigrate(): Promise<void> {
  try {
    const config = loadAndValidateEnv();
    console.log('Running database migrations...');
    const db = getDb(config.databaseUrl);
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Database migrations completed successfully.');
    await closeDb();
    process.exit(0);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Migration failed: ${message}`);
    process.exit(1);
  }
}

runMigrate();
