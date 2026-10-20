# Phase 7C.4 — Report read foundation

Date: 2026-10-19
Scope: existing Reports API transport/validation and request-generation gate only

## Entry and authority

PO explicitly requested committing/pushing Phase 7C.3 and continuing after the
7C.4 transition recommendation. Committed and pushed `1f048d0` to
`origin/codex/audit-pocketflow-documentation`; working tree clean before this slice.
This authorizes bounded 7C.4 implementation, not a claim of PO manual test results.
PR-002/003/007/009–015/023 and DEC-031 remain unchanged.

## Implementation

- `frontend/src/lib/api/reportRead.ts`: typed, complete wire-field decoder mirroring
  REPORTS_API_CONTRACT. Reject missing/extra fields, unsafe numbers, invalid enums,
  dates and mismatched periods. Preserve nullable historical budgets/balances;
  reject known availability contradictions rather than invent historical facts.
- Query builder restricts existing current/explicit-period routes and optional
  Sinking Fund exclusion UUIDs (up to 100, normalized/deduplicated). No backend
  contract extension. Future-period authority remains the server clock.
- `SessionClient.readReport`: credentialed no-store transport with immutable query
  captured before awaiting. No financial mutations or local-store fallback.
- `LatestReportRequest`: request-generation gate marks superseded success/errors
  stale, including invalidation for unmount/logout. This is a UI-neutral primitive;
  it does not yet protect an existing screen until integrated there.
- `backend/tests/integration/frontendReportRead.test.ts`: current/historical DTOs,
  malformed responses, query snapshots, out-of-order completion and real authenticated
  loopback HTTP with the disposable PostgreSQL fixture.

## Verification

- `npx tsx --test tests/integration/frontendReportRead.test.ts`: 5 tests / 1 suite
  passed, no failures/skips (28263 ms). TEST_DATABASE_URL points to disposable
  `pocketflow_test_7b4_windows`. Real loopback HTTP verifies current expense 18000,
  transfer volume 100000 and independent NFC balance 82000 from seeded fixtures;
  historical balances remain null. No user ledger touched.
- `npx tsc --noEmit`, `npm run build`, `npm run build -- --mode connected`: passed
  (134 modules). Final connected build/type-check repeated after semantic guards.
- `git diff --check`: passed with line-ending notices only. Source review confirms
  no backend imports in browser production code, no dependency, no financial
  recomputation and no fallback to local financial stores.
- UI markup/routing unchanged; dev/browser console/manual visual verification not
  rerun for this transport-only slice. Real HTTP verification above is not browser
  acceptance. Full backend regression not rerun; 7C.3 evidence remains separately
  dated. Final screen integration must still pass all frontend/browser gates.
- Git: 5 modified tracked files and 3 new files after the pushed checkpoint;
  this 7C.4 work remains uncommitted. No deployment or additional push.

Existing local Home/Reports and connected master-data mapper remain unchanged.

## Next bounded slice

Connect the validated report to a period-loading state with immediate stale-data
clearing and explicit loading/error/retry. Then reuse approved Reports presentation
(Iteration 3), followed by Home (Iteration 5) and pocket-detail reconciliation.
Keep null states honest and Cash/NFC balances independent; never calculate a full
report from paginated history. Final UI needs browser/mobile/console verification,
and seeded cross-screen/CSV checks before phase acceptance. Full 7C.4 is not done.
