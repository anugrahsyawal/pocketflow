# Phase 7C.2 — Pocket archive/restore UI

Date: 2026-09-27. Bounded connected-mode continuation; PO review pending.

## Authority and scope

Backlog 2.1/2.2, Setup & Master Data API contract, DEC-024/026/027.
Iteration 2 Pocket Saya reference and repository tokens inform rounded cards,
warm backgrounds, blue actions and mobile spacing; raw Stitch HTML not copied.

Active pockets have archive confirmation. A separate archived section remains
available even when there are no active pockets. Archived categories are readable
but not editable until their parent pocket is restored. No categories or ledger
records are deleted. Archived cards do not fabricate current balances/allocations.

Archive is blocked in the UI when an active Cash/NFC wallet uses the pocket as
budget owner; the server remains the final authority against races. Wallet restore
defaults to preserving its mapping, but an invalid retained owner blocks submission
until the user explicitly chooses an active owner or payment-pocket fallback.
Restore plus mapping is one atomic PATCH; historical expense attribution is untouched.

Immutable retry, beforeunload warning, no double-submit, expired-session handling,
Reload-only conflicts and canonical refetch follow the established forms. No
optimistic balance updates or automatic remapping. Local stores remain untouched.

## Modified files

- frontend/src/lib/api/masterData.ts: separate active/archived lists and archived GET.
- frontend/src/features/connected/PocketArchiveForm.tsx: confirmation/recovery form.
- frontend/src/features/connected/ConnectedPockets.tsx: active/archived controls.
- backend/tests/integration/frontendMasterData.test.ts: archive-read regressions.
- backend/tests/browser/pocketArchive.cjs: browser lifecycle/recovery scenarios.
- Delivery index, current state, sprint, handoff and integration plan.

## Verification

- Frontend `npx tsc --noEmit -p tsconfig.app.json`, `npx tsc --noEmit`,
  `npm run build -- --mode connected`, `npm run build`: passed.
- Backend `npm run typecheck`, `npm run build`: passed.
- Headless Edge `node tests/browser/pocketArchive.cjs`: passed dependency blocking,
  cancel with no write, archive with identical lost-response retry, stored category
  visibility, invalid retained owner, active replacement/preserve/self restoration,
  session-check selection retention, reload without another PATCH, real revision
  conflict, canonical NFC balance Rp82,000, logout and empty LocalStorage.
- Console: no unexpected JS errors. Bootstrap 401, deliberately injected 409/
  network failure and blocked external-font requests are expected exclusions.
- Existing connected dev server on 5174 reused; disposable preview backend on 3000.
  No user's data reset. Integration and preview fixtures use separate test databases.
- Screenshots at 375/390/430 px and no horizontal overflow; 375 px archive and
  restore screenshots inspected in backend/dist/qa-pocket-archive/.
- `npm run test:integration`: 283 tests / 30 suites passed, zero failures/skips/
  cancellations; 282123.0228 ms. Log: backend/.env.pocket-lifecycle-ui.log.
- Source review and `git diff --check` passed (line-ending warnings only).
  `git status --short` shows accumulated modified/untracked 7C.2 files; nothing
  staged or committed. Disposable preview backend stopped after browser QA;
  PostgreSQL and existing frontend dev server retained.

## Remaining work

Category creation and remaining approved pocket fields are still pending in 7C.2.
This is not full-phase acceptance, transaction UI integration, migration, sync or
deployment. No new dependency, commit/push or Product Owner manual testing claimed.
