# PocketFlow Backend Service

Local backend service and database foundation for PocketFlow personal finance application.

## Prerequisites

- **Node.js**: v20.6.0 or higher (required for native `--env-file` environment loading)
- **npm**: v9.0.0 or higher
- **PostgreSQL**: v14.0 or higher (for local database instance)

## Setup & Configuration

1. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

2. Configure environment variables in `.env`:

```env
NODE_ENV=development
PORT=3000
HOST=127.0.0.1
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/pocketflow
CORS_ORIGIN=http://localhost:5173
SESSION_SECRET=your-secure-random-session-secret
```

> **Note**: `DATABASE_URL` and `SESSION_SECRET` are required at server startup. The server will fail fast if either variable is missing or empty. `CORS_ORIGIN` must be a valid single HTTP/HTTPS origin (wildcards `*` are strictly prohibited and will cause startup failure).
> Environment variables are loaded natively via Node `--env-file=.env` without external dependencies.

## Developer Commands

- **Install dependencies**: `npm install`
- **Type check**: `npm run typecheck`
- **Build TypeScript**: `npm run build`
- **Generate migrations**: `npm run db:generate`
- **Run dev server**: `npm run dev`
- **Run production build**: `npm run start`

## API Endpoints

In Phase 7B.1, only the health endpoint is exposed:

- `GET /health` -> Returns `{"status": "ok", "service": "pocketflow-api"}`

## Architecture & Data Model Constraints

- **Integer Money**: All Rupiah amounts are stored as integers/bigints, never floating-point numbers.
- **Time Audit**: Business dates use local `DATE` (`occurred_on`), business times use local `TIME` (`occurred_at_local_time`), audit timestamps use UTC.
- **Fixed Budget Period**: `budget_periods` enforces a fixed 26–25 period (`start_date` day 26, `end_date` day 25, exactly 1 month minus 1 day).
- **Pocket Allocation Uniqueness**: `pocket_budget_allocations` enforces `UNIQUE(budget_period_id, pocket_id)`.
- **Non-Negative Balances/Allocations**: `pockets.opening_balance >= 0` and `pocket_budget_allocations.allocated_amount >= 0`.
- **Exclusive Transaction Topology**: `transactions` enforces `amount > 0` and strict exclusive field requirements:
  - `expense` / `income`: requires `pocket_id` and prohibits `from_pocket_id`/`to_pocket_id`.
  - `transfer`: requires distinct `from_pocket_id` & `to_pocket_id` and prohibits `pocket_id`.
- **Tombstone Deletion**: Deletion sets `deleted_at` timestamp (30-day retention). No hard deletion logic.
- **Revision Tracking**: Mutable entities retain a `revision` counter for financial sync conflict detection.
- **Idempotency**: All mutations carry a `clientMutationId` bound to `user_id`.

## Phase 7B.1 Scope Boundaries

The following capabilities are **explicitly out of scope** in Phase 7B.1:

- Domain API endpoints (`/auth`, `/pockets`, `/transactions`, `/reports`)
- Frontend synchronization & LocalStorage import
- Unattended background backup jobs or automatic tombstone purges
- Cloud deployment infrastructure
