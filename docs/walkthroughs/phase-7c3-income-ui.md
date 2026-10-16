# Phase 7C.3 — Connected income UI

Date: 2026-09-30
Status: Implemented locally; PO review pending. Same ongoing uncommitted phase.

## Scope and requirements

Backlog 4.2 and PR-005/007: income increases the selected pocket's derived balance.
The form accepts active recipient pocket, positive integer rupiah, optional source,
editable Jakarta date/time and optional note. It does not change allocation or
automatically transfer salary. Uses the approved existing single-create API.

Renamed ExpenseCreateForm to TransactionCreateForm and shared its durable journal,
immutable retry, owner checks, safe terminal resolution and canonical refresh.
One unresolved record blocks new expense/income entry. Expense-only category and
balance checks do not leak into income. Transfer remains unsupported in this form.

Existing design tokens and income labels/emojis reused. Stitch Iteration 2 income
screenshot reviewed as supporting reference; flexible wrapping source chips follow
the later PO-approved layout in AddIncomePage. No raw HTML copied; this is the
connected development screen, not a replacement for the complete local UI.

## Changed files in this continuation

- `frontend/src/features/connected/TransactionCreateForm.tsx` replaces the earlier
  untracked ExpenseCreateForm; ConnectedPockets and ConnectedApp updated.
- `backend/tests/browser/incomeCreate.cjs` added; expenseCreate region locator updated.
- Documentation index, current state/sprint/handoff, integration plan and this file.
- No backend source/schema, new dependency, local financial store or Git history change.

## Verification

- Frontend `npx tsc --noEmit`, `npx tsc -p tsconfig.app.json --noEmit`,
  `npm run build` and `npm run build -- --mode connected`: passed.
- Targeted live PostgreSQL regression command:
  `npx tsx --test --test-concurrency=1 tests/integration/frontendTransactionCreate.test.ts tests/integration/frontendTransactionRecovery.test.ts tests/integration/transactionResolution.test.ts`:
  16 tests / 3 suites passed (12661 ms). Dedicated `_test_` database only.
- `node tests/browser/incomeCreate.cjs`: passed in isolated headless Edge with
  disposable preview fixture. Zero validation, draft cancellation, source chips,
  income above existing balance, lost create response, reload without auto-send,
  identical retry, one history row, Cash 50000 -> 250000, optional source omission,
  no expense-category leakage, and explicit rejected-attempt cancellation verified.
- Canonical report assertions: total income and net cash flow increase by 201000
  across two income entries; expenses and every pocket's budget remain unchanged.
- No unexpected runtime/console errors or LocalStorage mutation. Expected auth401,
  injected422/network errors and blocked external font requests are allowlisted.
- Mobile overflow checks and screenshots at 375/390/430 px; inspected
  `backend/dist/qa-income-create/form-375.png`: fields and flexible chips fit.
  Automated browser verification plus screenshot inspection, not PO manual acceptance.
- Existing connected dev server on port 5174 reused.
- `node tests/browser/expenseCreate.cjs`: passed after fresh disposable fixture
  reset, including expense recovery/cancellation and committed-result preservation.
- Source review and `git diff --check` passed; only LF/CRLF warnings.

## Limitations / review

Still development mode. Transfer/batch/edit/archive/restore/delete UI, migration,
offline sync and deployment are not delivered by this slice. Existing storage
corruption and payload-conflict cases remain fail-closed. Full 319-test backend
suite passed in the previous checkpoint; only the 16 relevant tests rerun here.

Review optional source, income to Cash/NFC, balance/history refresh and cancellation
before continuing to transfer UI. Git contains modified/untracked 7C.3 work; no
commit/push. Historical walkthrough file names describe their checkpoint versions.
