# Phase 7C.3 — Transaction archive/restore transport

Date: 2026-09-30
Status: Transport implemented; recovery and action UI pending. Not full lifecycle delivery.

## Scope / requirements

PR-008, backlog 4.5, DEC-022 and existing transaction contract: archive is reversible;
restore reapplies financial effects. No permanent deletion in this slice.

SessionClient.setTransactionArchived accepts owner ID, transaction ID, immutable
mutation ID, expected revision and archive/restore operation. It snapshots all
fields before awaiting, rejects unknown/invalid fields, verifies the current owner,
and sends only the approved body fields to the exact route. Network/business/conflict
failures never trigger automatic retries. Only explicit CSRF rejection permits a
bounded refresh/retry, with ownership rechecked and identical route/body.

Acknowledgements validate the complete transaction DTO, target ID, archive state
and unchanged (no-op) or incremented revision. Replayed acknowledgement is not the
current ledger; consumers must refetch history and balances/allocations.

## Files changed in this continuation

- `frontend/src/lib/api/sessionClient.ts`: lifecycle type and transport method.
- `backend/tests/integration/frontendTransactionLifecycle.test.ts`: six HTTP tests.
- `backend/tests/browser/transactionLifecycle.cjs`: browser transport smoke test.
- Index/current state/sprint/handoff/integration plan and this walkthrough.

Existing dirty 7C.3 work preserved. No backend implementation, schema, dependency,
local financial storage, UI controls or Git history changed in this continuation.

## Verification evidence

- Targeted new suite: six tests passed on dedicated PostgreSQL `_test_` database.
  Covers archive/restore/no-op, active/archive listing, current balance, stale replay,
  reallocation reversal/reapplication, network loss, CSRF rotation, snapshot
  immutability, owner isolation, invalid payload/response, 404/409 and real
  insufficient-funds restore rejection without automatic resend.
- Frontend `npx tsc --noEmit`, `npx tsc -p tsconfig.app.json --noEmit`,
  `npm run build`, `npm run build -- --mode connected`: passed.
- Browser lifecycle smoke passed with real cookies/CSRF on the existing connected
  Vite server (5174) and disposable preview database (3000). Intentionally lost
  committed response recovered by explicit same-ID retry; archive hides the row,
  restore returns it at revision 3. No financial LocalStorage write or unexpected
  page/console error. Expected auth/CSRF notices and blocked font requests filtered.
- Combined `npx tsx --test --test-concurrency=1` run for
  frontendTransactionCreate, frontendTransactionRecovery, transactionResolution
  and frontendTransactionLifecycle: 22 tests / 4 suites passed (38904 ms).
- `node tests/browser/transactionLifecycle.cjs` and
  `node tests/browser/expenseCreate.cjs`: passed. Expense recovery/cancellation
  remains working after archive/restore transport verification.
- Source/diff review and `git diff --check`: passed (LF/CRLF warnings only).
  Full backend suite not rerun; 319-pass result remains previous-checkpoint evidence.
- No visual UI change, so no new screenshot/manual visual acceptance claimed.
  This is automated runtime verification, not PO acceptance.

## Next gate / limitations

Do not enable archive/restore buttons yet. The existing durable journal and terminal
resolution endpoint handle single-create only. Lifecycle needs its own approved
recovery representation and handling for revision conflicts, business rejections,
reload/logout, concurrent tabs and uncertain results before financial actions.
Never silently replace a mutation ID or increase expectedRevision to bypass conflict.
Do not interpret absence in a paginated list as proof of deletion or success.

UI confirmation must explain archive/restore balance and reallocation effects,
retain canonical snapshot context, and refresh affected data after acknowledgement.
Permanent delete requires its own destructive confirmation; edit and batch remain
separate. No new phase, deployment, commit or push performed.
