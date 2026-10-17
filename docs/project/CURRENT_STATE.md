# PocketFlow Current State

Last updated: 2026-10-17
Branch: `codex/audit-pocketflow-documentation`
Latest committed checkpoint: `89b4e65` (Phase 7C.3 single-transaction integration, pushed to origin/codex/audit-pocketflow-documentation)

## Executive state

**Batch transport — 2026-10-17:** Typed immutable batch create/resolve transport
and strict ordered/mixed-outcome validation implemented. [Evidence](../walkthroughs/phase-7c3-batch-transport.md):
26 targeted tests, both frontend builds and automated browser transport QA passed.
Shared journal and connected batch UI remain pending; no batch button enabled.

**Batch resolution backend — 2026-10-17:** PO continuation approved DEC-036.
Shared batch validation and root/item locking now support terminal resolution,
preserving committed items and fencing remaining identities. See
[checkpoint](../walkthroughs/phase-7c3-batch-resolution.md). Connected batch transport,
shared journal and UI are next within the same phase; no new user-facing control yet.

**Batch recovery audit — 2026-10-17:** Existing API characterization and a
[bounded proposal](../architecture/BATCH_ATTEMPT_RESOLUTION_PROPOSAL.md) now cover
root/item identity and previously committed items. The audit-time approval gate
is superseded by DEC-036 above. See consolidated audit for historical tests.

**Consolidated audit — 2026-10-17:** Checkpoint `89b4e65` committed/pushed; fresh
backend/frontend checks pass. [Audit and manual checklist](../walkthroughs/phase-7c3-consolidated-audit.md)
separate delivered single operations from missing connected batch/export and
manual acceptance. Phase 7C.3 remains open; no 7C.4 cutover/deployment implied.
The audit itself is subsequent local documentation, not part of that commit.

**Commit authorization — 2026-10-17:** PO explicitly requested commit/push of
the accumulated Phase 7C.3 checkpoint and continuation. This authorizes Git
delivery, not a claim of completed manual acceptance. Next task is consolidated
phase audit and the remaining acceptance checklist; no production cutover.

**Edit extended review — 2026-10-16:** Inactive category/pocket references now
block edit confirmation with guidance before journal/network dispatch. Automated
browser coverage now includes archived expense neutrality, explicit category
clearing and reallocation amount/date/destination/cross-period rejection. See
[evidence](../walkthroughs/phase-7c3-edit-ui.md#extended-review--2026-10-16-continuation).
Manual/PO acceptance remains pending; no new phase or commit/push.

**Edit form — 2026-10-16:** Connected history now opens an expense/income/transfer
editor prefilled from its server DTO, with fixed type, changed-only PATCH,
confirmation and shared durable recovery. Category is cleared explicitly when the
expense payment pocket changes; budget attribution remains server-owned. See
[evidence](../walkthroughs/phase-7c3-edit-ui.md). Earlier form-pending entries are
historical. Manual acceptance and extended edge-case review remain pending; this
is not normal-mode cutover or full Phase 7C.3 acceptance.

**Edit shared recovery — 2026-10-16:** Edit records now use the existing owner
IndexedDB slot with original type, target and exact PATCH body. All consumers
recognize edit; history recovery offers explicit same-ID retry/stop and canonical
refresh while create remains blocked. See [evidence](../walkthroughs/phase-7c3-edit-recovery.md).
No new edit form/button yet. Next is canonical prefill/confirmation UI within DEC-035;
earlier journal-pending notes are historical. Same uncommitted Phase 7C.3.

**Edit frontend transport — 2026-10-04:** Typed PATCH/resolve transport now validates
immutable requests, owner preflight and matching historical acknowledgements.
Five targeted integration tests, both frontend builds and real-browser transport
QA pass. See [evidence](../walkthroughs/phase-7c3-edit-transport.md). Shared edit
journal, recovery controls and user-facing form remain unfinished; transport alone
must not be wired to a button. Same approved, uncommitted Phase 7C.3.

**Edit resolution backend — 2026-10-04:** PO approved DEC-035 by requesting
continuation after the proposal. Shared PATCH validation, original-request hashing,
terminal cancellation fencing and strict historical acknowledgement validation are
implemented. PATCH schema now documents nullable category/source clearing. See
[checkpoint](../walkthroughs/phase-7c3-edit-resolution.md). Frontend edit transport,
journal and form remain unfinished within the approved scope; no edit UI activated.
This supersedes the edit-proposal approval gate, not full Phase 7C.3 acceptance.

**Delete recovery/UI — 2026-10-04:** PO approved DEC-034. Server resolution,
strict delete journal/transport and separate permanent-delete confirmation are
implemented in connected development. Lost responses retain original intent;
resolution preserves completed deletion or fences an unexecuted request. See
[verification](../walkthroughs/phase-7c3-delete-recovery-ui.md). This supersedes
approval/recovery/UI gates below. Edit/batch, offline, migration and deployment
remain outside this slice; same uncommitted 7C.3, PO delivery review pending.

**Delete recovery audit — 2026-10-01:** A bounded
[delete resolution proposal](../architecture/DELETE_ATTEMPT_RESOLUTION_PROPOSAL.md)
is ready for PO approval. Existing rejection replay and post-purge acknowledgement
are audited; no contract, backend or UI behavior changed in this continuation.
Next gate: approve the delete-specific extension before implementing recovery/UI.

**Delete transport — 2026-10-01:** Existing DELETE contract now has a strict,
owner-checked frontend transport with explicit confirmation and immutable retry.
See [evidence](../walkthroughs/phase-7c3-delete-transport.md). No delete button or
delete journal enabled: durable recovery and safe rejection exit remain gates.
DEC-032/033 resolution does not cover delete. Backend contract/source unchanged;
same uncommitted Phase 7C.3, not daily-use or full-phase acceptance.

**Lifecycle UI — 2026-10-01:** Connected history now offers explicit archive/restore
confirmation, durable same-ID retry and confirmed terminal resolution (DEC-033).
Successful acknowledgement triggers canonical pocket/history reload; no optimistic
balance changes. See [checkpoint](../walkthroughs/phase-7c3-lifecycle-ui.md).
This supersedes the read-only/action-UI-pending notes below. Edit/delete/batch,
offline sync, migration and deployment remain excluded. Same uncommitted 7C.3;
PO review of this delivery remains pending.

**Lifecycle terminal resolution — 2026-09-30:** PO authorized DEC-033 after the
proposal below. Backend endpoint and strict frontend transport are implemented;
336 integration tests, lifecycle recovery browser QA and both frontend builds pass.
See [evidence](../walkthroughs/phase-7c3-lifecycle-resolution.md). This supersedes
the approval-pending gate below, not the history action UI gate: confirmation,
explicit retry/resolution controls and canonical refresh remain to be integrated.
Same uncommitted Phase 7C.3; no deployment or PO delivery acceptance claimed.

**Lifecycle exit-policy audit — 2026-09-30:** Seven lifecycle tests pass, including
proof that a business-rejected restore can succeed later with identical ID/revision
after balance changes. A [bounded server-resolution extension](../architecture/LIFECYCLE_ATTEMPT_RESOLUTION_PROPOSAL.md)
is proposed and awaiting PO approval. No application behavior changed in this audit;
history action buttons remain disabled. DEC-032 still covers create only.

**Shared lifecycle recovery — 2026-09-30:** Durable journal now admits validated
archive/restore attempts under the same owner key as create, preserving old records
without a database upgrade. Concurrent attempts cannot overwrite each other;
create UI blocks on lifecycle recovery. See [evidence](../walkthroughs/phase-7c3-lifecycle-recovery.md).
No history action buttons: conflict/rejection exit policy and confirmation/retry
UI remain incomplete. No automatic resend, discard, contract extension or commit.

**Lifecycle transport — 2026-09-30:** Validated archive/restore API transport added
with immutable request snapshots, owner checks, revision protection and explicit
retry. See [evidence](../walkthroughs/phase-7c3-transaction-lifecycle-transport.md).
No history action buttons enabled: durable lifecycle recovery, conflicts and
confirmation UI remain gates. No delete/edit transport or backend contract change.

**Transfer UI continuation — 2026-09-30:** Connected single-transfer form now
supports all six approved types, distinct endpoints, source balance guard, explicit
same-ID recovery and terminal resolution. See [evidence](../walkthroughs/phase-7c3-transfer-ui.md).
Standard transfer changes balances only; budget reallocation also changes the
transaction-date period allocation under server validation. Batch/lifecycle UI
remain pending. No backend contract change, migration, commit or push.

**Income UI continuation — 2026-09-30:** Connected single-income form added using
the shared transaction journal, retry and terminal resolution. Source chips use
existing labels/emojis and flexible layout. See [evidence](../walkthroughs/phase-7c3-income-ui.md).
No allocation mutation, automatic transfer or backend contract change. Transfer,
batch and transaction lifecycle UI remain pending. Same uncommitted Phase 7C.3.

**Terminal attempt resolution — 2026-09-30:** PO accepted DEC-032. Explicit
confirmed resolution now preserves a committed transaction or durably fences an
uncommitted create attempt. Backend, transport and expense recovery UI implemented;
see [verification](../walkthroughs/phase-7c3-attempt-resolution.md). The earlier
cancellation-unavailable limitation below is superseded. Still connected
development, not full 7C.3 completion or everyday-use acceptance. No commit/push.

**Expense UI continuation — 2026-09-30:** Single expense form added to connected
development screen with durable explicit retry and canonical refresh. See
[evidence and remaining rejection gate](../walkthroughs/phase-7c3-expense-ui.md).
Dispatched attempts cannot yet be cancelled/replaced; rejected requests can block
new expense entry. Not ready for everyday use. No income/transfer forms or commit.

**Transaction POST transport — 2026-09-29:** Single-create transport and strict
acknowledgement validation added; journal + live API replay verified in an isolated
browser. See [evidence](../walkthroughs/phase-7c3-transaction-create-transport.md).
User-facing form/orchestration and rejection recovery remain pending; no automatic
submission, migration or commit/push. Same ongoing 7C.3.

**Recovery foundation — 2026-09-29:** Owner-scoped single-create transaction
journal and strict parser implemented and browser-tested. See
[evidence](../walkthroughs/phase-7c3-transaction-recovery.md). Not connected to
POST/forms yet; explicit retry, acknowledgement and rejection handling remain
gates before financial writes. Same uncommitted 7C.3; no automatic sync.

**History UI continuation — 2026-09-29:** Read-only connected transaction history
now has page navigation and type/pocket/category/date/note/archive filters.
See [evidence](../walkthroughs/phase-7c3-history-ui.md). Financial write forms and
durable recovery remain pending. Same uncommitted 7C.3, local mode unchanged.

**Phase 7C.3 entry — 2026-09-29:** PO requested continuation after the successful
7C.2 commit/push; clean working tree verified. First bounded slice is validated
transaction-list transport with explicit pagination/filters, not a transaction
write form. See [evidence](../walkthroughs/phase-7c3-transaction-read.md).
History UI, durable financial-write recovery and lifecycle integration remain.

**Current consolidated checkpoint — 2026-09-28:** Phase 7C.2 implementation is
delivered in isolated connected-development mode: setup; canonical master-data
reads; pocket labels/classification/opening-balance correction; Cash/NFC owner
settings; category creation/editing; pocket/category archive and restore.
See [technical audit](../walkthroughs/phase-7c2-final-audit.md) for verification
and limitations. PO acceptance, commit/push and the next phase are separate gates.
No transaction UI, migration, offline sync or deployment is included.

### Historical checkpoints and baseline notes

The remaining dated entries and older baseline sections below describe earlier
checkpoints. Their pending/not-started statements do not override the summary
above or the consolidated audit; older PO acceptance is retained unchanged.

**Latest opening-balance continuation — 2026-09-28:** Connected correction form,
explicit impact confirmation, narrow PATCH transport and regression checks
implemented. See [evidence](../walkthroughs/phase-7c2-opening-balance.md).
No ledger/allocation mutation; final 7C.2 audit and PO review remain. Earlier
opening-balance-pending entries below are historical. No commit/push or 7C.3.

**Latest classification continuation — 2026-09-28:** Pocket group/spendable editor
enabled in connected mode, with typed transport, canonical reads and revision
protection. See [evidence](../walkthroughs/phase-7c2-pocket-classification.md).
No base balance/allocation change; opening-balance UI and phase audit remain.
Same uncommitted 7C.2, no migration or phase advancement.

**Latest UI continuation — 2026-09-28:** Interrupted category creation work
completed with an isolated owner-scoped IndexedDB recovery journal and explicit
same-ID retry after reload/login. 292 integration tests, browser recovery/regression
checks, type-checks and builds passed. No background send or legacy store mutation.
See [checkpoint](../walkthroughs/phase-7c2-category-create-ui.md). Same uncommitted
7C.2; remaining pocket fields and phase-level review are pending.

**Latest creation transport — 2026-09-27:** Category POST transport and six
integration tests added. 289 integration tests, builds/type-checks and existing
browser regressions pass. No create form enabled until durable attempt recovery
across reload is implemented. See [checkpoint and recovery gate](../walkthroughs/phase-7c2-category-create-transport.md).
Same uncommitted 7C.2, no deployment or local data migration.

**Latest UI continuation — 2026-09-27:** Pocket archive/restore controls and archived
list delivered in connected mode. Cash/NFC recovery requires explicit replacement
when the retained budget owner is invalid. 283 integration tests, browser scenarios,
type-checks and builds pass;
see [evidence](../walkthroughs/phase-7c2-pocket-lifecycle-ui.md). Category creation
and other pocket fields remain pending. Same uncommitted Phase 7C.2.

**Latest transport continuation — 2026-09-27:** Pocket archive/restore transport
and archived-pocket read allowlist added, with explicit Cash/NFC restore mapping.
281 integration tests, build/type-check and existing UI browser regressions pass.
No new UI controls yet. See [checkpoint](../walkthroughs/phase-7c2-pocket-lifecycle-transport.md).
Same uncommitted 7C.2; next slice is lifecycle UI and recovery confirmation.

**Latest continuation — 2026-09-27:** Category archive/restore reviewed: prior
272-test run and browser verification passed. Pocket name/emoji editing added
within the same Phase 7C.2; 276 integration tests, builds/type-checks and browser
regressions pass. See [checkpoint](../walkthroughs/phase-7c2-pocket-label.md).
No balance/allocation editor, category creation, pocket lifecycle, migration,
commit/push or new phase. Earlier entries below are historical checkpoints.

**Latest continuation — 2026-09-25:** Existing category name/emoji editing is
enabled in connected mode with revision protection and browser-verified retry/
reload handling. 271 integration tests pass. See
[category edit evidence](../walkthroughs/phase-7c2-category-edit.md). Category
creation/archive/restore and other pocket mutations remain pending. No commit/push.

**Continuation — 2026-09-25:** Connected Cash/NFC budget-owner form is enabled
with immutable retries, Reload-only conflict handling and server reconciliation.
Browser QA passed; see [form evidence](../walkthroughs/phase-7c2-budget-owner-form.md).
Other pocket/category edit and lifecycle forms remain pending. No local migration
or commit/push; the phase is not complete.

**Continuation — 2026-09-24:** Added the narrow Cash/NFC budget-owner PATCH
transport and regression tests (266 passing), without enabling an edit form. See
[transport checkpoint](../walkthroughs/phase-7c2-budget-owner-transport.md).
Phase 7C.2 is still partial; UI recovery/conflict handling and category edits
remain pending. Existing uncommitted setup/read work is preserved.

**Latest continuation — 2026-09-19:** PO requested commit, push and continuation.
7C.1 was committed/pushed as `cd2154b` on the active branch; main is unchanged.
The read-only part of 7C.2 now reads setup, pockets, categories and report-derived
balances. [Evidence](../walkthroughs/phase-7c2-master-data-read.md): 252 tests pass,
frontend checks/builds and bounded browser checks pass. Full 7C.2 remains partial:
Setup submission has since been implemented and browser-verified. QA found and
fixed order-dependent setup foreign-key failure; 259 integration tests now pass.
See [setup evidence](../walkthroughs/phase-7c2-setup-submission.md). PO review is
pending. Pocket/category edits remain disabled. No user data migrated.

**Latest implementation — 2026-09-15:** Phase 7C.1 connected session foundation is
implemented locally after the approved plan commit `d4b2f36`. Real login and
session handling are isolated from the unchanged local financial application.
See [evidence](../walkthroughs/phase-7c1-connected-session.md). Implementation
review pending; no migration, financial API integration or deployment yet.

**Current continuation — 2026-09-15:** PO requested frontend/API integration.
Source audit and the [Phase 7C plan](../architecture/FRONTEND_API_INTEGRATION_PLAN.md)
are prepared. PO confirmed first-stage connected development mode and authorized
7C.1 implementation. The documentation checkpoint must be committed first to
satisfy the clean-tree gate; offline requirements and local data are preserved.
No frontend cutover or migration has occurred. Reports implementation was
committed on PO instruction as `08e15fb`; no push was requested or performed.

**Latest delivery — 2026-09-14:** PO authorized the contract commit and immediate
Phase 7B.5 implementation. Contract checkpoint `0e2eb5e` is committed locally,
not pushed. The two read-only Reports endpoints, calculation module, response
schema and tests are implemented; implementation PO review is pending. See
[Reports API evidence](../walkthroughs/phase-7b5-reports-api.md). This supersedes
the older not-started/authorization-pending Reports statements retained below
as historical checkpoints. No frontend integration, sync or deployment began.

**Earlier contract checkpoint — 2026-09-14:** Phase 7B.4 remediation was committed and pushed
to `origin/main` at `5e019db`. The next authorized continuation is Reports API
contract refinement, started from a clean tree. The PO accepted the three
MVP-preserving availability/exclusion recommendations in DEC-031. The
[technical specification](../architecture/REPORTS_API_CONTRACT.md) is finalized
for complete-contract review; no Reports endpoint or hosting implementation has started.

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

- Frontend integration with the implemented Reports API (separate approval required).
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
Reports API implementation is delivered locally under the accepted contract;
implementation PO review remains pending. No current implementation blocker is recorded.

## Do not start

- A phase beyond the bounded Reports API implementation before PO review and approval.
- Production infrastructure or deployment before a separate deployment phase is approved.
- Historical snapshot implementation.
- Automatic Sinking Fund transfer.
- Unrefined Sprint 2/later features.
