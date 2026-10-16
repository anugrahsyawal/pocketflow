# Phase 7C.3 — Delete resolution, durable recovery and UI

Date: 2026-10-04
Status: Implementation checkpoint; Product Owner delivery review pending.

## Authority / scope

PO said “lanjut” after the explicit delete recovery approval request. DEC-034
records acceptance. Implements PR-008/backlog 4.5, DEC-022/030/034 and transaction
contract 4.0.2 in the ongoing dirty Phase 7C.3. Previous uncommitted work preserved;
no new phase, dependency, schema migration, commit or push.

## Delivered behavior

- Resolution accepts strict delete confirmation and hashes the ORIGINAL DELETE
  request under the same owner/mutation lock. Committed deletion returns its
  original validated acknowledgement even after purge. Otherwise a permanent
  cancellation fence prevents delayed execution without financial side effects.
- Shared owner-scoped IndexedDB record gains an explicitly confirmed delete
  variant; original create/archive/restore records remain compatible without
  a database upgrade. Unknown/malformed records fail closed.
- All non-create consumers explicitly distinguish delete; it cannot be sent as
  restore. Competing prepare never overwrites or automatically dispatches another
  operation. Matching terminal acknowledgement precedes compare-and-clear.
- History offers a separate permanent-delete action and red impact confirmation
  identifying amount, date, pocket and time. Archive remains the reversible option.
  Cancellation before dispatch is local; after dispatch, stop requires explicit
  server resolution. Already-deleted data is not restored by stopping its request.
- Lost responses, reload and logout preserve the same ID/revision/confirmation;
  no background send or automatic replacement. Canonical pocket/history refresh
  follows acknowledgement, with no optimistic balance arithmetic.

## Files changed in this continuation

- `backend/src/lib/idempotency.ts`: delete-specific stored acknowledgement validator
  and shared terminal-resolution fence implementation.
- `backend/src/routes/transactions.ts`: delete resolution variant and strict fields.
- `frontend/src/lib/api/sessionClient.ts`: shared delete request/ack validation and
  explicit resolveTransactionDelete transport.
- `frontend/src/lib/api/transactionAttempt.ts`: strict durable delete record/parser.
- `frontend/src/features/connected/useTransactionLifecycle.ts`: explicit dispatch,
  resolution and confirmed-delete journal orchestration.
- `frontend/src/features/connected/ConnectedHistory.tsx`: separate destructive
  confirmation, delete-aware pending/stop messages and action control.
- `frontend/src/features/connected/TransactionCreateForm.tsx`: correct pending-delete
  label and guard against competing history operations.
- `frontend/src/features/connected/ConnectedApp.tsx`: capability footer.
- `backend/tests/integration/frontendTransactionDelete.test.ts`: resolution races,
  cancellation invariants, auth/CSRF/input, post-purge replay, parser and malformed
  client acknowledgement coverage, plus allocation rejection fence regression.
- `backend/tests/browser/transactionDeleteUi.cjs`: real UI and IndexedDB scenarios.
- `backend/tests/browser/transactionDelete.cjs`: old no-delete-button assertion
  updated for the delivered capability (script not rerun in this continuation).
- Contract, DEC-034, proposal status, index, state/sprint/handoff/integration plan,
  and this walkthrough.

## Verification actually performed

- Backend `npm run typecheck`, `npm run build`: passed.
- Frontend `npx tsc --noEmit`, `npx tsc -p tsconfig.app.json --noEmit`,
  `npm run build`, `npm run build -- --mode connected`: passed, including final
  rerun after the capability-footer copy adjustment.
- `npm run dev -- --mode connected --host 127.0.0.1 --port 5174 --strictPort`:
  started. PostgreSQL initially returned ECONNREFUSED; restarted the existing local
  installation via pg_ctl, then repeated tests. No database was reinstalled.
- Targeted frontendTransactionDelete test file: **15 tests / 1 suite passed**, zero
  failures/skips (13599 ms). Includes real reallocation rejection followed by changed
  conditions: original request can execute, but independently cancelled ID cannot.
- Full backend `npm run test:integration`: **351 tests / 39 suites passed**, zero
  failures, cancelled or skipped (216418 ms), dedicated local test database only.
- Browser `node tests/browser/transactionDeleteUi.cjs`: passed using isolated Edge
  and disposable preview account/database. Checks confirmation cancellation (zero
  writes), actual delete committed with response lost, reload/logout with no send,
  explicit identical retry, cancellation response lost/retry, canonical NFC balance,
  shared two-tab create/delete collision, stale compare-and-clear refusal, console
  and no financial LocalStorage writes. Auth401, deliberate network failures and
  blocked external fonts are filtered; unexpected errors fail the test.
- Mobile 375/390/430 widths: no document overflow; screenshots saved in ignored
  `backend/dist/qa-delete-ui/`. 375px confirmation visually inspected: red warning,
  readable amount/pocket/time, wrapped text and separate cancel control.
- After fresh disposable preview fixture reset:
  `node tests/browser/transactionLifecycleUi.cjs` and
  `node tests/browser/expenseCreate.cjs`: both passed. Archive/restore balances,
  business/revision error recovery and expense cancellation/retry remain working.
- Automated browser plus screenshot inspection is not PO manual acceptance.
- Source/diff reviewed; `git diff --check` passed with line-ending warnings only.

## Limitations and review recommendation

Review in connected development with test transactions: cancel a delete confirmation,
archive/restore a transaction, then permanently delete a disposable one. Confirm
the latter is absent even with archived records included and cannot be restored.
Do not interpret the backend 30-day tombstone retention as a restore grace period.

This does not complete all of 7C.3: edit/batch integration and phase-level review
remain. No offline queue, legacy migration, hosting, personal-data deletion or
retention change. Normal local mode remains separate and unchanged.

Only disposable fixture data was deleted/purged for verification; it can be
regenerated. Preview API is stopped after QA; Vite and local PostgreSQL remain
running. Git stays M/?? ongoing source/tests/docs, unstaged; no commit/push.
