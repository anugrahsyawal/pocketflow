# Phase 7C.2 — Pocket classification settings

Date: 2026-09-28. Connected-development slice; PO review pending.

## Scope and authority

Backlog 2.2, PR pocket template table, accepted PATCH pocket contract and DEC-027.
Enable `groupId` (daily/bills/savings) and `isSpendable` only. Cards display the
canonical group and spendable marker. The editor uses existing design tokens and
Input/Button-style controls, with no raw Stitch markup or new dependencies.

The spendable flag is input to analysis (including current Reports Sinking Fund
candidates); it is not a transaction-entry permission. Changing group/flag does
not transfer money, alter opening balance/allocation or rewrite ledger references.
Wallet identity still uses templateKey and budget-owner mapping stays unchanged.
No Home integration or changes to existing local-mode spendable formulas here.

Transport allowlists mutation UUID, expectedRevision, groupId and isSpendable;
response fields/revision validated. Immutable retry, explicit canonical reload,
Reload-only conflicts and expired-session handling follow existing edit forms.
No-op submit disabled. Uncertain attempts lock controls and warn before unload.

## Files

- frontend/src/lib/api/sessionClient.ts and masterData.ts
- frontend/src/features/connected/PocketClassificationForm.tsx and ConnectedPockets.tsx
- backend/tests/integration/frontendPocketLabel.test.ts and frontendMasterData.test.ts
- backend/tests/browser/pocketClassification.cjs
- Delivery index/state/sprint/handoff/integration plan and this walkthrough.

## Verification

- Frontend `npx tsc --noEmit -p tsconfig.app.json`, `npx tsc --noEmit`,
  `npm run build -- --mode connected`, `npm run build`: passed.
- Backend `npm run typecheck`, `npm run build`: passed.
- Three new live HTTP tests passed: allowlisting/replay/current canonical mapping,
  unchanged ledger and base balance, stale/foreign edit rejection, uncertain retry
  with bounded CSRF refresh, invalid inputs and malformed acknowledgement.
- Synthetic master-data fixture updated to include valid classification fields,
  preserving the purpose of unsafe-monetary-value validation rather than letting
  it fail incidentally on a missing group.
- Headless Edge pocketClassification.cjs passed no-op/cancel, session draft,
  375/390/430 px no-overflow, identical uncertain retry, real revision conflict,
  reload without another PATCH, unchanged NFC balance/owner, logout, untouched
  LocalStorage and no unexpected console/page errors. Expected bootstrap 401,
  simulated 409/network failures and blocked external fonts excluded.
- 375 px form screenshot inspected in backend/dist/qa-pocket-classification/.
- Full backend `npm run test:integration`: 295 tests across 32 suites passed;
  zero failures, cancelled or skipped tests (131014 ms).
- `git diff --check`: passed; existing LF/CRLF conversion warnings only.
- `git status --short`: modified and untracked files from the ongoing 7C.2
  slices remain; no staging, commit or push performed.
- Disposable preview API stopped after verification; frontend development
  server and local PostgreSQL left available. No Product Owner manual testing
  or acceptance is inferred from automated browser evidence.

## Remaining gate

Opening-balance correction UI and final 7C.2 audit remain. Current-period allocation
editing is excluded from this API contract and is not silently added. No 7C.3,
migration, deployment, commit/push or Product Owner manual acceptance claimed.
