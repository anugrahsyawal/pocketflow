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
