# Phase 7C.2 — Category creation transport

Date: 2026-09-27. Bounded continuation, not full-phase completion.

## Scope and authority

Backlog 3.2; accepted POST /v1/categories contract; DEC-026/027.
Added SessionClient.createCategory with an immutable allowlisted body containing
clientMutationId, pocketId, trimmed name and emoji. Validate UUIDs, Unicode field
limits and creation acknowledgement. No generated mutation ID inside transport,
automatic network retry, category deduplication by label or balance mutation.
One explicit CSRF rejection can trigger one retry of the exact body.

Replay returns the original creation acknowledgement, not necessarily current
category state after later edits/archive. UI must fetch canonical master data.
Do not optimistically insert replay data as though it were a current category.

## Changed files

- frontend/src/lib/api/sessionClient.ts
- backend/tests/integration/frontendCategoryCreate.test.ts
- Delivery index, state, sprint, handoff, integration plan and this evidence.

## Verification

Six new live HTTP/database tests cover allowed fields, trimmed labels, unchanged
pockets/transactions, simultaneous identical attempts, replay after category edit,
new-client recovery with the original attempt, changed-payload conflicts,
archived/foreign parents, bounded CSRF refresh, caller mutation after submission,
invalid input and malformed responses.

- `npm run test:integration`: 289 tests / 31 suites passed, no failures, skips or
  cancellations, 226337.8006 ms. Log: backend/.env.category-create-transport.log.
- Frontend `npx tsc --noEmit -p tsconfig.app.json`, `npx tsc --noEmit`,
  `npm run build -- --mode connected`, `npm run build`: passed.
- Backend `npm run typecheck` and `npm run build`: passed.
- Existing connected Vite dev server reused on 5174. Disposable preview backend
  on 3000 stopped after testing; user development data untouched.
- Headless Edge `tests/browser/categoryEdit.cjs` and `pocketLabel.cjs`: passed,
  including retry/conflict/reload, mobile layout and console checks. These are
  regressions for existing UI, not verification of a new create form. Only expected
  bootstrap 401, simulated 409/network failures and blocked fonts were excluded
  from unexpected console errors; no uncaught page errors.
- Source/diff review and `git diff --check` passed (line-ending warnings only).
  `git status --short`: accumulated modified/untracked 7C.2 files, no staging,
  commit or push. PO manual acceptance pending.

## Required recovery gate before exposing the form

The transport is ready for integration, but no category-create UI is enabled.
Unlike assignment PATCH operations, category POST has no expectedRevision guard;
generating a new UUID after an uncertain response can create a duplicate.

Required next-slice behavior and tests:

1. Record a versioned, owner-scoped immutable attempt before dispatch, with the
   UUID and canonical payload. Retain it across page reload; an in-memory ref or
   beforeunload warning alone is insufficient. A storage failure must block POST.
2. Isolate recovery records from legacy financial/auth stores; never persist
   credentials, cookies or CSRF tokens. Select and document the storage mechanism
   and corrupt/unavailable-storage behavior before implementing the UI.
3. Recovery after reload is an explicit user action using the same UUID/body,
   never an automatic background sync or a fresh create attempt. Another signed-in
   owner must neither see nor submit the first owner's pending request.
4. Freeze fields while outcome is unresolved, avoid double submission and preserve
   pending identity on 401, network/5xx/malformed response, or idempotency conflict.
   Do not infer creation success from a matching name or a GET list alone.
5. A validated acknowledgement resolves the original attempt; refresh canonical
   master data even if that category has subsequently changed or been archived.
   Clearing a pending record must not lead to a fresh POST if cleanup fails.
6. Define safe rejected-attempt/abandon handling, including an earlier in-flight
   request and parent archive races, before allowing a new mutation UUID.
7. Test reload after server commit but before acknowledgement, multiple tabs,
   logout/login identity changes and stale replay. Document limitations when the
   user explicitly clears site storage; no exactly-once claim across lost records.

These are implementation safety requirements, not a new offline-sync feature or
approval to migrate existing data. Persistence and create-form UI are not shipped
in this checkpoint. No additional dependencies, backend routes, commit or push.
