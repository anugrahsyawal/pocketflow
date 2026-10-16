# Phase 7C.3 — Lifecycle terminal resolution

Date: 2026-09-30
Status: Backend and transport verified locally; history action UI and PO review pending.

## Scope and requirements

DEC-033 authorizes the bounded extension proposed after the lifecycle rejection
audit. Supports PR-007/008 and backlog 4.5 without expanding into edit, permanent
delete, batch, offline sync, deployment or a new phase.

`POST /v1/transactions/:id/resolve-attempt` accepts only archive/restore,
clientMutationId and expectedRevision. Authentication, CSRF, UUID and strict body
validation apply. It hashes the original mutation route/body and uses the same
owner/mutation lock as execution. A completed mutation (including no-op) returns
its original acknowledgement. An unexecuted attempt receives a durable fence,
without balance, allocation, revision or transaction changes. Repeated resolution
is stable; changed request identity conflicts. Existing create resolution remains
separate and compatible. No migration or dependency added.

Frontend transport snapshots the request, checks ownership and validates matching
terminal status/ID and the full committed transaction acknowledgement. Uncertain
responses remain uncertain; only explicit retry is allowed, except the existing
explicit CSRF-refresh protocol. The transport does not clear recovery itself.

## Files in this continuation

- `backend/src/lib/idempotency.ts`: shared resolution primitive, separate lifecycle wrapper.
- `backend/src/routes/transactions.ts`: authenticated lifecycle resolution route.
- `frontend/src/lib/api/sessionClient.ts`: strict lifecycle resolution transport.
- `backend/tests/integration/frontendTransactionLifecycle.test.ts`: resolution,
  cancellation fences, race, replay, validation, ownership and rejected-restore tests.
- `backend/tests/browser/lifecycleRecovery.cjs`: lost resolution response, reload,
  explicit retry, validated compare-and-clear and create unblocking.
- Transaction API contract, DEC-033, lifecycle proposal status, documentation index,
  current state/sprint/handoff, integration plan and this walkthrough.

Earlier uncommitted 7C.3 changes are preserved; the working tree was already dirty.
This is continuation of that phase, not a fresh phase or independent commit.

## Verification actually performed

- Backend `npm run typecheck` and `npm run build`: passed.
- Frontend `npx tsc --noEmit` and `npx tsc -p tsconfig.app.json --noEmit`: passed.
- Frontend `npm run build` and `npm run build -- --mode connected`: passed.
- Targeted lifecycle integration tests: 14 passed. Subsequently strengthened the
  alternating archive/restore race and reallocation non-mutation assertions;
  the final full run covers these changes.
- Backend `npm run test:integration`: **336 tests / 38 suites passed**, zero failures,
  skipped or cancelled (191456 ms). Dedicated local PostgreSQL test database only.
- `node tests/browser/lifecycleRecovery.cjs`: passed against disposable live API.
  Committed archive with lost response survives reload; explicit retry recovers it.
  Conflicted restore stays retained. Lost terminal-resolution response survives
  reload without automatic send; explicit retry validates cancellation, then clears
  only the matching record. Create becomes available again.
- `node tests/browser/expenseCreate.cjs`: passed after resetting only the disposable
  preview fixture. Existing create, confirmed cancellation, lost response/reload,
  explicit retry, committed-result preservation and mobile confirmation all pass.
- Reused running connected Vite development server on 5174, loopback API on 3000,
  isolated headless Edge and disposable test account. Console/storage assertions
  pass; expected auth/conflict responses and blocked fonts are filtered by tests.
  This is automated browser QA, not new manual Product Owner acceptance.
- Source/diff reviewed; `git diff --check` passes (line-ending warnings only).

## Remaining gates and review recommendation

History is still read-only. Browser tests invoke lifecycle transport explicitly
for verification; these invocations are not shipped buttons. Implement confirmation,
explicit same-ID retry and terminal-resolution controls, shared journal guarding
and canonical refresh before enabling archive/restore in history. Never infer
permission to clear recovery from a business rejection or missing list row.

Review the contract and evidence now; full Phase 7C.3 completion and daily-use
readiness are not claimed. No production data, deployment, commit or push changed.
`git status --short` remains M/?? for ongoing Phase 7C.3 source/tests/docs, unstaged.
