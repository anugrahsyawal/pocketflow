import argon2 from 'argon2';
import { count } from 'drizzle-orm';
import { loadAndValidateEnv } from '../config/env.js';
import { getDb, closeDb } from '../db/client.js';
import { users } from '../db/schema.js';

async function provisionOwner(): Promise<void> {
  try {
    const config = loadAndValidateEnv();

    const ownerEmail = process.env.OWNER_EMAIL?.trim();
    const ownerDisplayName = process.env.OWNER_DISPLAY_NAME?.trim();
    const ownerPassword = process.env.OWNER_PASSWORD;

    if (!ownerEmail || !ownerDisplayName || !ownerPassword) {
      console.error(
        'Provisioning failed: OWNER_EMAIL, OWNER_DISPLAY_NAME, and OWNER_PASSWORD environment variables are required.'
      );
      process.exit(1);
    }

    if (ownerPassword.length < 8) {
      console.error('Provisioning failed: OWNER_PASSWORD must be at least 8 characters long.');
      process.exit(1);
    }

    const db = getDb(config.databaseUrl);

    // 1. Check if any user already exists
    const [existingCount] = await db.select({ value: count() }).from(users);

    if (existingCount && Number(existingCount.value) > 0) {
      console.error('Provisioning failed: An owner account already exists.');
      await closeDb();
      process.exit(1);
    }

    // 2. Hash password with Argon2id
    const passwordHash = await argon2.hash(ownerPassword, {
      type: argon2.argon2id,
    });

    // 3. Insert single owner
    await db.insert(users).values({
      email: ownerEmail.toLowerCase(),
      displayName: ownerDisplayName,
      passwordHash: passwordHash,
    });

    console.log(`Owner provisioned successfully for ${ownerEmail}`);
    await closeDb();
    process.exit(0);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Provisioning failed: ${message}`);
    process.exit(1);
  }
}

provisionOwner();
