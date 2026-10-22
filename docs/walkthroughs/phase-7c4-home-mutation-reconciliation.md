# Phase 7C.4 — Expense lifecycle to Home/report reconciliation

## Continuation — income and NFC top-up (2026-10-22)

Previous budget/review/expense work committed and pushed as `6dd43cf` under PO
authorization. Clean tree before this continuation. The browser script now also
creates income 2,000 into Cash and a 3,000 Transportation-to-NFC top-up via UI,
then archives/restores/archives each. Both are independent cycles with baseline
active balances restored between them. Assertions cover Home totals, Cash/NFC
carousel money, signed/neutral recent amounts, report totals, unchanged pocket
budgets and downloaded CSV row/amount inclusion. PR-005/006, DL-006/007 apply.

Expected income: total 1,534,000, Cash 52,000, cash flow -16,000, expense 18,000.
Expected transfer: total stays 1,532,000, Transportation 97,000, NFC 85,000, cash
flow stays -18,000, transfer volume 103,000. No budget reallocation is involved.
Successful full run leaves three test rows archived/recoverable and original
active balances restored. This does not cover every transfer category, income/
transfer edit, payment-pocket edits, lost-response reconciliation or full routes.

Only the browser script and current-state/sprint/handoff/this walkthrough changed.
No app source changes; build/type-check not rerun for this test-only continuation.
Use the same explicit opt-in command and disposable database described below.
Earlier lifecycle/expense-only status notes are retained as checkpoint history.

Expanded mutation run passed, including unchanged budgets for ordinary NFC
top-up and income. `node --check` and `git diff --check` passed. No unexpected
page/console errors (the existing expected pre-auth 401/external-font filter
remains). Agent inspected income/transfer screenshots in ignored `.env.home-*-mutation.png`.
The transfer screenshot shows the external icon-font fallback text `visibility`:
financial behavior passed, but external font availability is a visual resilience
limitation, not a perfect visual-QA pass. No production-code fix is claimed here.
The subsequent `node tests/browser/homeSnapshot.cjs` regression also passed
after all three test records were archived and baseline balances restored.

Date: 2026-10-22. Same approved phase; local/uncommitted technical evidence.
Previous budget/review changes preserved. No commit/push or production code edits.

## Continuation — expense amount edit verified (2026-10-22)

The same script now creates a test expense of 1,000, edits it to 2,000 via UI
review/confirmation, then edits it back to 1,000 before archive/restore checks.
Each edit sends only amount, clientMutationId and expectedRevision; the test
asserts the same transaction ID, revision increment and preserved payment/budget
pocket mapping. CSV assertions now verify one row for that ID and the amount,
not only inclusion. At 2,000: Home total/spendable 1,530,000; NFC 80,000;
Transportation money 100,000; paired total 180,000; Transportation period expense
20,000; recent amount -2,000 and report cash flow -20,000.

The expanded script passed with real UI writes and no unexpected page/console
errors. `node --check` and `git diff --check` passed. Agent inspected ignored
`.env.home-edit-mutation.png` after edit. Original active balances restored by
the final archive; this run leaves one more recoverable archived fixture record.
No production code change, so build/type-check not rerun in this continuation.
Prior lifecycle-only notes below are checkpoint history: amount-only expense
edit is now covered, but changing payment pocket/date/category, income/transfer
mutations and lost-response edit-to-Home recovery are not covered by this script.
No Product Owner manual acceptance or full Phase 7C.4 completion is claimed.

## Scope

PR-003/005/007/008/009 and DEC-024: a payment from NFC reduces NFC money while
its configured Transportation owner receives budget expense attribution.
New `backend/tests/browser/homeMutationReconciliation.cjs` performs real UI
expense create, archive, restore and final archive using dedicated preview data.
No mocked mutation responses. Each transition checks Home total/spendable,
paired NFC/Transportation balances, recent expense, server report budget/payment
attribution and downloaded CSV inclusion/exclusion of the created transaction ID.

Fixture expected progression:

| State | Total money | NFC | Transport money | Transport expense | Recent/CSV test row |
|---|---:|---:|---:|---:|---|
| Baseline / archived | 1,532,000 | 82,000 | 100,000 | 18,000 | absent |
| Created / restored | 1,531,000 | 81,000 | 100,000 | 19,000 | present |

NFC budget expense remains zero, aggregate allocation remains unavailable (the
fixture has a missing allocation), and report cash flow changes accordingly.
This is not a claim that all Home mutations are complete: edit, income, transfer,
permanent delete and failure/recovery reconciliation remain separate coverage.

## Safety / execution

Script requires `PREVIEW_MUTATIONS=1`, loopback hostname and known fixture active
totals before writing. Use only disposable `sessionPreview --with-pockets` database
`pocketflow_test_7c1_preview`, with dedicated preview login. Never run against a
personal database. These guards are not a substitute for choosing the test DB.
After success the test transaction remains archived and recoverable; original
active balances are restored. Fixture reset remains an explicit separate action.

```text
# backend directory, existing Playwright runtime configured
$env:PREVIEW_MUTATIONS='1'
node tests/browser/homeMutationReconciliation.cjs
node tests/browser/homeSnapshot.cjs
git diff --check
```

The existing connected Vite preview on 5175 and fixture API on 3000 were reused.
No new application source changed; build/type-check were not rerun for this
test/documentation-only continuation. Previous review recorded both builds and
27 targeted tests passing. No full backend-suite rerun or PO manual acceptance.

Results: mutation script passed twice (second run added paired-card UI assertions
and screenshot), then Home regression passed with restored active balances.
Both runs left their own test record archived. `node --check` and
`git diff --check` passed. No page or unexpected console errors; pre-login 401
and external font-load failures are explicitly filtered. Agent inspected ignored
`.env.home-mutation.png` after create: total 1,531,000, NFC 81,000, paired total
181,000 and newest -1,000 expense. Automated browser interaction and agent visual
inspection are not Product Owner manual acceptance.

## Changed files / review

New browser script, this walkthrough and documentation index/current-state/
sprint/handoff. Existing dirty budget/review files remain untouched.
Review the lifecycle evidence and remaining scope before extending to edit and
other transaction types. Full navigation/detail work is still pending.
