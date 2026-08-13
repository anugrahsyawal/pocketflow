# PocketFlow Current State

Last updated: 2026-08-13
Branch: `main`
Verified application checkpoint: `6cff955891bc4e09db4a4a08a3a3cf1ecfb17926`

## Executive state

PocketFlow is a personal finance application with a completed frontend MVP and an active TypeScript/Fastify/PostgreSQL backend foundation.

The verified application checkpoint is clean on branch `main` at HEAD `6cff955891bc4e09db4a4a08a3a3cf1ecfb17926` (pushed to `origin/main`). Backend foundation (Phase 7B.1, commit `4ac8790`), owner authentication & session lifecycle (Phase 7B.2, commit `e346d8f`), and local PostgreSQL Docker Compose & auth matrix verification (Phase 7B.2.1, commit `7e6c6b5`) have been implemented and Tech Lead verified on VM (Product Owner acceptance pending for Phase 7B.1/7B.2/7B.2.1).

Phase 7B.3 Setup & Master Data API implementation (commit `6cff955891bc4e09db4a4a08a3a3cf1ecfb17926`) has been delivered, Tech Lead independently verified, and Product Owner accepted in current delivery session. Delivered scope includes setup initialization (`GET /v1/setup`, `PUT /v1/setup`), pockets (`GET /v1/pockets`, `GET /v1/pockets/:id`, `PATCH /v1/pockets/:id`), categories (`GET /v1/categories`, `POST /v1/categories`, `PATCH /v1/categories/:id`), Drizzle migration `drizzle/0002_real_lyja.sql`, and 106 automated integration test cases (101 contract IDs + 2 drift + 3 health/auth regressions) executing on dedicated test database `pocketflow_test_7b3`. Typecheck, build, migration twice pass, Docker container health, and development owner-data preservation were verified cleanly. The next backend implementation phase (`/v1/transactions`) is NOT authorized because a transaction API contract does not yet exist; it requires a separate API contract specification, refinement, and explicit Product Owner authorization before work begins (not a blocker against Phase 7B.3 completion).

Recent implemented features:
1. Phase 7B.3 Setup & Master Data API Implementation (`6cff955891bc4e09db4a4a08a3a3cf1ecfb17926`): Fastify endpoints for setup, pockets, and categories, migration `drizzle/0002_real_lyja.sql`, and 106 automated integration tests (`npm run test:integration`). (Delivered, Tech Lead verified, PO Accepted in current delivery session).
2. Phase 7B.2.1 Local PostgreSQL & Auth Integration Verification (`7e6c6b5910e23a31f419362b75ee371956a1b314`): 127.0.0.1:5432 loopback binding, live Drizzle migrations, 32 schema constraints audit, single-owner CLI provisioning (`npm run owner:provision`), and 13-point HTTP/Auth security verification matrix. (Implemented & Tech Lead verified 2026-08-12; PO Acceptance Pending).
3. Phase 7B.2 Owner Auth & Sessions (`e346d8f`): Fastify auth routes (`/v1/auth/csrf`, `/v1/auth/login`, `/v1/auth/logout`, `/v1/me`), Argon2id password hashing, 30-day HttpOnly cookie sessions, session rotation, hashed database tokens, and `X-CSRF-Token` header protection. (Implemented & Verified; PO Acceptance Pending).
4. Phase 7B.1 Backend Service Foundation (`4ac8790`): Fastify server, Drizzle ORM schema for 8 entities, environment fast-fail validation, CORS restriction, and `/health` route. (Implemented & Verified; PO Acceptance Pending).
5. Frontend `Pindah Alokasi Budget` (`budget-reallocation`) transfer type.
6. Payment Pocket budget owner configuration on Cash & NFC Card detail pages.
7. Reports UI enhancements: full-width period selector, Google Stitch Iteration 3 "Anggaran Periode" card, and compact Export CSV utility button.
8. Home Dashboard completion aligned to Google Stitch Iteration 5.

Local `frontend/node_modules/`, `frontend/dist/`, `backend/node_modules/`, and `backend/dist/` exist as ignored generated/dependency output. They are not tracked and must not be read as project source.

## Implemented and verified (Phase 7B.3 PO Accepted; Phase 7B.1/7B.2/7B.2.1 PO Acceptance Pending)

- Setup & Master Data API endpoints (`GET /v1/setup`, `PUT /v1/setup`, `GET /v1/pockets`, `GET /v1/pockets/:id`, `PATCH /v1/pockets/:id`, `GET /v1/categories`, `POST /v1/categories`, `PATCH /v1/categories/:id`), schema migration `drizzle/0002_real_lyja.sql`, and 106 automated integration tests (`npm run test:integration`) (Delivered, Tech Lead verified, PO Accepted in current delivery session; commit `6cff955891bc4e09db4a4a08a3a3cf1ecfb17926`).
- Local TypeScript + Fastify backend with Drizzle ORM and PostgreSQL 16 schema definitions (Implemented & Tech Lead Verified; PO Acceptance Pending).
- Single-owner CLI provisioning (`npm run owner:provision`) with Argon2id password hashing and single-owner database constraint (Implemented & Verified; PO Acceptance Pending).
- Versioned authentication routes (`/v1/auth/login`, `/v1/auth/logout`, `/v1/me`, `/v1/auth/csrf`), session rotation, 30-day HttpOnly `sid` cookies, SHA-256 token hashing, and `X-CSRF-Token` protection (Implemented & Verified; PO Acceptance Pending).
- Database relational integrity constraints: non-negative integer money (`opening_balance >= 0`, `allocated_amount >= 0`, `amount > 0`), exclusive transaction topology check constraint, fixed 26–25 budget period check constraint, duplicate allocation unique constraint, and duplicate session token hash unique constraint (Implemented & Verified; PO Acceptance Pending).
- Mock frontend authentication and protected routes for development.
- Frontend setup wizard and initial pocket template.
- Pocket list/detail and category management frontend.
- Expense, income, transfer, edit, archive, restore, permanent delete, and multi-entry expense flows on frontend.
- `Pindah Alokasi Budget` transfer type for active period allocation and balance reallocation.
- Pocket budget owner configuration on Cash & NFC Card detail pages with fallback to payment pocket.
- Reports period navigation, full-width period selector, Stitch Iteration 3 Anggaran Periode card, cash-flow analytics, category/pocket breakdowns, Budget vs Actual, aggregate weekly usage, deterministic insights, informational Sinking Fund recommendation, and selected-period CSV export.

Accepted legacy checkpoints remain accepted. Verification limitations from Phase 7B.2.1 are preserved: CLI owner provisioning check-then-insert is not concurrency atomic, session rotation revoke-then-insert is non-atomic, and `/health` endpoint checks service status (not live DB readiness). The automated backend integration test runner quality gap (R-010) was resolved in Phase 7B.3 (`npm run test:integration`).

## Partially implemented or drifted

- Home privacy toggle is currently scoped to Home; an app-wide privacy setting remains future work.
- Transaction history lacks the full approved search and pocket/category/period filter set.
- Pocket create/edit/archive backend endpoints: `GET /v1/pockets`, `GET /v1/pockets/:id`, and `PATCH /v1/pockets/:id` implemented in Phase 7B.3. `POST /v1/pockets` is absent from approved route list and remains intentionally unassigned.
- Reports cannot reconstruct historical allocations or balances because no historical snapshot model exists.
- LocalStorage provides local frontend persistence. Manifest and icon assets exist in `frontend/public/`, but no service worker app shell exists (application is not offline-ready; browser installability remains pending).
- The frontend setup flow exposes `budgetPeriodStartDay` even though the approved product period is fixed at 26–25. This is implementation drift; no data migration or code removal is authorized now. The backend strictly enforces 26–25 period rules and does not support configurable start day.
- Settings is a supporting placeholder rather than a complete capability hub.

## Not implemented

- Backend domain endpoints for transactions (`/v1/transactions`) and reports (`/v1/reports`). Setup & master data endpoints (`/v1/setup`, `/v1/pockets`, `/v1/categories`) were delivered in Phase 7B.3.
- Remote synchronization and conflict/deletion propagation queue.
- Production deployment infrastructure, host platform, domain/DNS, and automated backup service.
- Goals.
- JSON receipt import and other Sprint 2/later capabilities.

## Backend readiness

Phase 7A backend architecture decisions (DEC-025 through DEC-028) and Phase 7B auth/session decisions (DEC-029) are accepted.

Phase 7B.1 backend foundation (`4ac8790`), Phase 7B.2 auth/sessions (`e346d8f`), and Phase 7B.2.1 local PostgreSQL integration (`7e6c6b5910e23a31f419362b75ee371956a1b314`) are completed and verified against live PostgreSQL (PO acceptance pending).

Phase 7B.2.2 documentation reconciliation and Phase 7B.3 contract gate (`SETUP_MASTER_DATA_API_CONTRACT.md`) were formally accepted by the Product Owner on 2026-08-13. Phase 7B.3 Setup & Master Data API implementation (`6cff955891bc4e09db4a4a08a3a3cf1ecfb17926`) is delivered, Tech Lead independently verified (106 integration tests passing), and Product Owner accepted in current delivery session. Next backend implementation phase (`/v1/transactions`) is NOT authorized because a transaction API contract does not yet exist; it requires separate contract specification and PO authorization.

Production deployment remains a separate future phase; provider, region, domain/DNS, and operating budget are intentionally not selected yet.

## Final frontend readiness state

Frontend implementation is ready for review; automated checks and recorded manual regression passed, with PWA installability and offline shell remaining pending:
- `npx tsc --noEmit` passes with 0 errors.
- `npm run build` passes cleanly (*artifact hash may differ on subsequent combined revisions*).
- Dev server runs cleanly without application runtime errors.
- Cross-viewport testing (375px, 390px, 430px) verified.
- Manual test matrix (Reports, Transfers, Budget Reallocation, Cash/NFC Config, Edit Preservation, Archive/Restore/Delete) verified.

## Known quality gaps

- Automated backend integration test runner configured in `backend/package.json` (`npm run test:integration`) — RESOLVED in Phase 7B.3.
- No service worker/offline app-shell implementation (not offline-ready).
- PWA manifest & icon assets exist, but browser installability / install prompt remains unverified/pending.
- React Router `v7_startTransition` and `v7_relativeSplatPath` warnings present in browser console (known non-blocking library notice).
- External Google Fonts/Material Symbols icons rely on network access.

## Current blockers

No application code blocker is recorded. Phase 7B.3 Setup & Master Data API implementation is completed, verified, and PO accepted at HEAD `6cff955891bc4e09db4a4a08a3a3cf1ecfb17926` (pushed `origin/main`). Transaction API implementation (`/v1/transactions`) is NOT authorized because a transaction API contract does not yet exist; it requires a separate contract specification and PO authorization before work begins (not a blocker against Phase 7B.3).

## Do not start

- Transaction (`/v1/transactions`) or Reports (`/v1/reports`) backend endpoints before a separate API contract is specified, refined, and explicitly authorized by Product Owner.
- Production infrastructure or deployment before a separate deployment phase is approved.
- Historical snapshot implementation.
- Automatic Sinking Fund transfer.
- Unrefined Sprint 2/later features.
