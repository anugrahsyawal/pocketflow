# Phase 7B.1 — Backend Service & Database Foundation Walkthrough

## Overview

- **Performer**: Antigravity (Backend Developer)
- **Date**: 2026-08-05
- **Phase Goal**: Build a structured, secure, local TypeScript + Fastify backend foundation with PostgreSQL + Drizzle ORM schema, migrations, health check, environment baseline, and database integrity constraints.

## Modified & Created Files

### Backend (`backend/`)
- `package.json` — ESM TypeScript project configuration updated to use Node 20.6+ native `--env-file=.env` in npm scripts (`dev`, `start`, `db:generate`).
- `tsconfig.json` — Strict mode TypeScript configuration targeting `ES2022` / `NodeNext`.
- `drizzle.config.ts` — Drizzle migration configuration for PostgreSQL dialect and schema output to `./drizzle`.
- `.env.example` & `.env` — Environment templates and local configuration containing `NODE_ENV`, `PORT`, `HOST`, `DATABASE_URL`, `CORS_ORIGIN`, `SESSION_SECRET`.
- `src/config/env.ts` — Environment loader and strict fast-fail validator ensuring mandatory secrets (`DATABASE_URL`, `SESSION_SECRET`) exist and `CORS_ORIGIN` is a valid single HTTP/HTTPS origin (rejects wildcards `*`, empty origins, and origins with paths/queries).
- `src/db/schema.ts` — Drizzle schema definitions for all 8 entities with updated integrity constraints:
  - `budget_periods`: fixed 26–25 period check constraint (`EXTRACT(DAY FROM start_date) = 26 AND EXTRACT(DAY FROM end_date) = 25 AND end_date = (start_date + INTERVAL '1 month' - INTERVAL '1 day')::date`).
  - `pocket_budget_allocations`: `UNIQUE("budget_period_id", "pocket_id")` and `allocated_amount >= 0` check constraint.
  - `pockets`: `opening_balance >= 0` check constraint.
  - `transactions`: `amount > 0` and exclusive topology check constraint (`expense`/`income` requires `pocket_id` & forbids `from_pocket_id`/`to_pocket_id`; `transfer` requires distinct `from_pocket_id` & `to_pocket_id` and forbids `pocket_id`).
- `src/db/client.ts` — PostgreSQL (`postgres`) client and Drizzle instance initialization with safe connection checker (`sql` template tag).
- `src/lib/errors.ts` — Fastify error handler producing structured JSON error responses (`{"error": { "code": "...", "message": "..." }}`) without leaking stack traces or connection strings.
- `src/routes/health.ts` — `GET /health` endpoint with response schema validation.
- `src/app.ts` — Fastify application factory configuring CORS (non-wildcard), cookie plugin, error handling, and health route.
- `src/server.ts` — Application startup entry point with env validation.
- `README.md` — Developer setup, Node v20.6.0+ prerequisite requirement, `--env-file` explanation, migration guide, scripts, and phase scope boundaries.

### Walkthrough & Plan (`docs/` & Artifacts)
- `docs/walkthroughs/phase-7b1-backend-foundation.md` — Updated walkthrough evidence document.

## Schema & Migration Summary

### Database Tables & Invariants
1. `users`: UUID PK, unique email, display_name, password_hash, UTC timestamps.
2. `auth_sessions`: UUID PK, FK to `users.id` (cascade), token_hash, expires_at, revoked_at, last_used_at, UTC timestamps.
3. `pockets`: UUID PK, FK to `users.id`, name, emoji, group_id, is_spendable, nullable self-FK `budget_owner_pocket_id`, is_active, is_archived, integer opening_balance, revision, UTC timestamps.
   - **Check Constraint**: `opening_balance >= 0` (`pockets_opening_balance_gte_zero`).
4. `categories`: UUID PK, FK to `users.id`, FK to `pockets.id`, name, emoji, is_default, is_active, is_archived, revision, UTC timestamps.
5. `budget_periods`: UUID PK, FK to `users.id`, local start_date, local end_date, UTC created_at.
   - **Check Constraint**: fixed 26–25 period (`budget_periods_fixed_26_25_period`).
6. `pocket_budget_allocations`: UUID PK, FK to `budget_periods.id`, FK to `pockets.id`, integer allocated_amount, revision, UTC timestamps.
   - **Unique Constraint**: `UNIQUE("budget_period_id", "pocket_id")` (`pocket_budget_allocations_period_pocket_unique`).
   - **Check Constraint**: `allocated_amount >= 0` (`pocket_budget_allocations_allocated_amount_gte_zero`).
7. `transactions`: UUID PK, FK to `users.id`, type (`expense`, `income`, `transfer`), integer amount, FK `pocket_id`, FK `from_pocket_id`, FK `to_pocket_id`, FK `category_id`, FK `budget_pocket_id` (attribution snapshot), transfer_type, income_source, local `occurred_on` date, local `occurred_at_local_time` time, note, nullable `archived_at`, nullable `deleted_at` (30-day tombstone), revision, UTC timestamps.
   - **Check Constraints**:
     - `amount > 0` (`transactions_amount_gt_zero`)
     - Exclusive topology (`transactions_exclusive_topology`):
       `((type IN ('expense', 'income') AND pocket_id IS NOT NULL AND from_pocket_id IS NULL AND to_pocket_id IS NULL) OR (type = 'transfer' AND from_pocket_id IS NOT NULL AND to_pocket_id IS NOT NULL AND from_pocket_id <> to_pocket_id AND pocket_id IS NULL))`
8. `idempotency_records`: UUID PK, FK to `users.id`, client_mutation_id, request_hash, response_reference, UTC created_at, expires_at. Unique constraint on (`user_id`, `client_mutation_id`).

### Migration Generation Evidence
- Generated SQL migration file via `npm run db:generate` into `backend/drizzle/0000_misty_lucky_pierre.sql`.
- Migration file contents verified to include all new database constraints and unique keys.
- Migration execution against a live database was **not** run, per PM instructions.

## Verification Evidence

### 1. `npm run typecheck`
- Command: `npm run typecheck`
- Result: Lulus 100% tanpa error (`tsc --noEmit`).

### 2. `npm run build`
- Command: `npm run build`
- Result: Lulus 100%, mengomputasi file JS ke `backend/dist/`.

### 3. `npm run db:generate`
- Command: `npm run db:generate`
- Result: Menggunakan `node --env-file=.env ./node_modules/drizzle-kit/bin.cjs generate`, sukses menghasilkan file `drizzle/0000_misty_lucky_pierre.sql`.

### 4. Startup Fast-Fail Test (Missing `DATABASE_URL`)
- Test: Invoked env loader without `DATABASE_URL`.
- Output: `Configuration error: DATABASE_URL environment variable is required` (gagal cepat tanpa membocorkan secret).

### 5. Startup Fast-Fail Test (`CORS_ORIGIN=*` Wildcard & Invalid Origins)
- Test 1 (`CORS_ORIGIN=*`):
  - Output: `Configuration error: CORS_ORIGIN cannot be wildcard (*)`
- Test 2 (`CORS_ORIGIN=http://localhost:5173/path`):
  - Output: `Configuration error: CORS_ORIGIN must be a single origin without path, query, or hash`

### 6. `GET /health` Verification
- Command: Executed `npm run start` server and ran `curl -i http://127.0.0.1:3000/health`.
- Status: `HTTP/1.1 200 OK`
- Headers:
  - `access-control-allow-origin: http://localhost:5173`
  - `access-control-allow-credentials: true`
  - `content-type: application/json; charset=utf-8`
- Body:
  ```json
  {"status":"ok","service":"pocketflow-api"}
  ```

## Known Limitations

1. **No Domain Endpoints**: Domain endpoints (`/auth`, `/pockets`, `/transactions`, `/reports`) are not implemented in Phase 7B.1.
2. **No DB Migration Execution**: Database migration was generated as SQL files but not executed against user PostgreSQL database.
3. **No Auth Implementation**: Password hashing via Argon2 and session endpoints (`/auth/login`) are reserved for Phase 7B.2+.
4. **No Remote Sync / LocalStorage Import**: Browser storage import and synchronization queue are not in scope for this phase.

## Git Status

```text
?? backend/
?? docs/walkthroughs/phase-7b1-backend-foundation.md
```
