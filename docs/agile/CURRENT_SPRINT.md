# Current Sprint

Sprint: Backend MVP Foundation & Transaction API Implementation
Status: Phase 7B.4 Idempotency Remediation Verified and PO Accepted
Current checkpoint: Phase 7B.4 Idempotency Remediation

## Terminology

A Sprint is the product-delivery container. A Phase is a technical
implementation or verification substage inside the Sprint.

## Sprint goal

Build a secure, verified TypeScript/Fastify/PostgreSQL backend foundation and deliver setup, master data, and transaction endpoints with complete, non-ambiguous API contract verification.

## Completed phases & polish

- Phase 7B.4 — Transaction API Implementation (Delivered, verified at checkpoint with 178 integration tests, PO Acceptance Pending).
- Phase 7B.3 — Setup & Master Data API Implementation (Done, Tech Lead verified, PO accepted, commit `6cff955891bc4e09db4a4a08a3a3cf1ecfb17926` pushed to `origin/main`).
- Phase 7B.2.2 — Backend Documentation Reconciliation & Phase 7B.3 Contract Gate (Done, commit `5f29ac5`).
- Phase 7B.1 — Backend Service & Database Foundation (Done, commit `4ac8790`).
- Phase 7B.2 — Owner Authentication & Secure Session (Done, commit `e346d8f`).
- Phase 7B.2.1 — Local PostgreSQL & Auth Integration Verification (Done, commit `7e6c6b5910e23a31f419362b75ee371956a1b314` pushed to `origin/main`).
- Phase 6E — Integrated Reports QA, PWA Asset Verification, and Frontend Polish (Done, commit `b3d7f99`).
- Phase 6D — Rule-Based Insights and Sinking Fund Recommendation (Done, commit `9297f37`).

## Active status

### PO-authorized direct remediation — 2026-09-14

Implemented and locally verified: 193 tests pass, including 15 new idempotency
regressions. Both Windows-review findings are closed at the technical level;
PO accepted the remediation and authorized commit/push on 2026-09-14. See
[remediation evidence](../walkthroughs/phase-7b4-idempotency-remediation.md).

The Product Owner assigned Codex to implement the two Phase 7B.4 idempotency
fixes directly. This continues the existing review/remediation work with its
four uncommitted documentation files preserved; it does not start a new phase.
Scope: transaction mutation replay/coordination, batch item replay, regression
tests and delivery evidence only. No dependencies, schema changes, frontend,
Reports API, sync or deployment are authorized by this bounded continuation.

### Windows re-verification — 2026-09-13

PO authorized local PostgreSQL setup and continuation of backend verification.
PostgreSQL 16.15, separate development/test databases and four migrations are
ready. All 178 baseline tests pass, but additional review reproduced two
idempotency defects. Next gate is bounded Phase 7B.4 remediation and regression
review, not Reports or deployment. See
[review findings](../walkthroughs/phase-7b4-windows-reverification.md).
This authorized verification supersedes the older docs-only restriction on
local database state changes for this task; no production database is involved.

### PO-requested frontend polish interlude — 2026-09-12

The Product Owner authorized Codex to refine the existing frontend directly
before continuing hosting work. Scope is presentation and shared interaction
quality only, with the existing MVP rules and design theme preserved. This
explicit request supersedes the prior frontend exclusion for this bounded task
only. Implementation and bounded verification are complete; the Product Owner
accepted the frontend and authorized commit/push. See
[frontend quality polish](../walkthroughs/frontend-quality-polish.md).

### Backend checkpoint (unchanged)

Phase 7B.4 Transaction API Implementation is **DELIVERED AND AUTOMATICALLY VERIFIED** (Product Owner Acceptance Pending):

- Delivered 7 Fastify endpoints (`GET /v1/transactions`, `POST /v1/transactions`, `POST /v1/transactions/batch`, `PATCH /v1/transactions/:id`, `POST /v1/transactions/:id/archive`, `POST /v1/transactions/:id/restore`, `DELETE /v1/transactions/:id`), Drizzle database migration `drizzle/0003_bumpy_chat.sql`, background 30-day tombstone purge scheduler (`startPurgeScheduler`) with `transaction_purge_logs` audit logging, and 178 automated integration test cases (`npm run test:integration`);
- Verified `git diff --check`, `npm run typecheck`, `npm run build`, and 100% test pass rate across 15 test suites cleanly;
- Preserved historical acceptance states: Phase 7B.3 is PO Accepted; Phase 7B.1, 7B.2, 7B.2.1, and 7B.4 remain PO Acceptance Pending;
- Reports backend endpoints (`/v1/reports*`) remain **EXPLICITLY NOT STARTED AND NOT AUTHORIZED** pending separate contract specification and Product Owner authorization.

## Explicitly out of scope for current task

- Implementation of reports (`/v1/reports`) backend endpoints (awaiting separate API contract and PO authorization).

- Database migration execution or container state changes during docs reconciliation.
- Frontend code modifications.
- Remote synchronization queue implementation.
- Production infrastructure and deployment.
- Unrefined Sprint 2/later capabilities.

## Sprint success conditions

- Approved scope and acceptance criteria are traceable across canonical docs.
- `SETUP_MASTER_DATA_API_CONTRACT.md` covers exact JSON examples, field types, validation errors, fixed 26–25 period rules, setup completion database migration requirement, server template key mapping, idempotency, revision control, cross-owner isolation, unpaginated filter list semantics, derived balance rules, grouped comprehensive integration test inventory, and entry gate.
- Markdown links and git diff checks pass cleanly.
- Current state, backlog, traceability, walkthroughs, and handoff agree.
