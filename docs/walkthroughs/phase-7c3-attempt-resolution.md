# Phase 7C.3 — Terminal create-attempt resolution

Date: 2026-09-30
Status: Implemented locally; verification recorded below; PO review pending.

## Scope and authority

PO continuation accepted the bounded resolution proposal (DEC-032). New
`POST /v1/transactions/resolve-attempt` shares single-create shape validation,
owner authentication, CSRF and original request hash. Same advisory lock makes
creation and cancellation mutually exclusive. Cancellation is stored in existing
idempotency records without expiry; no schema migration or new dependency.

Already committed attempts return the original acknowledgement, not an archive,
delete or current-state snapshot. Cancelled attempts cannot execute through
single-create or batch-item reuse. Payload/route mismatch remains a conflict.
Preserves PR-005/007 financial semantics and PR-008 explicit lifecycle separation.

The connected expense form has a two-step stop confirmation, distinct committed
and cancelled notices, immutable explicit retry, compare-and-clear journal cleanup
only after validated server acknowledgement, and canonical data refresh. Lost
responses or journal cleanup failures remain recoverable. Local mode is unchanged.

## Files changed in this continuation

- Backend: `src/lib/idempotency.ts`, `src/routes/transactions.ts`.
- Frontend: `src/lib/api/sessionClient.ts`,
  `src/features/connected/ExpenseCreateForm.tsx`, `ConnectedPockets.tsx`.
- Tests: `backend/tests/integration/transactionResolution.test.ts`,
  `backend/tests/browser/expenseCreate.cjs`.
- Documentation: DEC-032, transaction contract section 4.0, proposal decision trail,
  this walkthrough, documentation index, current state/sprint/handoff and 7C plan.

Other modified/untracked files predate this continuation and belong to ongoing
7C.3. No staging, commit, push or Git history rewrite performed.

## Verification

- Targeted `npx tsx --test --test-concurrency=1 tests/integration/transactionResolution.test.ts`:
  6 tests pass against dedicated local PostgreSQL test database. Covers permanent
  fence, no ledger/allocation effects, success replay, create/batch races,
  concurrent resolution, response loss, auth/CSRF/owner isolation, conflicts and
  malformed acknowledgements.
- Backend `npm run typecheck` and `npm run build`: passed.
- Full `npm run test:integration`: 319 tests across 36 suites passed,
  255218 ms, on `pocketflow_test_7b4_windows` (not personal/development data).
- Frontend `npx tsc --noEmit`, `npx tsc -p tsconfig.app.json --noEmit`,
  `npm run build`, and `npm run build -- --mode connected`: passed.
- `node tests/browser/expenseCreate.cjs`: passed using isolated headless Edge and
  disposable preview database. Includes previous expense regressions, retained
  rejection, confirmation/back, lost cancellation response, reload without auto
  resend, explicit resolution retry, new-entry reenablement, and preservation of
  a transaction committed before its create response was lost.
- Browser console review: no unexpected application errors. Expected bootstrap
  401, injected 422/network failures and network-blocked fonts are explicitly
  allowlisted by the test. No financial LocalStorage writes.
- 375/390/430 px screenshots and overflow assertions passed. Personally inspected
  generated `backend/dist/qa-expense-create/resolution-375.png`: confirmation text
  and buttons fit within the card. This is automated browser QA plus screenshot
  inspection, not Product Owner/manual acceptance.
- Existing connected Vite instance served the test. Attempting another
  `npm run dev:connected` reported port 5174 already in use; existing process was
  reused, not killed or represented as a successful second startup.
- `git diff --check`: passed (only Windows LF/CRLF conversion warnings).

## Limits and review recommendation

- Connected development only; no income/transfer/batch UI, lifecycle UI, sync,
  local-data migration, deployment or next-phase advancement.
- Corrupt/evicted local recovery, conflicting payloads and unavailable server
  still fail closed; do not delete site data to bypass them.
- Cancellation records must not be expired by future maintenance without a
  separately approved delayed-request safety design.
- Review rejected-expense stop, confirmation/back, and successful-expense recovery
  in the browser before extending the next transaction form slice.
