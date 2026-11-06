# PocketFlow Backend Service

Local backend service, owner authentication, and database foundation for PocketFlow personal finance application.

## Prerequisites

- **Node.js**: v20.6.0 or higher (required for native `--env-file` environment loading)
- **npm**: v9.0.0 or higher
- **Docker & Docker Compose**: (for running local PostgreSQL container)

## Local PostgreSQL Database (Docker Compose)

A reproducible local PostgreSQL v16 container configuration with `pg_isready` healthcheck is provided in `docker-compose.yml` for development:

- **Start local PostgreSQL (waits until database is healthy)**:
  ```bash
  docker compose up -d --wait
  ```
- **Check container status**:
  ```bash
  docker compose ps
  ```
- **Connect via psql CLI**:
  ```bash
  docker compose exec postgres psql -U pocketflow -d pocketflow
  ```
- **Stop local PostgreSQL**:
  ```bash
  docker compose down
  ```

## Setup & Local Execution Sequence

Follow this exact sequence for local backend setup:

1. **Start Local Database (waits until healthy)**:
   ```bash
   docker compose up -d --wait
   ```

2. **Configure Environment (`.env`)**:
   Copy `.env.example` to `.env` and fill in secrets:

   ```bash
   cp .env.example .env
   ```

   ```env
   NODE_ENV=development
   PORT=3000
   HOST=127.0.0.1
   DATABASE_URL=postgres://pocketflow:pocketflow_dev_secret@127.0.0.1:5432/pocketflow
   CORS_ORIGIN=http://localhost:5173
   SESSION_SECRET=your-secure-random-session-secret

   # Single Owner Provisioning (CLI)
   OWNER_EMAIL=owner@example.com
   OWNER_DISPLAY_NAME=PocketFlow Owner
   OWNER_PASSWORD=replace-with-a-long-random-password
   ```

   > **Security Note**:
   > - `DATABASE_URL` and `SESSION_SECRET` are required at server startup. The server will fail fast if either variable is missing or empty.
   > - `CORS_ORIGIN` must be a valid single HTTP/HTTPS origin (wildcards `*` are strictly prohibited).
   > - `OWNER_PASSWORD` is used ONLY by the single-owner CLI provisioning command (`npm run owner:provision`).

3. **Run Database Migrations (`npm run db:migrate`)**:
   Applies pending SQL schema migrations to PostgreSQL:

   ```bash
   npm run db:migrate
   ```

4. **Provision Owner Account (`npm run owner:provision`)**:
   Creates the initial single owner account using `OWNER_EMAIL`, `OWNER_DISPLAY_NAME`, and `OWNER_PASSWORD`:

   ```bash
   npm run owner:provision
   ```

   > **Note**: This CLI command succeeds (exit code 0) ONLY when the `users` table is completely empty. If an owner already exists, it aborts without modifying data and exits with a non-zero exit code (exit 1).

5. **Start Development Server (`npm run dev`)**:

   ```bash
   npm run dev
   ```

## Developer Commands

- **Install dependencies**: `npm install`
- **Type check**: `npm run typecheck`
- **Build TypeScript**: `npm run build`
- **Generate migrations**: `npm run db:generate`
- **Run database migrations**: `npm run db:migrate`
- **Provision owner account**: `npm run owner:provision`
- **Run dev server**: `npm run dev`
- **Run production build**: `npm run start`

## API Endpoints

### Public & System Endpoints
- `GET /health` -> Returns `{"status": "ok", "service": "pocketflow-api"}`
- `GET /ready` -> Database connectivity only: 200 `{"status":"ready","service":"pocketflow-api"}`
  or 503 `{"status":"unavailable","service":"pocketflow-api"}`. No authentication
  required and no database error details returned. Both probes use `Cache-Control: no-store`.
  Readiness runs a read-only, two-second bounded probe outside the business pool;
  it does not prove migrations, backup validity or full production readiness.

Production configuration requires `NODE_ENV=production`, an explicit HTTPS
`CORS_ORIGIN` (without credentials, path, query or fragment), and a random
`SESSION_SECRET` of at least 32 bytes, not the example placeholder. `PORT` must
be an integer from 1 to 65535, and `DATABASE_URL` must be a PostgreSQL URL with a
host and database. Unknown environment names are rejected. These guards do not
establish hosted TLS/pooler compatibility, deployment, backups or scheduled maintenance.

### Runtime lifecycle (local readiness continuation)

Runtime lifecycle: `src/app.ts` only constructs the HTTP app. `src/runtime.ts`
starts persistent listening and the existing 24-hour purge timer, then cleans up
timer/DB connections on close; `src/server.ts` handles shutdown signals. Importing
the app/runtime module does not start maintenance. One persistent runtime per
process is supported. No serverless worker or purge HTTP API is provided; hosted
scheduling must respect DEC-030.2 before enabling function deployment.

Purge core performs candidate selection, row locking, audit and deletion within
one transaction guarded by a cross-process advisory try-lock. Each call removes
at most 500 eligible tombstones, with 30-day minimum retention. `limit_reached`
means a follow-up may be needed; `busy` means another caller owns the lock.
The persistent timer calls this same core. No cloud schedule is activated.

### One-shot non-HTTP maintenance worker

For an explicitly chosen maintenance database, inject `PURGE_DATABASE_URL` using
the runner's secret environment, then run `npm run maintenance:purge -- --execute`
from backend during development, or `node dist/cli/purge.js --execute` after build.
Do not run these commands against real data until operational approval. This
physically removes eligible tombstones; it is not a dry run. There is no HTTP API.

The command does not load `.env` automatically and never falls back to
`DATABASE_URL`. Set `NODE_ENV=production` on a real runner; existing certificate-
verification settings (`DB_SSL_MODE`, optional `DB_SSL_CA`) apply. Only direct or
session connection mode is accepted. Provision a separate least-privilege worker
credential before hosted use; code cannot establish the privilege of a supplied URL.

Exactly `--execute` is required: no retention, cutoff, owner or batch overrides.
One invocation processes at most 500 rows with unchanged 30-day retention. It
owns a dedicated connection and a 30-second execution deadline, force-closing
the connection after timeout/interruption and awaiting connection cleanup.
The deadline does not promise control over OS suspension or blocked event loops;
SQL timeouts remain the database-side bound. An interrupted COMMIT can have an
unknown outcome. Retry explicitly; do not infer zero writes from failure.

Worker stdout is one JSON summary (npm may also print its script banner):
`status`, `purgedCount`, `durationMs`, and a safe failure `code` when applicable.
No transaction IDs, notes, URLs or raw DB errors. `purgedCount` is null on failure.
Exit 0: completed or busy (busy means skipped, not drained); exit 2: batch limit
reached and owner follow-up may be needed; exit 1: invalid input/config or failure.
No auto-retry loop or schedule is installed. SIGINT/SIGTERM request cancellation;
operator alerts, external scheduling and actual hosted verification remain pending.

### Database connection profiles (local readiness continuation)

`DB_CONNECTION_MODE` accepts `direct` (default), `session`, or `transaction`.
Direct/session retain the ten-connection application pool. Transaction mode caps
it at one, disables prepared statements and sets runtime `max_pipeline=1`.
Copy the matching provider URL; changing the mode does not change its host/port.
Readiness uses the same TLS policy but its own bounded one-connection probe, so
the total per-instance connection budget can be two in transaction mode.

`DB_SSL_MODE` defaults to `inherit` for local development and `verify-full` for
production. Production rejects `inherit`; verify-full uses certificate validation
and rejects conflicting URL TLS options. `DB_SSL_CA` may supply the trusted PEM;
without it, runtime trust roots apply. URL `sslrootcert` paths are rejected rather
than silently ignored. Never bypass validation to solve a certificate failure.

Run migrations separately with `DB_CONNECTION_MODE=direct` or `session` and its
matching URL/credentials. The migration CLI refuses transaction mode before any
migration execution. No automatic migrations, hosted pooler compatibility or
provider certificate trust are established merely by these local settings.

### Authentication & Session Endpoints (`/v1`)
- `POST /v1/auth/login` -> Authenticates owner with email & password. On success, rotates session, sets `HttpOnly` `sid` cookie (30-day absolute expiry), and returns `{ user: { id, email, displayName }, csrfToken }`. Generic error on failure.
- `GET /v1/auth/csrf` -> Obtains/refreshes a valid CSRF token for the active session.
- `GET /v1/me` -> Returns current authenticated owner details `{ user: { id, email, displayName } }`. Requires valid session cookie.
- `POST /v1/auth/logout` -> Revokes active session and clears `sid` cookie. Requires valid session cookie and `X-CSRF-Token` header.

## Authentication, Session & CSRF Security Rules

- **Token Security**: Raw session tokens and CSRF tokens are never stored in the database. Only SHA-256 hashes (`token_hash`, `csrf_token_hash`) are persisted.
- **Cookie Security**: Cookies are `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure=true` in production with a 30-day absolute expiration.
- **Session Rotation**: Every successful login revokes any active session for the owner and generates a new session token.
- **CSRF Protection**: All state-changing session requests (such as `/v1/auth/logout`) validate the `X-CSRF-Token` header against the stored CSRF token hash using constant-time comparison.
- **CORS Baseline**: CORS is configured with `credentials: true` and explicitly allows `X-CSRF-Token` header. Wildcard origins are rejected at startup.

## Phase Scope Boundaries

The following capabilities are **explicitly out of scope** in Phase 7B.2.1:

- Public registration & password reset workflows
- Google / OAuth authentication providers
- Frontend synchronization & LocalStorage import
- Domain endpoints (`/v1/pockets`, `/v1/transactions`, `/v1/reports`)
- Cloud deployment infrastructure
