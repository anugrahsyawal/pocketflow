# Phase 7C.2 — Pocket lifecycle transport foundation

Date: 2026-09-27. Bounded continuation; no new phase or commit/push.

## Scope and authority

Backlog 2.2, accepted Setup & Master Data API contract and DEC-024/026/027.
Added `SessionClient.setPocketArchived` and exact archived-pocket GET allowlist.
Only mutation UUID, expectedRevision, isArchived and an optional restore-only
budgetOwnerPocketId can be sent. Omitted mapping preserves it; explicit null
selects payment-pocket fallback. Financial amounts and labels cannot leak into
this request. No new dependency, schema, route or product decision.

This checkpoint deliberately does not expose archive/restore controls yet.
The UI must first show archived entities, confirm user intent and offer an
explicit replacement/fallback when a retained wallet owner is invalid. It must
retain immutable attempts and use Reload-only reconciliation after conflict.
No implicit remapping, auto-retry of business errors, hard delete or migration.

## Files

- frontend/src/lib/api/sessionClient.ts
- backend/tests/integration/frontendPocketArchive.test.ts
- This walkthrough and delivery index/state/sprint/handoff/integration plan.

## Verification

Five new live HTTP/PostgreSQL tests cover archive/restore/replay, unchanged
transaction/category records, retained mapping, active-dependent owner rejection,
invalid retained mapping and explicit fallback/replacement, revision/owner
isolation, lost-response retry with CSRF refresh, input/response validation and
field allowlisting. Test fixture databases only; no user database reset.

- `npm run test:integration`: 281 tests / 30 suites passed; no failed, skipped,
  cancelled tests. Duration 242709.1647 ms; `.env.pocket-archive-transport.log`.
- Frontend `npx tsc --noEmit -p tsconfig.app.json`, `npx tsc --noEmit`,
  `npm run build -- --mode connected`, `npm run build`: passed.
- Backend `npm run typecheck`, `npm run build`: passed.
- Existing connected Vite dev server on 5174 reused. Disposable preview backend
  on 3000 stopped after QA; local PostgreSQL and frontend dev server retained.
- Headless Edge `tests/browser/pocketLabel.cjs` and `categoryArchive.cjs`:
  passed. This is regression coverage of existing UI/console, not browser
  acceptance of a new lifecycle UI. The new transport is exercised by live
  HTTP/database tests above. No new visual layout was introduced.
- Source review and `git diff --check` passed (LF/CRLF warnings only).
- `git status --short`: modified/untracked accumulated 7C.2 files. No staging,
  commit or push. Product Owner manual verification remains pending.

## Limits and next slice

No new visible feature in this checkpoint. Implement connected pocket archive/
restore UI next, including archived-pocket categories and wallet recovery options.
Category creation and other pocket forms remain unfinished in the same 7C.2.
Do not claim full-phase completion or PO manual acceptance.
