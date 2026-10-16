# Phase 7C.3 — Single-create recovery journal foundation

Date: 2026-09-29. Same uncommitted phase; not financial-write UI acceptance.

## Scope and authority

Approved 7C.3 recovery gate, DEC-026/027/030 and single transaction POST contract.
Adds a strict versioned create-attempt parser and atomic owner-scoped IndexedDB
journal. Supported shapes: expense, income and transfer (including budget
reallocation). Only create is supported; batch/edit/lifecycle are not implied.

Records preserve UUID, original dates/time, optional-field omission and exact
note text. No amount/time/whitespace normalization during recovery. Unknown fields,
credentials and server-owned budgetPocketId are rejected, not silently stripped.
Cross-pocket ownership, current balance and allocation rules remain server checks.
Optional absent fields use omission, not null, matching the accepted POST schema.

Per owner, prepare atomically retains an existing pending attempt rather than
overwriting it. Reads survive reload in the same origin/profile. Acknowledgement
cleanup verifies the full canonical record, so stale cleanup cannot erase a newer
attempt. Corrupt/unavailable storage fails closed. There is no discard method,
network transport, automatic retry or expiry-based deletion.

## Files

- frontend/src/lib/api/transactionAttempt.ts
- backend/tests/integration/frontendTransactionRecovery.test.ts
- backend/tests/browser/transactionRecovery.cjs
- Current delivery docs and this walkthrough.

## Verification

- Full `npm run test:integration`: 307 tests / 34 suites passed; zero failures,
  skipped or cancelled (160306.2195 ms), on the separate test database.
- Backend `npm run typecheck` and `npm run build`: passed. Source/diff review,
  `git diff --check` and changed-document link checks passed. Git remains
  modified/untracked for the ongoing 7C.3; no staging/commit/push.

- Four parser tests passed: detached exact copy; income/transfer shapes; bad
  identity/version/operation/fields/money/calendar; invalid topology.
- Frontend app/root type-checks, connected and normal builds passed. Initial
  type-narrowing errors in the parser were fixed before the successful rerun.
- Existing connected Vite development server on 5174 used for isolated headless
  Edge `transactionRecovery.cjs`. Real IndexedDB tests passed atomic two-tab
  preparation, reload, owner isolation, exact payload retention, mismatched/stale
  acknowledgement, corrupt records and unavailable storage. No API writes;
  API reads stubbed as 401 to isolate journal tests from owner/database state.
- No unexpected page/console errors; expected stubbed 401 and blocked external
  fonts excluded. LocalStorage untouched. No UI layout change or new visual
  acceptance claimed; no new dependency installed.

## Integration gate / limitations

This module is intentionally not wired to a financial form or POST transport yet.
Before enabling submission: persist before dispatch; verify current session owner;
show pending request details; explicitly retry identical body; validate exact
server acknowledgement before cleanup; then reload canonical history/balances.
Define handling of definite rejection versus uncertain outcome without inventing
new mutation IDs for an unresolved attempt. Store existence alone does not prove
server success. Transport/replay/failure tests are still required.

Browser storage is origin/device-local and can be evicted/cleared. It is not an
encrypted backup, cross-device queue or exactly-once guarantee after storage loss.
Notes and financial request details will be persisted locally when the future UI
uses this module; it must disclose that and never store credentials/session tokens.
No automatic legacy import, offline sync, schema change, deployment, commit/push
or PO manual acceptance in this slice.
