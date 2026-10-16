# Phase 7C.3 — Shared lifecycle recovery foundation

Date: 2026-09-30
Status: Foundation verified locally; lifecycle action UI and PO review pending.

## Scope / requirements

PR-007/008, backlog 4.5 and the approved archive/restore contract. Extend durable
recovery to preserve target transaction ID, operation, owner ID, immutable mutation
ID and expected revision. No automatic financial dispatch or permanent deletion.

TransactionAttemptStore now reads a discriminated create/archive/restore union,
using the existing IndexedDB database, object store and owner key. Version-one
create records remain unchanged; no database upgrade, destructive migration or
separate competing lifecycle slot. Atomic prepare returns the existing record,
regardless of operation; compare-and-clear rejects stale/wrong-operation cleanup.

Strict lifecycle parser rejects unknown fields, unsafe revisions, foreign owners,
unsupported delete/edit operations and malformed hybrids. Existing create parser
remains create-only, so lifecycle cannot be sent to create or its resolution route.

Create UI recognizes lifecycle recovery and blocks all new transaction entry with
an explanatory message, target ID and expected revision. Rechecking storage has
no network-write side effect. There are still no history archive/restore buttons.

## Files changed in this continuation

- `frontend/src/lib/api/transactionAttempt.ts`: shared record/parser/store.
- `frontend/src/features/connected/TransactionCreateForm.tsx`: operation narrowing
  and fail-closed lifecycle guard, including an atomic prepare race from another tab.
- `backend/tests/integration/frontendTransactionRecovery.test.ts`: three added tests.
- `backend/tests/browser/transactionRecovery.cjs`: shared two-tab race/storage cases.
- `backend/tests/browser/lifecycleRecovery.cjs`: live recovery orchestration/guard QA.
- This walkthrough, index, current state/sprint/handoff and integration plan.

No backend source/schema/API, dependencies, legacy financial storage, staging,
commit, push or history rewrite. Existing ongoing 7C.3 dirty work preserved.

## Verification

- `npx tsc --noEmit`, `npx tsc -p tsconfig.app.json --noEmit`, `npm run build`,
  `npm run build -- --mode connected`: passed.
- Targeted `npx tsx --test --test-concurrency=1` for frontendTransactionCreate,
  frontendTransactionRecovery, transactionResolution and frontendTransactionLifecycle:
  25 tests / 5 suites passed (19905 ms), dedicated PostgreSQL test database only.
- `node tests/browser/transactionRecovery.cjs`: passed. Real IndexedDB, concurrent
  create/lifecycle prepare yields one winner; reload, owner isolation, legacy create
  compatibility, stale/wrong-operation/wrong-revision cleanup rejection, corrupt and
  unavailable storage all checked. Zero API writes.
- `node tests/browser/lifecycleRecovery.cjs`: passed on disposable live API fixture.
  Archive commits with lost response; stored attempt survives reload; UI blocks new
  create and performs no auto-send. Explicit test-orchestrated identical retry
  validates acknowledgement then clears the matching journal. Revision-conflicted
  restore remains unchanged after reload, with no automatic retry or revised ID.
- `node tests/browser/expenseCreate.cjs`: passed after fresh disposable fixture reset;
  existing create/retry/cancellation and canonical balance/history remain working.
- Isolated headless Edge on existing connected Vite server (5174), not personal
  browser/profile. No unexpected page/console errors or financial LocalStorage writes.
  Expected auth401/conflict409 and blocked fonts are explicitly filtered.
- Inspected `backend/dist/qa-lifecycle-recovery/blocked-375.png`: readable message,
  wrapped transaction ID and usable recheck button. Automated browser QA plus
  screenshot inspection, not PO manual acceptance.
- Source/diff review and `git diff --check` passed, with LF/CRLF warnings only.
- Full backend suite was not rerun; previous 319-test result is historical evidence.

## Remaining gate / review recommendation

This is not a complete lifecycle UI. Test orchestration is not a shipped retry
button. Confirm/retry controls, current-state reconciliation and a safe conflict /
business-rejection exit policy must be finished before history actions are enabled.
The journal deliberately retains conflicts. No error response, missing list row,
or reload is treated as authorization to discard an uncertain operation.

The create-only terminal-resolution API cannot cancel lifecycle attempts. Any
extension of that contract needs separate review; do not silently reuse it.
Do not auto-increment expectedRevision, generate a replacement mutation ID, or
erase site data to get past a pending operation. Production/offline/migration and
delete/edit/batch remain outside this foundation slice.

Git remains modified/untracked ongoing 7C.3 work; no commit/push.
