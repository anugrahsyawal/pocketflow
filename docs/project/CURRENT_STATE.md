# PocketFlow Current State

Last updated: 2026-08-13
Branch: `main`
Verified application checkpoint: `7e6c6b5910e23a31f419362b75ee371956a1b314`

## Executive state

PocketFlow is a personal finance application with a completed frontend MVP and an active TypeScript/Fastify/PostgreSQL backend foundation.

The base checkpoint before this task was clean on branch `main` at HEAD `7e6c6b5910e23a31f419362b75ee371956a1b314` (pushed to `origin/main`). Backend foundation (Phase 7B.1, commit `4ac8790`), owner authentication & session lifecycle (Phase 7B.2, commit `e346d8f`), and local PostgreSQL Docker Compose & auth matrix verification (Phase 7B.2.1, commit `7e6c6b5`) have been implemented and Tech Lead verified on VM. Product Owner acceptance of Phase 7B backend milestones is pending.

This documentation set constitutes the Product Owner-accepted docs-only checkpoint dated 2026-08-13 for Phase 7B.2.2 Backend Documentation Reconciliation and Phase 7B.3 Contract Gate (`SETUP_MASTER_DATA_API_CONTRACT.md`). Phase 7B.3 endpoint implementation remains Not Started and awaits separate explicit authorization.

Recent implemented features:
1. Phase 7B.2.1 Local PostgreSQL & Auth Integration Verification (`7e6c6b5910e23a31f419362b75ee371956a1b314`): 127.0.0.1:5432 loopback binding, live Drizzle migrations, 32 schema constraints audit, single-owner CLI provisioning (`npm run owner:provision`), and 13-point HTTP/Auth security verification matrix. (Implemented & Tech Lead verified 2026-08-12; PO Acceptance Pending).
2. Phase 7B.2 Owner Auth & Sessions (`e346d8f`): Fastify auth routes (`/v1/auth/csrf`, `/v1/auth/login`, `/v1/auth/logout`, `/v1/me`), Argon2id password hashing, 30-day HttpOnly cookie sessions, session rotation, hashed database tokens, and `X-CSRF-Token` header protection. (Implemented & Verified; PO Acceptance Pending).
3. Phase 7B.1 Backend Service Foundation (`4ac8790`): Fastify server, Drizzle ORM schema for 8 entities, environment fast-fail validation, CORS restriction, and `/health` route. (Implemented & Verified; PO Acceptance Pending).
4. Frontend `Pindah Alokasi Budget` (`budget-reallocation`) transfer type.
5. Payment Pocket budget owner configuration on Cash & NFC Card detail pages.
6. Reports UI enhancements: full-width period selector, Google Stitch Iteration 3 "Anggaran Periode" card, and compact Export CSV utility button.
7. Home Dashboard completion aligned to Google Stitch Iteration 5.

Local `frontend/node_modules/`, `frontend/dist/`, `backend/node_modules/`, and `backend/dist/` exist as ignored generated/dependency output. They are not tracked and must not be read as project source.

## Implemented and verified (PO Acceptance Pending for Phase 7B)

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

Accepted legacy checkpoints remain accepted. Verification limitations from Phase 7B.2.1 are preserved: CLI owner provisioning check-then-insert is not concurrency atomic, session rotation revoke-then-insert is non-atomic, `/health` endpoint checks service status (not live DB readiness), and automated backend integration test suite is not yet configured.

## Partially implemented or drifted

- Home privacy toggle is currently scoped to Home; an app-wide privacy setting remains future work.
- Transaction history lacks the full approved search and pocket/category/period filter set.
- Pocket create/edit/archive backend endpoints do not exist yet (`/v1/pockets` GET/PATCH specified in Phase 7B.3 contract gate).
- Reports cannot reconstruct historical allocations or balances because no historical snapshot model exists.
- LocalStorage provides local frontend persistence. Manifest and icon assets exist in `frontend/public/`, but no service worker app shell exists (application is not offline-ready; browser installability remains pending).
- The frontend setup flow exposes `budgetPeriodStartDay` even though the approved product period is fixed at 26–25. This is implementation drift; no data migration or code removal is authorized now. The backend strictly enforces 26–25 period rules and does not support configurable start day.
- Settings is a supporting placeholder rather than a complete capability hub.

## Not implemented

- Backend domain endpoints (`/v1/setup`, `/v1/pockets`, `/v1/categories`, `/v1/transactions`, `/v1/reports`).
- Remote synchronization and conflict/deletion propagation queue.
- Production deployment infrastructure, host platform, domain/DNS, and automated backup service.
- Goals.
- JSON receipt import and other Sprint 2/later capabilities.

## Backend readiness

Phase 7A backend architecture decisions (DEC-025 through DEC-028) and Phase 7B auth/session decisions (DEC-029) are accepted.

Phase 7B.1 backend foundation (`4ac8790`), Phase 7B.2 auth/sessions (`e346d8f`), and Phase 7B.2.1 local PostgreSQL integration (`7e6c6b5910e23a31f419362b75ee371956a1b314`) are completed and verified against live PostgreSQL.

Phase 7B.2.2 documentation reconciliation and Phase 7B.3 contract gate (`SETUP_MASTER_DATA_API_CONTRACT.md`) were formally accepted by the Product Owner on 2026-08-13 as the approved contract specification for setup and master data endpoints (`/v1/setup`, `/v1/pockets`, `/v1/categories`). Endpoint implementation remains awaiting separate authorization.

Production deployment remains a separate future phase; provider, region, domain/DNS, and operating budget are intentionally not selected yet.

## Final frontend readiness state

Frontend implementation is ready for review; automated checks and recorded manual regression passed, with PWA installability and offline shell remaining pending:
- `npx tsc --noEmit` passes with 0 errors.
- `npm run build` passes cleanly (*artifact hash may differ on subsequent combined revisions*).
- Dev server runs cleanly without application runtime errors.
- Cross-viewport testing (375px, 390px, 430px) verified.
- Manual test matrix (Reports, Transfers, Budget Reallocation, Cash/NFC Config, Edit Preservation, Archive/Restore/Delete) verified.

## Known quality gaps

- No automated backend integration test runner configured in `backend/package.json`.
- No service worker/offline app-shell implementation (not offline-ready).
- PWA manifest & icon assets exist, but browser installability / install prompt remains unverified/pending.
- React Router `v7_startTransition` and `v7_relativeSplatPath` warnings present in browser console (known non-blocking library notice).
- External Google Fonts/Material Symbols icons rely on network access.

## Current blockers

No application code blocker is recorded. The base checkpoint `7e6c6b5910e23a31f419362b75ee371956a1b314` was clean before this task began. This documentation set constitutes the Product Owner-accepted docs-only checkpoint dated 2026-08-13 for Phase 7B.2.2 documentation reconciliation and Phase 7B.3 contract gate specification (`SETUP_MASTER_DATA_API_CONTRACT.md`). Phase 7B.3 endpoint implementation remains Not Started and awaits separate explicit authorization.

## Do not start

- Phase 7B.3 setup and master data endpoint implementation before separate implementation authorization.
- Transaction (`/v1/transactions`) or Reports (`/v1/reports`) backend endpoints.
- Production infrastructure or deployment before a separate deployment phase is approved.
- Historical snapshot implementation.
- Automatic Sinking Fund transfer.
- Unrefined Sprint 2/later features.
