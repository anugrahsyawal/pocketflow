# Phase 7C.3 — Connected expense form, development checkpoint

Date: 2026-09-30. Partial phase; not ready for everyday/production financial use.

## Scope and authority

Backlog 4.1/4.8, accepted single POST contract, DEC-024/026/027/030. Active-pocket
expense form with optional pocket-scoped category, integer rupiah amount, editable
Jakarta date/time and note. Budget attribution stays server-controlled; no budget
selector is exposed. Uses existing design tokens/Input/Button in isolated connected
screen, not a replacement for the accepted local expense page or raw Stitch HTML.

Before dispatch, journal prepare atomically preserves the immutable owner attempt.
UI locks the request; explicit retry only after uncertainty/reload/login. Cross-tab
existing attempts are shown for review before dispatch. Validated acknowledgement
precedes journal cleanup and master-data/history refresh; cleanup failure retains
identity. Session expiry unmounts form; local financial stores remain untouched.
Other same-screen master-data writers are disabled while drafting/submitting.

## Important remaining limitation

Server 400/409/422 rejection retains the journal rather than silently deleting or
generating a new ID. No user cancellation/replacement of a dispatched request yet.
A rejected attempt can block new expense entry until investigated or the original
request becomes valid. Warning is displayed before submission and after rejection.
Do not adjust opening balances to bypass insufficient-funds validation. This is
a development/testing checkpoint, not completed rejection recovery or daily-use
acceptance. Resolve that gate before extending/accepting the financial form flow.

## Files

- frontend/src/features/connected/ExpenseCreateForm.tsx
- frontend/src/features/connected/ConnectedPockets.tsx (form and edit locks)
- frontend/src/features/connected/ConnectedApp.tsx (capability copy)
- backend/tests/browser/expenseCreate.cjs
- Delivery documentation and this walkthrough.

## Verification

- Full regression `npm run test:integration`: 313 tests / 35 suites passed,
  zero failed/skipped/cancelled (354489.2027 ms).
- Final message/copy changes rechecked with app type-check, connected build and
  expenseCreate.cjs rerun: passed. Earlier root type-check/normal build also passed.
- `git diff --check` passed (line-ending warnings only). Source reviewed; modified
  and untracked 7C.3 files remain, no staging/commit/push. Disposable preview API
  stopped after QA; PostgreSQL and Vite retained.

- App/root type-checks, connected/normal builds passed after fixing a discriminated
  union narrowing error. Subsequent validation-message/copy polish is rechecked.
- Connected Vite server started on 5174; existing PostgreSQL restarted and preview
  fixture created only on the dedicated disposable database. No user data reset.
- Headless Edge expenseCreate.cjs tests invalid/zero and over-balance amounts,
  cancel, retained draft across session check, mobile 375/390/430px, committed lost
  response, reload/logout/login explicit identical retry, canonical NFC balance
  82000 -> 81000 and exactly one new history row. Simulated 422 retains pending
  record across reload and blocks new form; localStorage and console checked.
- Initial browser navigation timed out waiting for full page load; rerun uses
  DOMContentLoaded and explicit app-element readiness (no fixed sleep).
- Screenshot inspected at backend/dist/qa-expense-create/form-375.png; stale amount
  validation message found and fixed to clear on amount/payment-pocket changes.
- No backend route/schema/dependency changes. No PO manual acceptance claimed.

## Next gate

Finish safe explicit handling of rejected/abandoned attempts (including cross-tab
and uncertain outcomes), then income/transfer forms and batch/edit/lifecycle work.
No migration, offline sync, deployment or commit/push. Overall 7C.3 remains partial.
