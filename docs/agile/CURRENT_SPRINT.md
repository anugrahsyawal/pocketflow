# Current Sprint

Sprint: Backend MVP Foundation & Transaction API Implementation
Status: Phase 7C.2 Delivered — Technical Audit / Product Owner Review Gate
Current checkpoint: Phase 7C.1 pushed as `cd2154b`; Phase 7C.2 uncommitted

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

Current consolidated delivery: setup, master-data reads and approved pocket /
category mutations implemented in connected mode. Refer to the
[final audit](../walkthroughs/phase-7c2-final-audit.md) for exact verification,
limitations and phase gate. No 7C.3 authorization or commit/push is inferred.

### Historical slice checkpoints

The entries below record progress at each date; pending statements in older
entries and baseline exclusions are not current phase instructions.

### Opening balance correction — 2026-09-28

Connected editor and explicit impact confirmation delivered. Builds/type-checks
and isolated browser QA passed; see [evidence](../walkthroughs/phase-7c2-opening-balance.md).
Final 7C.2 audit/PO review remain, not advancement to transactions or deployment.

### Pocket group/spendable settings — 2026-09-28

Editor and API integration implemented; builds/type-check and browser QA passed.
See [evidence](../walkthroughs/phase-7c2-pocket-classification.md). Opening-balance
correction UI and phase audit remain; allocation editing is not in this contract.

### Category creation UI and durable recovery — 2026-09-28

Create form and owner-scoped IndexedDB journal implemented; 292 integration tests,
browser recovery/regression checks, type-checks and builds passed.
No fresh mutation ID on an unresolved outcome; legacy storage untouched. See
[evidence](../walkthroughs/phase-7c2-category-create-ui.md). Final phase/PO review
and remaining pocket fields are pending. No commit/push or phase advancement.

### Category creation transport — 2026-09-27

Typed immutable POST integration added; 289 tests, builds/type-checks and existing
browser regressions pass. Create UI awaits durable owner-scoped
attempt recovery. See [evidence and next-slice gate](../walkthroughs/phase-7c2-category-create-transport.md).
No phase advancement or commit/push.

### Pocket lifecycle UI — 2026-09-27

Archive/restore confirmation and archived list delivered, with explicit wallet
mapping recovery. 283 integration tests, browser QA, type-checks and builds pass; see
[evidence](../walkthroughs/phase-7c2-pocket-lifecycle-ui.md). PO review pending.
No new phase, migration, commit or push.

### Pocket lifecycle transport — 2026-09-27

Narrow revision-aware archive/restore transport added; 281 integration tests,
build/type-check and existing UI browser regression checks pass.
No lifecycle UI enabled; archived list/confirmation and wallet recovery UI are next.
See [evidence](../walkthroughs/phase-7c2-pocket-lifecycle-transport.md).

### Category lifecycle and pocket labels — 2026-09-27

Category archive/restore delivered and reviewed with 272 tests and browser QA.
Pocket name/emoji editor added in the same phase; 276 integration tests,
builds/type-checks and browser QA pass. Current verification is recorded
in [checkpoint](../walkthroughs/phase-7c2-pocket-label.md). Category creation and
remaining pocket forms are pending. No advancement to 7C.3 or commit/push.

### Category label editing — 2026-09-25

Name/emoji editing delivered with 271 passing tests and browser evidence.
See [checkpoint](../walkthroughs/phase-7c2-category-edit.md). No new phase started;
category creation/lifecycle and remaining pocket forms still pending.

### Cash/NFC configuration form — 2026-09-25

Connected budget-owner form and browser error/retry/reload checks delivered.
See [evidence](../walkthroughs/phase-7c2-budget-owner-form.md). PO review pending;
other pocket and category mutation forms remain unfinished in the same phase.

### Cash/NFC edit transport foundation — 2026-09-24

Added typed revision-aware budget-owner PATCH transport and tests. No edit UI
enabled yet; implement recovery/conflict UX before exposing the write. See
[evidence](../walkthroughs/phase-7c2-budget-owner-transport.md). Same phase;
no commit/push or advancement to transactions.

### Read-only master-data continuation — 2026-09-19

PO authorized commit/push of 7C.1 and continuation. Commit `cd2154b` is pushed
to the active branch, not main. 7C.2 read integration is implemented and verified
with 252 passing tests and browser evidence. Setup submission is now implemented
with 259 passing tests after a browser-discovered insertion-order bug fix.
Browser QA passed; PO review and master-data edits remain unfinished.
See [read checkpoint](../walkthroughs/phase-7c2-master-data-read.md)
and [setup checkpoint](../walkthroughs/phase-7c2-setup-submission.md).

### Connected session implementation — 2026-09-15

Plan committed, clean-tree gate passed, isolated session integration delivered.
See [verification](../walkthroughs/phase-7c1-connected-session.md). This supersedes
the prior documentation-commit gate below; 7C.2 has not started.

### Frontend/API continuation — 2026-09-15

The PO requested the next integration stage. The source audit and
[bounded integration plan](../architecture/FRONTEND_API_INTEGRATION_PLAN.md)
identify identity, session, async-write, pagination and legacy-data boundaries.
PO confirmed temporary connected-mode behavior and authorized 7C.1 implementation.
The documentation checkpoint is uncommitted; obtain commit permission and satisfy
the clean-tree gate before coding. No frontend, database or local storage changed.
Older phase-specific exclusions below describe their historical scope.

### Implementation authorization — 2026-09-14

The PO accepted the complete Reports contract, authorized its commit and asked
Codex to implement immediately. Contract `0e2eb5e` was committed first and the
clean-tree gate passed. The two Reports routes and tests are implemented; see
[delivery evidence](../walkthroughs/phase-7b5-reports-api.md). Implementation
acceptance and commit remain pending. The older Reports exclusions and
contract-only checkpoints below are historical and superseded for this bounded
phase. Frontend, sync and deployment remain outside scope.

### Reports contract refinement — 2026-09-14

Phase 7B.4 remediation was committed and pushed to `origin/main` at `5e019db`.
PO requested continuation; Codex started the required Reports contract stage
from a clean tree. The PO accepted the three recommendations under DEC-031.
The [technical contract](../architecture/REPORTS_API_CONTRACT.md) now defines
wire fields, null states, exclusions, calculations, errors and test matrix.
Endpoint implementation remains gated on finalized contract
acceptance and separate explicit authorization. No new backend code in this stage.

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

- Frontend integration with Reports API and work beyond the approved two read-only routes.

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
