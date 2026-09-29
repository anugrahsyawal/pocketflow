# Phase 7C.2 — Opening balance correction

Date: 2026-09-28. Connected-development mode only; PO review pending.

## Scope

Backlog 2.2, approved PATCH pocket openingBalance contract and DEC-027.
The editor changes the non-negative integer base balance, not the present
physical balance. It explains derived-balance effects, requires explicit
confirmation (reset after changing input), and prevents invalid/no-op submits.
No transactions are created/rewritten, no allocation/mapping change, no
historical snapshot or reconciliation feature is introduced.

Transport allowlists mutation ID, expected revision and opening balance;
acknowledgement fields are validated. Explicit uncertain retries reuse the same
immutable payload, with only one automatic retry for explicit CSRF rejection.
Conflicts are Reload-only. Reload never resends. Pending attempts warn on unload;
after reload canonical server data must be reviewed, not an automatic replay.

## Modified files

- frontend/src/lib/api/sessionClient.ts: bounded correction transport.
- frontend/src/lib/api/masterData.ts: validated opening balance in read model.
- frontend/src/features/connected/OpeningBalanceForm.tsx: confirmation/editor.
- frontend/src/features/connected/ConnectedPockets.tsx: active-pocket entry point.
- backend/tests/integration/frontendPocketLabel.test.ts: three regression tests.
- backend/tests/integration/frontendMasterData.test.ts: valid monetary fixture.
- backend/tests/browser/openingBalance.cjs: isolated runtime checks.
- Delivery index/state/sprint/handoff/integration plan and this walkthrough.

## Verification

- Full `npm run test:integration`: 298 tests / 32 suites passed, zero failures,
  skipped or cancelled (209631 ms). Existing pocketClassification.cjs browser
  regression also passed after the new correction scenario.
- `git diff --check`: passed (LF/CRLF warnings only). `git status --short`:
  ongoing 7C.2 modified/untracked files; no staging/commit/push. Disposable
  preview API stopped after verification; PostgreSQL and frontend left available.

- Frontend: `npx tsc --noEmit -p tsconfig.app.json`, `npx tsc --noEmit`,
  `npm run build -- --mode connected`, `npm run build`: passed.
- Backend: `npm run typecheck`, `npm run build`: passed.
- Existing connected Vite development server on 5174 used for browser checks;
  disposable API on 3000 and separate preview PostgreSQL database, no user data.
- Headless Edge `node tests/browser/openingBalance.cjs`: passed validation,
  confirmation reset, cancel, session draft retention, 375/390/430 px overflow,
  lost response + identical retry, real revision conflict, reload without resend,
  canonical balance, logout, untouched localStorage, and console/page-error checks.
  Only expected bootstrap 401, deliberate 409/network failures and blocked external
  font requests excluded. 375 px screenshot visually inspected in
  backend/dist/qa-opening-balance/form-375.png.
- NFC fixture opening 0 -> 10000 yields current 82000 -> 92000; ledger unchanged,
  allocation remains 0 and Transportation owner remains. Zero correction restores
  the original base; replay increments revision only once. Stale/foreign requests,
  invalid amounts and malformed acknowledgements rejected.

## Remaining gate

Final Phase 7C.2 audit and Product Owner review remain. No 7C.3, allocation editor,
legacy migration, deployment, staging, commit or push. Automated browser evidence
is not Product Owner manual acceptance. Normal local financial mode is unchanged.
