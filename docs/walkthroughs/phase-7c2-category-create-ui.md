# Phase 7C.2 — Category creation with durable recovery

Date: 2026-09-28. Completes the interrupted category-create UI slice; PO review pending.

## Scope and authority

Backlog 3.2, PR-004, accepted category POST contract and DEC-026/027.
Connected mode now exposes category creation for an active pocket, using existing
Input/Button components and the repository's warm/rounded/blue design tokens.
Category labels never modify balances or transaction attribution.

## Recovery implementation decision

Native IndexedDB database `pocketflow-connected-category-attempts`, version 1,
store `attempts`, holds one immutable creation attempt per owner UUID. It contains
only schema version, owner UUID, mutation UUID, pocket UUID, name and emoji. No
credentials, sessions or CSRF tokens; legacy LocalStorage is neither read nor changed.
No dependency or automatic sync worker added.

- Atomic readwrite transaction records the attempt before any POST. A competing
  tab receives the existing attempt and must explicitly confirm continuation.
- Reload/logout retain the attempt; mounting/login never automatically submits it.
- Validation/storage failures block dispatch. Corrupt or future-version records
  are preserved, not discarded. A different owner reads only their own key.
- Before dispatch, `/me` is checked against the expected owner. Session expiry
  removes the UI but leaves recovery available on a later same-owner login.
- Server acknowledgement clears only the matching journal entry atomically. Failed
  cleanup retains the identity, so subsequent continuation replays the same POST.
- Canonical master data is refetched after acknowledgement; replayed creation
  data is not treated as current category state after later edits/archive.
- Draft cancel is allowed before recording. Once recorded, no discard/new-ID
  shortcut is offered while the outcome is unresolved. A 422 parent rejection
  retains the attempt: restore the parent then explicitly continue. Conflict or
  damaged storage requires investigation; it never silently creates a new attempt.
- Other pocket/category editing is disabled during an open creation draft or
  submission. Recovery at rest allows parent restoration without losing the journal.

This journal is recovery for an explicit online action, not an offline queue or
data migration. Browser/site-data deletion, eviction, device loss and storage
failure outside the application's control can destroy recovery identity. There
is no exactly-once guarantee across lost storage, different devices or origins.

## Files modified

- frontend/src/lib/api/categoryAttempt.ts
- frontend/src/features/connected/CategoryCreateForm.tsx
- frontend/src/features/connected/ConnectedPockets.tsx and ConnectedApp.tsx
- backend/tests/integration/frontendCategoryRecovery.test.ts
- backend/tests/browser/categoryCreate.cjs and categoryRecoveryFailure.cjs
- Current state/sprint/handoff, documentation index and integration plan.

## Verification

- Frontend app/root `npx tsc --noEmit`, connected and default `npm run build`: passed.
- Backend `npm run typecheck` / `npm run build`: passed.
- PostgreSQL readiness confirmed before tests. Only guarded fixture databases used.
- `npm run dev:connected` served loopback 5174; disposable preview backend on 3000.
- Headless Edge categoryCreate.cjs: passed cancel, persisted-before-dispatch,
  committed response loss, reload, second-tab recovery, logout/login, identical
  replay, cleanup, blocked storage, failed cleanup, atomic two-tab preparation,
  owner isolation and stale cleanup rejection. Final server lists contain exactly
  one category per original request. Legacy storage sentinel preserved.
- No uncaught page errors or unexpected console errors; expected bootstrap 401,
  deliberately failed network response and blocked external font requests excluded.
- Screenshots/no-overflow at 375/390/430 px; 375 px form visually inspected in
  backend/dist/qa-category-create/. This is automated browser QA, not PO acceptance.
- `npm run test:integration`: 292 tests / 32 suites passed, no failures/skips/
  cancellations, 180055.9255 ms. Log: backend/.env.category-create-ui.log.
- categoryRecoveryFailure.cjs passed: a 401 before POST retains the attempt across
  login; corrupted IndexedDB blocks new creation/retry and emits no POST.
- Existing categoryEdit.cjs and pocketLabel.cjs browser regressions passed
  (validation, cancel, session draft, uncertain retry, conflict, reload, logout).
- Source review and `git diff --check` passed (line-ending warnings only).
  `git status --short`: accumulated modified/untracked 7C.2 files; no staging,
  commit or push. Disposable preview backend stopped after QA, PostgreSQL and
  frontend dev server retained. No manual Product Owner acceptance claimed.

## Remaining work

Other approved pocket fields remain outside this bounded slice. No Phase 7C.3,
transaction UI integration, deployment, migration, new dependency, commit or push.
The accumulated 7C.2 implementation still needs final phase review and PO acceptance.
