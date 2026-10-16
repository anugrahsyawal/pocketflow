# Phase 7C.3 — Single transaction POST transport

Date: 2026-09-29. Same uncommitted phase; financial form not enabled.

## Scope

Backlog 4.1–4.3, accepted POST contract, DEC-024/026/027/030. Added
SessionClient.createTransaction for a previously prepared single-create attempt.
Strict parser snapshots the request before any await; mutation ID is never generated
or replaced by transport. Current session owner is checked before POST and again
before the single permitted retry on explicit INVALID_CSRF_TOKEN. No network,
409, 422 or malformed-success automatic retry.

Acknowledgement validation checks full consumed entity shape, amount, type,
payment/transfer IDs, category/source/type fields, date/local time, exact note,
revision and archive state. HH:mm and HH:mm:ss are compared at equal precision;
the outgoing body stays unchanged. Expense budget attribution is server-derived,
not recalculated using current wallet configuration. Replay returns original
creation acknowledgement, not current ledger state; callers must refetch after
verified cleanup, not overwrite newer transaction data with that acknowledgement.

## Files

- frontend/src/lib/api/sessionClient.ts
- backend/tests/integration/frontendTransactionCreate.test.ts
- backend/tests/browser/transactionCreate.cjs
- Delivery documentation and this walkthrough.

## Verification

- Full `npm run test:integration`: 313 tests / 35 suites passed; zero failures,
  skipped or cancelled (140008.1547 ms).
- Final frontend app/root type-checks and connected/normal builds passed after
  the empty-acknowledgement guard. `git diff --check` passed; source reviewed.
  Working tree remains modified/untracked for 7C.3, no staging/commit/push.
  Disposable preview API stopped; existing Vite and PostgreSQL left running.

- Six new live HTTP tests passed: expense attribution/replay after later edits;
  income/transfer/reallocation; lost response + explicit identical retry and CSRF
  rotation; unchanged 409/422 errors; owner/field rejection before dispatch;
  malformed/mismatched acknowledgement rejected without another POST.
- Isolated headless Edge transactionCreate.cjs passed against disposable preview
  DB: journal prepare before POST, committed response loss, reload without resend,
  explicit identical replay, acknowledgement cleanup and one canonical transaction
  (3 fixture rows total, not 4). LocalStorage untouched; no unexpected page/console
  errors. Expected bootstrap 401, injected network failure and blocked fonts excluded.
- Backend typecheck/build passed. Frontend first type-check found a possibly-empty
  acknowledgement array access; explicit empty-result rejection added before rerun.

## Remaining gates

No production form or automatic journal orchestration enabled by this method.
Next slice must enforce persist-before-dispatch, present pending details, prevent
new submissions while an attempt is unresolved, handle acknowledgement-cleanup
failure, distinguish definite rejection from uncertain outcome, and refresh
history/balances after completion. Storage cannot prove server success by itself.
The test orchestrates these components; it is not end-user UI acceptance.

Session preflight is not an atomic server owner-binding guarantee against another
tab switching cookies between requests; server session/resource ownership remains
authoritative. No batch/edit/lifecycle, migration, offline sync or deployment.
No new dependencies, commit/push or PO manual acceptance in this continuation.
