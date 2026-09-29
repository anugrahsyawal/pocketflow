# Phase 7C.2 — Cash/NFC budget-owner transport foundation

Date: 2026-09-24. Bounded continuation of the existing uncommitted phase.
This checkpoint adds a tested transport, **not an enabled edit form**.

## Scope and authority

DEC-024/026/027, PR-003/007, backlog 2.2, accepted setup/master-data contract,
and the approved connected-development integration plan.

`SessionClient.updateBudgetOwner` sends only an explicit pocket UUID,
`clientMutationId`, `expectedRevision`, and nullable `budgetOwnerPocketId`.
It snapshots the allowlisted fields before asynchronous CSRF work, validates
the consumed response identity/revision/mapping, and permits one retry only
after an explicit invalid-CSRF rejection. Network failures and revision
conflicts propagate; the transport never retries with a new ID/revision.

No balance movement, historical transaction rewrite, default-owner recreation,
LocalStorage persistence, schema, dependency, deployment or transaction form
change is introduced. An explicit null remains the payment-pocket fallback.

## Files and verification

- `frontend/src/lib/api/sessionClient.ts`: narrow typed PATCH transport.
- `backend/tests/integration/frontendBudgetOwner.test.ts`: seven cases for
  historical attribution preservation, null/no-op replay, revision conflict,
  response loss after commit, CSRF rotation, invalid/cross-owner references,
  local argument validation and malformed success rejection.
- Initial focused DB tests could not run because PostgreSQL was stopped.
  The installed server was started and the full suite rerun on the dedicated
  `pocketflow_test_7b4_windows` database. No user development data used.
- Verification results are recorded in the completion note below.

## Remaining gate

This method is not called by the UI yet. Before enabling its form, retain the
immutable attempt through uncertain outcomes, implement explicit Reload-only
conflict handling, reconcile server state after reload, and run real browser
interaction/console checks. Category mutations and pocket lifecycle forms
remain unimplemented. Prior setup browser evidence is not claimed as evidence
for an edit form that does not yet exist.

No UI markup changed, so no new Stitch layout or visual acceptance is claimed.
No commit/push, no clean-tree reset, and no advancement to Phase 7C.3.

## Completion evidence

- After `pg_isready` confirmed readiness, `npm run test:integration` passed:
  **266 tests, 26 suites, 0 failures**, 137.6 seconds. Seven new cases passed.
  An earlier full run started during PostgreSQL recovery and was not accepted
  as verification; it reported startup error 57P03 for initial suites.
- Frontend `npx tsc --noEmit -p tsconfig.app.json`, `npx tsc --noEmit`,
  `npm run build -- --mode connected` and `npm run build`: passed.
- Backend `npm run typecheck` and `npm run build`: passed.
- Source/diff review and `git diff --check`: passed, line-ending warnings only.
- Runtime evidence is real loopback HTTP/PostgreSQL testing, not a browser edit
  flow. No new browser console or manual verification claimed this turn because
  the method has no UI caller; the later form still needs the full browser gate.
- Git remains modified/untracked, including earlier uncommitted 7C.2 work.
  Review this foundation before completing the form; it is not phase completion.
