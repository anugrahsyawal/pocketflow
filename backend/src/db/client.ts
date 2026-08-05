import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema.js';

export type AppDatabase = PostgresJsDatabase<typeof schema>;

let dbInstance: AppDatabase | null = null;
let queryClientInstance: postgres.Sql | null = null;

export function getDb(databaseUrl?: string): AppDatabase {
  if (dbInstance) {
    return dbInstance;
  }

  if (!databaseUrl) {
    throw new Error('Database URL is required to initialize DB client');
  }

  queryClientInstance = postgres(databaseUrl, { max: 10 });
  dbInstance = drizzle(queryClientInstance, { schema });
  return dbInstance;
}

export async function checkDbConnection(db: AppDatabase): Promise<boolean> {
  try {
    const result = await db.execute(sql`SELECT 1 as alive`);
    return Array.isArray(result) && result.length > 0;
  } catch {
    return false;
  }
}

export async function closeDb(): Promise<void> {
  if (queryClientInstance) {
    await queryClientInstance.end();
    queryClientInstance = null;
    dbInstance = null;
  }
}
