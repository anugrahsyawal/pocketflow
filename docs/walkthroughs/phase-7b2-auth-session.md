# Phase 7B.2 — Owner Authentication & Secure Session Walkthrough

## Overview

- **Performer**: Antigravity (Backend Developer)
- **Date**: 2026-08-05
- **Phase Goal**: Implement single-owner CLI provisioning, database session migrations, versioned `/v1` authentication routes (`/v1/auth/csrf`, `/v1/auth/login`, `/v1/auth/logout`, `/v1/me`), session rotation, 30-day HttpOnly session cookie, and `X-CSRF-Token` header protection.

## Decision Log & Architecture Consistency

- **DEC-029**: Recorded in `docs/decisions/DECISION_LOG.md` establishing single-owner CLI provisioning (`npm run owner:provision`), 30-day session expiry, Argon2id password hashing, hashed session & CSRF tokens, session rotation on login, and `X-CSRF-Token` header protection.
- **Pending Decisions Cleanup**: Removed resolved items (`backend framework and database` and `remote-sync conflict strategy`) from the Pending Decisions list in `docs/decisions/DECISION_LOG.md` as they were already established by DEC-025, DEC-026, and DEC-027.
- **Architecture Pack**: Updated `docs/architecture/BACKEND_ARCHITECTURE_DECISION_PACK.md` section 2 table to align with DEC-029.

## Modified & Created Files

### Backend (`backend/`)
- `package.json` — Added `db:migrate` (`tsx --env-file=.env src/db/migrate.ts`) and `owner:provision` (`tsx --env-file=.env src/cli/provision-owner.ts`).
- `.env.example` — Added non-secret placeholders for `OWNER_EMAIL`, `OWNER_DISPLAY_NAME`, and `OWNER_PASSWORD`.
- `src/db/schema.ts` — Added `csrfTokenHash` and unique index constraint `auth_sessions_token_hash_unique` on `auth_sessions.token_hash`.
- `src/db/migrate.ts` — Implemented Drizzle migrator script for PostgreSQL migrations.
- `src/cli/provision-owner.ts` — Implemented single-owner CLI provisioning script reading `OWNER_EMAIL`, `OWNER_DISPLAY_NAME`, and `OWNER_PASSWORD`. Checks if `users` table is empty; hashes password with Argon2id; aborts with non-zero exit (exit 1) if owner exists; never logs secrets or passwords.
- `src/lib/auth.ts` — Authentication payload interfaces, SHA-256 token hashing, token generation helpers, `authenticateRequest` Fastify preHandler hook, and `validateCsrfToken` Fastify preHandler hook.
- `src/routes/auth.ts` — Versioned authentication routes:
  - `GET /v1/auth/csrf` -> Obtains/refreshes CSRF token for active session.
  - `POST /v1/auth/login` -> Authenticates owner, rotates session, sets HttpOnly 30-day `sid` cookie, and returns `{ user, csrfToken }`. Generic error on failure.
  - `POST /v1/auth/logout` -> Revokes active session, clears `sid` cookie. Validates `X-CSRF-Token` header.
  - `GET /v1/me` -> Returns `{ user: { id, email, displayName } }`. Requires valid session.
- `src/app.ts` — Registered `authRoutes` and configured CORS `allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']`.
- `README.md` — Updated setup sequence (`.env` -> `npm run db:migrate` -> `npm run owner:provision`), single-owner CLI details, authentication endpoints, environment variables, and security rules.
- `drizzle/0001_slippery_kate_bishop.sql` — Generated migration adding `csrf_token_hash` column and unique constraint on `token_hash`.

### Walkthrough & Decision Documents
- `docs/decisions/DECISION_LOG.md` — Added `DEC-029` and cleaned up Pending Decisions.
- `docs/architecture/BACKEND_ARCHITECTURE_DECISION_PACK.md` — Updated section 2 table.
- `docs/walkthroughs/phase-7b2-auth-session.md` — Walkthrough evidence document.

## Command Execution & Verification Results

### 1. `npm run typecheck`
- **Command**: `npm run typecheck`
- **Output**:
  ```text
  > pocketflow-backend@0.1.0 typecheck
  > tsc --noEmit
  ```
- **Exit Code**: 0 (Lulus 100% tanpa error).

### 2. `npm run build`
- **Command**: `npm run build`
- **Output**:
  ```text
  > pocketflow-backend@0.1.0 build
  > tsc
  ```
- **Exit Code**: 0 (Lulus 100%, mengomputasi file JS ke `backend/dist/`).

### 3. `npm run db:generate`
- **Command**: `npm run db:generate`
- **Output**:
  ```text
  > pocketflow-backend@0.1.0 db:generate
  > node --env-file=.env ./node_modules/drizzle-kit/bin.cjs generate

  No schema changes, nothing to migrate 😴
  ```
- **Exit Code**: 0. Migration file `drizzle/0001_slippery_kate_bishop.sql` contains `csrf_token_hash` column and `auth_sessions_token_hash_unique` constraint.

### 4. `npm run db:migrate` (Actual Result)
- **Command**: `npm run db:migrate`
- **Output**:
  ```text
  > pocketflow-backend@0.1.0 db:migrate
  > tsx --env-file=.env src/db/migrate.ts

  Running database migrations...
  Migration failed: getaddrinfo ENOTFOUND HOST
  ```
- **Exit Code**: 1.
- **Verification Note**: `DATABASE_URL` pada `.env` default menggunakan host placeholder (`postgres://USER:PASSWORD@HOST:5432/pocketflow`). Karena tidak ada database PostgreSQL lokal yang terhubung, migrasi dan integrasi database belum diverifikasi terhadap live database.

### 5. `npm run owner:provision` (Actual Result without DB)
- **Command**: `npm run owner:provision`
- **Output**:
  ```text
  > pocketflow-backend@0.1.0 owner:provision
  > tsx --env-file=.env src/cli/provision-owner.ts

  Provisioning failed: getaddrinfo ENOTFOUND HOST
  ```
- **Exit Code**: 1.
- **Verification Note**: Command gagal secara aman dengan exit code 1 tanpa membocorkan password, hash, token, atau secret.

## Known Limitations & Honest Verification Status

1. **Live Database Verification Pending**: Kerangka migrasi `npm run db:migrate` dan CLI provisioning `npm run owner:provision` telah dibuat, tetapi belum diuji terhadap PostgreSQL lokal nyata karena `DATABASE_URL` masih placeholder.
2. **HTTP Endpoints Runtime Test Pending**: Route `/v1/auth/login`, `/v1/auth/logout`, `/v1/me`, dan `/v1/auth/csrf` telah lulus kompilasi typecheck & build TypeScript, namun integrasi HTTP runtime dengan cookie & DB nyata belum diklaim lulus sampai database PostgreSQL lokal terhubung.
3. **No Public Registration**: Owner provisioning dikunci pada skrip CLI satu kali (`npm run owner:provision`). Tidak ada endpoint sign-up publik.
4. **No Frontend Integration**: Authentication store di `frontend/` belum terhubung ke backend.

## Git Status

```text
 M backend/README.md
 M backend/drizzle/meta/_journal.json
 M backend/package.json
 M backend/src/app.ts
 M backend/src/db/schema.ts
 M docs/architecture/BACKEND_ARCHITECTURE_DECISION_PACK.md
 M docs/decisions/DECISION_LOG.md
?? backend/.env.example
?? backend/drizzle/0001_slippery_kate_bishop.sql
?? backend/drizzle/meta/0001_snapshot.json
?? backend/src/cli/
?? backend/src/db/migrate.ts
?? backend/src/lib/auth.ts
?? backend/src/routes/auth.ts
?? docs/walkthroughs/phase-7b2-auth-session.md
```
