# Phase 7C.3 — Connected transfer UI

Date: 2026-09-30
Status: Implemented locally; PO review pending, not phase completion.

## Scope and requirements

Backlog 4.3/4.3a, PR-005/006/007, DEC-023/024/030/032: distinct active source and
destination, positive integer rupiah, editable Jakarta date/time, optional note,
and the six approved transfer types. Fewer than two active pockets disables new
transfer entry. Current balance guard is only preliminary; server remains authoritative.

All standard types move balance only. Budget reallocation moves balance and
allocation in the 26–25 period containing the transaction date, with server floor
validation. UI explains this distinction; no local allocation mutation or historical
allocation prediction. Cash/NFC budget-owner mapping is not changed by transfer.

Shared durable single-create journal and terminal resolution now support transfer
retry, including readable pending endpoint names and type. No auto-send, replacement
ID, expense/income attribution fields or offline sync introduced.

Stitch Iteration 2 transfer screenshot and existing local transfer form reviewed.
Uses existing tokens, components, labels/emojis and flexible wrapping chips; no raw
Stitch HTML. This remains the isolated connected development screen.

## Changed files

- `frontend/src/features/connected/TransactionCreateForm.tsx`.
- `frontend/src/features/connected/ConnectedApp.tsx` capability copy.
- `backend/tests/browser/transferCreate.cjs`.
- This walkthrough, index, current state/sprint/handoff and integration plan.

Earlier 7C.3 dirty files preserved. No backend source/schema/dependency change in
this continuation, and no staging, commit, push or history rewrite.

## Verification

- `npx tsc --noEmit`, app-project type-check, `npm run build` and
  `npm run build -- --mode connected`: passed.
- Targeted PostgreSQL tests: frontendTransactionCreate, frontendTransactionRecovery,
  transactionResolution via `npx tsx --test --test-concurrency=1`: 16 tests / 3 suites
  passed (11142 ms). Full 319-test suite is previous-checkpoint evidence, not rerun here.
- `node tests/browser/transferCreate.cjs`: passed against fresh disposable preview
  fixture in isolated headless Edge. All six types, missing/same destination,
  insufficient source balance, top-up, cash withdrawal, reallocation, real
  INSUFFICIENT_ALLOCATION rejection, explicit cancellation and new-entry recovery.
- Lost committed response -> reload -> explicit identical retry: one history entry,
  no automatic send. Transfer DTO omits income/expense-only fields.
- Report assertions: standard types leave allocations unchanged; reallocation
  changes Food allocation 1300000 -> 1270000 and Transportation 200000 -> 230000,
  with matching +/-30000 balance effects. Every transfer preserves total money,
  income, expense and net cash flow. Rejected reallocation leaves totals/budgets unchanged.
- Initial browser run failed in test code using `name` instead of the report DTO's
  `label`; corrected and rerun from clean disposable fixture, passing.
- Mobile 375/390/430 overflow checks and screenshots passed; inspected
  `backend/dist/qa-transfer-create/form-375.png` for layout and readable controls.
  Automated browser QA plus screenshot inspection, not PO manual acceptance.
- No unexpected console/page errors or financial LocalStorage writes; known auth
  401, intentional dropped response, server422 and blocked font requests allowlisted.
- Existing connected Vite server reused; no personal data reset.
- `node tests/browser/expenseCreate.cjs` and `node tests/browser/incomeCreate.cjs`:
  both passed after independent disposable fixture resets, including recovery,
  cancellation, canonical balances and income allocation invariants.
- Source and diff review; `git diff --check` passed (LF/CRLF warnings only).

## Review and limits

Review Transportation -> NFC and Food -> Cash balances, then a budget reallocation
and its period warning. Batch, edit/archive/restore/delete UI, migration, offline
sync and deployment remain unfinished. Shared storage/conflict failures still
fail closed. No claim of daily-use or full-phase acceptance.

Git remains modified/untracked ongoing 7C.3 work, with no commit/push.
