# PocketFlow Current State

Last updated: 2026-08-13
Branch: `main`
Verified application checkpoint: `6cff955891bc4e09db4a4a08a3a3cf1ecfb17926`

## Executive state

**Latest remediation — 2026-09-14:** Codex implemented the two Phase 7B.4
idempotency fixes under explicit PO authorization. All 193 integration tests
(including 15 new regressions), type-check, build, repeat migrations and bounded
HTTP smoke checks passed. The original duplicate-item and concurrent-500
reproductions now return the original transaction without duplicate effects.
PO accepted this remediation and authorized commit/push on 2026-09-14. See
[remediation walkthrough](../walkthroughs/phase-7b4-idempotency-remediation.md).

**Latest verification — 2026-09-13:** Frontend polish was pushed in `90b3e59`.
PostgreSQL 16.15 is installed locally on Windows; development and test databases
are separated. Type-check, build, repeated migrations and all 178 integration
tests passed. Additional review reproduced duplicate expenses across batch
roots with a reused item mutation ID and a 500 response for concurrent identical
single POST requests. Phase 7B.4 requires bounded remediation before new feature
work; its PO acceptance remains pending. See
[Windows re-verification](../walkthroughs/phase-7b4-windows-reverification.md).

**Latest local work — 2026-09-12:** After pulling `origin/main` through `84af8c9`,
the Product Owner requested frontend quality polish before hosting work. This
bounded visual/accessibility change is implemented locally, with type-check,
build and browser evidence recorded in
[the walkthrough](../walkthroughs/frontend-quality-polish.md). The Product Owner
accepted the visual result and authorized commit/push. Backend checkpoint acceptance below
is unchanged; no hosting or sync implementation was started.

PocketFlow is a personal finance application with a completed frontend MVP and an active TypeScript/Fastify/PostgreSQL backend foundation.

The verified application checkpoint is clean on branch `main` at HEAD `6cff955891bc4e09db4a4a08a3a3cf1ecfb17926` (pushed to `origin/main`). Backend foundation (Phase 7B.1, commit `4ac8790`), owner authentication & session lifecycle (Phase 7B.2, commit `e346d8f`), and local PostgreSQL Docker Compose & auth matrix verification (Phase 7B.2.1, commit `7e6c6b5`) have been implemented and Tech Lead verified on VM (Product Owner acceptance pending for Phase 7B.1/7B.2/7B.2.1).

Phase 7B.3 Setup & Master Data API implementation (commit `6cff955891bc4e09db4a4a08a3a3cf1ecfb17926`) has been delivered, Tech Lead independently verified, and Product Owner accepted. Delivered scope includes setup initialization (`GET /v1/setup`, `PUT /v1/setup`), pockets (`GET /v1/pockets`, `GET /v1/pockets/:id`, `PATCH /v1/pockets/:id`), categories (`GET /v1/categories`, `POST /v1/categories`, `PATCH /v1/categories/:id`), Drizzle migration `drizzle/0002_real_lyja.sql`, and 106 automated integration test cases executing on dedicated test database `pocketflow_test_7b3`.

Phase 7B.4 Transaction API implementation has been delivered and verified against the test suite (178 passing integration tests across 15 suites, `tsc --noEmit`, `npm run build`, and clean `git diff --check`). Delivered scope includes 7 Fastify endpoints (`GET /v1/transactions`, `POST /v1/transactions`, `POST /v1/transactions/batch`, `PATCH /v1/transactions/:id`, `POST /v1/transactions/:id/archive`, `POST /v1/transactions/:id/restore`, `DELETE /v1/transactions/:id`), Drizzle migration `drizzle/0003_bumpy_chat.sql`, and background 30-day tombstone purge scheduler with audit logging (Implemented & Automated Verification Passed; PO Acceptance Pending). The Reports backend (`/v1/reports`) remains explicitly not started and not authorized pending separate contract specification and Product Owner authorization.

Recent implemented features:
1. Phase 7B.4 Transaction API Implementation: Fastify endpoints for transactions (`GET /v1/transactions`, `POST /v1/transactions`, `POST /v1/transactions/batch`, `PATCH /v1/transactions/:id`, `POST /v1/transactions/:id/archive`, `POST /v1/transactions/:id/restore`, `DELETE /v1/transactions/:id`), migration `drizzle/0003_bumpy_chat.sql`, background 30-day tombstone purge scheduler with audit logging, and 178 automated integration tests (`npm run test:integration`) (Implemented & Automated Verification Passed; PO Acceptance Pending).
2. Phase 7B.3 Setup & Master Data API Implementation (`6cff955891bc4e09db4a4a08a3a3cf1ecfb17926`): Fastify endpoints for setup, pockets, and categories, migration `drizzle/0002_real_lyja.sql`, and 106 automated integration tests (`npm run test:integration`). (Delivered, Tech Lead verified, PO Accepted).
3. Phase 7B.2.1 Local PostgreSQL & Auth Integration Verification (`7e6c6b5910e23a31f419362b75ee371956a1b314`): 127.0.0.1:5432 loopback binding, live Drizzle migrations, 32 schema constraints audit, single-owner CLI provisioning (`npm run owner:provision`), and 13-point HTTP/Auth security verification matrix. (Implemented & Tech Lead verified 2026-08-12; PO Acceptance Pending).
4. Phase 7B.2 Owner Auth & Sessions (`e346d8f`): Fastify auth routes (`/v1/auth/csrf`, `/v1/auth/login`, `/v1/auth/logout`, `/v1/me`), Argon2id password hashing, 30-day HttpOnly cookie sessions, session rotation, hashed database tokens, and `X-CSRF-Token` header protection. (Implemented & Verified; PO Acceptance Pending).
5. Phase 7B.1 Backend Service Foundation (`4ac8790`): Fastify server, Drizzle ORM schema for 8 entities, environment fast-fail validation, CORS restriction, and `/health` route. (Implemented & Verified; PO Acceptance Pending).
6. Frontend `Pindah Alokasi Budget` (`budget-reallocation`) transfer type.
7. Payment Pocket budget owner configuration on Cash & NFC Card detail pages.
8. Reports UI enhancements: full-width period selector, Google Stitch Iteration 3 "Anggaran Periode" card, and compact Export CSV utility button.
9. Home Dashboard completion aligned to Google Stitch Iteration 5.

Local `frontend/node_modules/`, `frontend/dist/`, `backend/node_modules/`, and `backend/dist/` exist as ignored generated/dependency output. They are not tracked and must not be read as project source.

## Implemented and verified (Phase 7B.3 PO Accepted; Phase 7B.1/7B.2/7B.2.1/7B.4 PO Acceptance Pending)

- Transaction API endpoints (`GET /v1/transactions`, `POST /v1/transactions`, `POST /v1/transactions/batch`, `PATCH /v1/transactions/:id`, `POST /v1/transactions/:id/archive`, `POST /v1/transactions/:id/restore`, `DELETE /v1/transactions/:id`), schema migration `drizzle/0003_bumpy_chat.sql`, background 30-day tombstone purge worker, and 178 automated integration tests (`npm run test:integration`) (Implemented & Automated Verification Passed; PO Acceptance Pending).
- Setup & Master Data API endpoints (`GET /v1/setup`, `PUT /v1/setup`, `GET /v1/pockets`, `GET /v1/pockets/:id`, `PATCH /v1/pockets/:id`, `GET /v1/categories`, `POST /v1/categories`, `PATCH /v1/categories/:id`), schema migration `drizzle/0002_real_lyja.sql`, and 106 automated integration tests (`npm run test:integration`) (Delivered, Tech Lead verified, PO Accepted; commit `6cff955891bc4e09db4a4a08a3a3cf1ecfb17926`).
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

- Backend domain endpoints for reports (`/v1/reports`) remain not implemented and not authorized pending separate contract specification and PO authorization. (Setup & master data endpoints were delivered in Phase 7B.3; transaction endpoints were delivered in Phase 7B.4).
- Remote synchronization and conflict/deletion propagation queue.
- Production deployment infrastructure, host platform, domain/DNS, and automated backup service.
- Goals.
- JSON receipt import and other Sprint 2/later capabilities.

## Backend readiness

Phase 7A backend architecture decisions (DEC-025 through DEC-028) and Phase 7B auth/session decisions (DEC-029) are accepted.

Phase 7B.1 backend foundation (`4ac8790`), Phase 7B.2 auth/sessions (`e346d8f`), and Phase 7B.2.1 local PostgreSQL integration (`7e6c6b5910e23a31f419362b75ee371956a1b314`) are completed and verified against live PostgreSQL (PO acceptance pending).

Phase 7B.2.2 documentation reconciliation and Phase 7B.3 contract gate (`SETUP_MASTER_DATA_API_CONTRACT.md`) were formally accepted by the Product Owner on 2026-08-13. Phase 7B.3 Setup & Master Data API implementation (`6cff955891bc4e09db4a4a08a3a3cf1ecfb17926`) is delivered, Tech Lead independently verified (106 integration tests passing), and Product Owner accepted. Phase 7B.4 Transaction API Contract Specification ([TRANSACTIONS_API_CONTRACT.md](../architecture/TRANSACTIONS_API_CONTRACT.md)) was formally accepted by the Product Owner on 2026-08-24 ([DEC-030](../decisions/DECISION_LOG.md#dec-030---transaction-api-contract-decisions-finalization)). Phase 7B.4 Transaction API endpoint implementation has been delivered and verified against 178 integration tests (PO acceptance pending). The Reports backend (`/v1/reports*`) remains explicitly not started and not authorized pending separate contract specification and PO authorization.

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

The two idempotency blockers reproduced on 2026-09-13 were fixed and verified
on 2026-09-14 with 193 passing tests and repeat reproduction checks. PO accepted
the remediation and authorized commit/push. See the
[remediation walkthrough](../walkthroughs/phase-7b4-idempotency-remediation.md).
Reports API implementation (`/v1/reports`) remains not started and not authorized
pending separate contract specification and PO authorization.

## Do not start

- Reports (`/v1/reports`) backend endpoints before a separate API contract is specified, refined, and explicitly authorized by Product Owner.
- Production infrastructure or deployment before a separate deployment phase is approved.
- Historical snapshot implementation.
- Automatic Sinking Fund transfer.
- Unrefined Sprint 2/later features.
