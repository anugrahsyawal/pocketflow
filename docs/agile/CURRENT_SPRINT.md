# Current Sprint

Sprint: Backend MVP Foundation & Transaction API Implementation
Status: Phase 7C.4 In Progress — Report Sections Integrated in Connected Preview; Reconciliation Pending
Current checkpoint: Phase 7C.4 Home carousel/attention/recent pushed as `9d8ed55`

2026-10-22 edit continuation: [expense amount edit/revert](../walkthroughs/phase-7c4-home-mutation-reconciliation.md)
now reconciles through Home/report/CSV via UI. Test/documentation only; no commit.
Other edit variants, income/transfer and navigation/detail remain pending.

2026-10-22: [Home expense lifecycle reconciliation](../walkthroughs/phase-7c4-home-mutation-reconciliation.md)
adds real disposable UI mutation evidence without changing application code.
Create/archive/restore covered; edit/income/transfer reconciliation and full
navigation/detail remain pending. No automatic commit or phase advancement.

2026-10-22: [consolidated Home review](../walkthroughs/phase-7c4-home-review.md)
and malformed-budget ratio remediation within 7C.4. Budget/review remain
uncommitted; navigation/detail and mutation reconciliation still required.

2026-10-22: [Home budget progress](../walkthroughs/phase-7c4-home-budget.md) added
after authorized commit/push and clean tree. Server aggregate only; partial
allocation never presented as complete budget. Local/uncommitted for review.

2026-10-21 continuation: [Recent transactions](../walkthroughs/phase-7c4-home-recent.md)
added to connected Home with max-three active server records and shared privacy.
Carousel/attention/recent remain uncommitted; full Home acceptance not claimed.

2026-10-21 continuation: [Home attention](../walkthroughs/phase-7c4-home-attention.md)
adds server budget status and at most two owner alerts. Earlier carousel remains
uncommitted; no automatic commit or new phase. Full Home delivery still pending.

2026-10-21: [Home pocket carousel](../walkthroughs/phase-7c4-home-carousel.md)
implemented locally after clean-tree commit/push. Paired/individual server balances
and privacy verified; status/navigation and remaining Home sections still pending.

2026-10-21 continuation: [Home financial snapshot](../walkthroughs/phase-7c4-home-snapshot.md)
implemented locally within 7C.4, reusing current server balances. Total/spendable,
safe-per-day and scoped privacy only; remaining Home sections/detail and mutation
reconciliation are not complete. Historical pending/uncommitted notes below do
not override the latest checkpoint.

2026-10-21 remediation: [empty-period actions and introduction](../walkthroughs/phase-7c4-report-empty-actions.md)
implemented within 7C.4. Earlier review findings 1/2 are addressed; remaining
Home/detail and mutation-to-screen/CSV evidence still required.

2026-10-21 review: [consolidated Reports review](../walkthroughs/phase-7c4-reports-review.md)
verified cross-section/CSV figures. Empty-period CTA and stale introduction copy
remain remediation items; Home/detail and end-to-end mutation checks still pending.

2026-10-21: resumed [Sinking Fund/exclusions](../walkthroughs/phase-7c4-sinking.md)
verification after interruption. Local preferences only; no automatic transfer.
Weekly, insights and Sinking remain uncommitted; not full Phase 7C.4 acceptance.

2026-10-20 insights continuation: [server rule-based insights](../walkthroughs/phase-7c4-insights.md)
added without committing the prior weekly slice. Both remain local in the same
phase; no full cutover or Product Owner manual acceptance claimed.

2026-10-20 weekly continuation: [aggregate weekly usage](../walkthroughs/phase-7c4-weekly.md)
integrated into the connected preview, preserving DEC-019/031 and existing local
mode. This slice remains uncommitted for review.

2026-10-20 distribution continuation: [category/payment-pocket charts](../walkthroughs/phase-7c4-distributions.md)
implemented and technically verified in connected development. Same approved MVP
scope; remaining report sections and full reconciliation are pending.

2026-10-20 continuation: [pocket budget actuals](../walkthroughs/phase-7c4-pocket-budget.md)
implemented locally in connected development. Transfer and allocation details
preserve server semantics; no local Reports cutover or full-phase acceptance.

2026-10-20: [period summary](../walkthroughs/phase-7c4-report-period-summary.md)
implemented in connected development after the requested commit/push. Technical
checks pass; full Reports/Home reconciliation and manual review remain pending.

2026-10-19: PO authorized commit/push and continuation into 7C.4. Clean tree
verified before [report read foundation](../walkthroughs/phase-7c4-report-read-foundation.md).
This does not invent manual review outcomes. Earlier transition-blocked statements
below are historical; Home/Reports screen integration remains pending.

2026-10-18 continuation: DEC-037 approved; complete connected period export
implemented. See [verification/review checklist](../walkthroughs/phase-7c3-period-export.md).
Await delivered-result/manual review, not further scope approval for this slice.
No Phase 7C.4 cutover; earlier pending-proposal notes are historical.

2026-10-18 delivery: batch capture/recovery committed and pushed. Next bounded
scope is [complete connected export](../architecture/CONNECTED_PERIOD_EXPORT_PROPOSAL.md),
with a proposed read-only contract extension awaiting PO approval. No next-phase
implementation or overall acceptance; earlier pending/uncommitted notes are historical.

2026-10-18: [connected batch capture](../walkthroughs/phase-7c3-batch-capture.md)
implemented with confirmation and shared recovery. Next is batch flow/manual review
and remaining Phase 7C.3 export scope; earlier capture-pending notes are historical.

Shared batch journal/recovery continuation: [checkpoint](../walkthroughs/phase-7c3-batch-recovery.md).
Next is multi-entry capture/confirmation, not another phase or offline queue.

Batch recovery approved as DEC-036; [backend checkpoint](../walkthroughs/phase-7c3-batch-resolution.md)
implements terminal root/item resolution. Next: connected transport and shared
durable recovery, then multi-entry UI. Same Phase 7C.3, not delivery acceptance.

2026-10-17 transport checkpoint: [batch transport](../walkthroughs/phase-7c3-batch-transport.md)
implemented and tested. Next is shared durable batch journal plus all recovery
consumers, then capture UI; no automatic dispatch or second queue.

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

2026-10-17: implementation checkpoint pushed; consolidated audit identifies
remaining connected batch/export scope and manual acceptance. See
[audit/checklist](../walkthroughs/phase-7c3-consolidated-audit.md). Historical
uncommitted/no-push labels below describe earlier checkpoints only.

2026-10-16 extended edit review: inactive-reference preflight aligned to PATCH
contract, with archived/reallocation browser coverage. See the
[extended evidence](../walkthroughs/phase-7c3-edit-ui.md#extended-review--2026-10-16-continuation).
Manual and PO acceptance remain gates; no backend contract change.

2026-10-16 continuation: connected edit form, explicit confirmation, changed-only
PATCH and shared journal dispatch implemented. See [evidence](../walkthroughs/phase-7c3-edit-ui.md).
Next is manual and extended edge-case verification; no new phase or commit/push.

2026-10-16: shared edit journal and recovery consumers implemented; explicit retry,
terminal stop, reload/logout retention and competing-operation blocking verified
in a disposable browser. [Evidence](../walkthroughs/phase-7c3-edit-recovery.md).
Next: canonical edit form/confirmation and broader user-flow verification, not a
new phase or commit/push. Journal-pending statements below are historical.

2026-10-04 continuation: strict frontend edit transport delivered and exercised
against the real backend/browser. See [evidence](../walkthroughs/phase-7c3-edit-transport.md).
Next is shared edit journal and all consumers, then confirmation/recovery UI;
no connected edit button activated at this checkpoint.

2026-10-04: DEC-035 accepted; edit resolution backend and nullable PATCH schema
reconciliation implemented. See [checkpoint](../walkthroughs/phase-7c3-edit-resolution.md).
Next within approved scope: frontend immutable edit transport, shared recovery
journal and confirmation/form integration. No edit UI activated at this checkpoint.

2026-10-04: DEC-034 accepted; confirmed permanent-delete UI, durable shared
recovery and server cancellation fence delivered in connected development.
See [verification](../walkthroughs/phase-7c3-delete-recovery-ui.md). Earlier
delete-proposal approval/UI gates are superseded, not full Phase 7C.3 completion.

2026-10-01 recovery audit: review the
[bounded delete proposal](../architecture/DELETE_ATTEMPT_RESOLUTION_PROPOSAL.md)
before extending DEC-033. Only tests/docs change here; no delete UI activated.

2026-10-01 delete continuation: strict confirmed DELETE transport added against
the existing contract; [checkpoint](../walkthroughs/phase-7c3-delete-transport.md).
No delete UI or journal yet. A rejected delete must not be treated as cancelled;
review durable recovery and terminal-resolution policy before UI enablement.

2026-10-01: Archive/restore actions and explicit recovery controls now integrated
in connected history; [evidence](../walkthroughs/phase-7c3-lifecycle-ui.md).
Shared journal guards competing creates; conflicts retain the exact request until
server resolution. Canonical refresh follows acknowledgement. This supersedes
the action-UI-pending checkpoint below; not full Phase 7C.3 completion.

2026-09-30 DEC-033 continuation supersedes the approval-pending audit below:
lifecycle resolution backend/transport verified with 336 passing integration
tests and browser recovery QA. See [evidence](../walkthroughs/phase-7c3-lifecycle-resolution.md).
Next bounded slice: confirmation and explicit retry/resolution orchestration in
history, with canonical refresh. No history mutation buttons enabled yet.

2026-09-30 exit-policy audit: a delayed same-ID restore can succeed after an earlier
business rejection. Seven lifecycle tests passed. Review the
[resolution extension proposal](../architecture/LIFECYCLE_ATTEMPT_RESOLUTION_PROPOSAL.md)
before backend/UI changes; do not reinterpret the create-only approval as lifecycle.

2026-09-30 recovery foundation: shared create/archive/restore journal verified,
with fail-closed create UI guard; [evidence](../walkthroughs/phase-7c3-lifecycle-recovery.md).
Still no user-facing archive/restore dispatch. Conflicts retain the original
request; complete the recovery/confirmation flow before enabling history actions.

2026-09-30 lifecycle continuation: archive/restore transport implemented and
verified separately from user-facing controls; [evidence](../walkthroughs/phase-7c3-transaction-lifecycle-transport.md).
Do not enable actions until durable recovery, revision-conflict and confirmation
flows are verified. Same uncommitted phase; earlier checkpoints are retained below.

2026-09-30 transfer continuation: all approved single-transfer types enabled in
connected development; [evidence](../walkthroughs/phase-7c3-transfer-ui.md).
Earlier transfer-pending statements are historical. Batch and lifecycle UI remain;
this does not declare phase completion or production readiness.

2026-09-30 income continuation: shared expense/income form with existing safe
recovery flow; [evidence](../walkthroughs/phase-7c3-income-ui.md). Earlier income-
pending statements below describe historical checkpoints. No new phase or commit.

2026-09-30 resolution continuation: DEC-032 authorizes explicit server-confirmed
resolution. Implementation and [evidence](../walkthroughs/phase-7c3-attempt-resolution.md)
supersede the cancellation-unavailable gate below. Income/transfer/batch and
transaction lifecycle UI remain pending; do not treat this as full phase acceptance.

2026-09-30 expense form checkpoint: [evidence](../walkthroughs/phase-7c3-expense-ui.md).
Explicit retry tested, but safe rejection/cancellation flow remains a required
gate before daily-use acceptance. Earlier form-pending notes are historical.

Single-create POST transport continuation: [evidence](../walkthroughs/phase-7c3-transaction-create-transport.md).
Durable journal/API combination tested; user-facing orchestration/form still
pending. Earlier POST-not-enabled notes describe earlier slices.

Recovery continuation: strict single-create journal implemented; transport and
form orchestration remain pending. See [evidence](../walkthroughs/phase-7c3-transaction-recovery.md).
No financial POST or automatic send is enabled by this slice.

2026-09-29 continuation: read-only connected history UI and filter/pagination
states implemented. See [evidence](../walkthroughs/phase-7c3-history-ui.md).
No financial submissions enabled; earlier history-UI-pending notes are historical.

PO authorized continuation on 2026-09-29 after the 7C.2 checkpoint. First slice:
paginated transaction read transport; [evidence](../walkthroughs/phase-7c3-transaction-read.md).
No transaction UI writes or migration enabled. The following 7C.2 entries are
historical and do not override this current phase status.

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
