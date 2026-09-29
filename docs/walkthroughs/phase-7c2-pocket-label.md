# Phase 7C.2 — Pocket name and emoji editing

Date: 2026-09-27. Implementation and automated verification delivered; PO review pending.

## Scope

Backlog 2.2 and approved PATCH pocket contract, DEC-024/026/027.
Only name and emoji are mutable through the new UI. The transport snapshots an
allowlist: clientMutationId, expectedRevision, trimmed name and emoji. It cannot
send balances, allocations, template roles, budget-owner mapping or lifecycle.
Cash/NFC detection remains based on immutable templateKey, not display name.

Category and pocket editors share label validation and recovery UX. A conflict
requires reload; an uncertain response retains the exact attempt for explicit
retry. Reload reads canonical state without resending. This existing-entity
revision pattern is not approval for additive category/transaction creation.

## Files

- frontend/src/lib/api/sessionClient.ts
- frontend/src/features/connected/CategoryEditForm.tsx (shared label editor)
- frontend/src/features/connected/ConnectedPockets.tsx and ConnectedApp.tsx
- backend/tests/integration/frontendPocketLabel.test.ts
- backend/tests/browser/pocketLabel.cjs
- Delivery index, current state, sprint, handoff and integration plan.

## Verification

Full regression: 276 tests / 29 suites passed, zero failed/skipped/cancelled,
308456.7615 ms (`npm run test:integration`, `.env.pocket-label-verified.log`).
Four new pocket-label tests cover state/ledger preservation, trimmed field
allowlisting, replay, stale/foreign edits, CSRF rotation, lost response recovery,
unsafe paths and malformed acknowledgements.

First integration attempt was interrupted because local
PostgreSQL was stopped; that run is not counted as passing. PostgreSQL was started
and readiness confirmed before the replacement full-suite run. Only disposable
test databases are reset, never the user's development data.

- Frontend `npx tsc --noEmit -p tsconfig.app.json`, `npx tsc --noEmit`,
  `npm run build -- --mode connected` and `npm run build`: passed.
- Backend `npm run typecheck` and `npm run build`: passed.
- `npm run dev:connected` started on loopback 5174; disposable sessionPreview
  backend ran on loopback 3000. Preview backend stopped after QA, not left as a
  real user service. PostgreSQL and frontend dev server retained.
- Headless Edge: `node tests/browser/pocketLabel.cjs`, `categoryArchive.cjs`,
  `categoryEdit.cjs` all passed sequentially against the disposable preview DB.
  Covers no-op/blank validation, cancel, session-check draft retention, identical
  retry after response loss, real revision conflict with Reload-only handling,
  browser reload without resubmission, canonical balances/role, logout, empty
  LocalStorage, and no unexpected JS/console errors. Expected bootstrap 401,
  deliberately injected 409/network errors and blocked external font requests
  are excluded from unexpected console errors.
- Inspected `backend/dist/qa-pocket-label/form-375.png`; no horizontal overflow
  at 375 px. Shared category editor regression also covers 390/430 px.
- Source review: PATCH strips extra fields; templateKey still controls wallet
  behavior after rename. NFC balance stays Rp82,000 and owner Transportation.
- `git diff --check`: passed; LF/CRLF warnings only. `git status --short` remains
  modified/untracked same-phase files; no staging, commit or push.

## Remaining boundaries

Category creation, pocket archive/restore and other approved pocket fields remain
pending in 7C.2. No full-phase completion, 7C.3, local migration, deployment,
new dependency, commit/push or PO manual acceptance claimed.
