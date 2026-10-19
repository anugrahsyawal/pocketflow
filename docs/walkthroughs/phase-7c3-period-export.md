# Phase 7C.3 — Complete connected period export

Date: 2026-10-18
Authority: DEC-037; PR-002, PR-010, PR-015; backlog 10.1
Status: Implemented and technically verified; PO manual acceptance pending

## Delivered scope

- Authenticated `GET /v1/transactions/export` for exactly one 26–25 period.
  One joined owner-scoped SELECT inside a read-only repeatable-read transaction
  resolves transactions and current reference names consistently. No ledger,
  allocation or balance writes; auth session housekeeping remains unchanged.
- Active transactions only, all types, complete ordered result rather than a
  history page. Stable ID tie breaker; exact integer text, original 14 columns,
  quoted fields, formula-prefix neutralization, UTF-8 BOM and safe filename.
- Explicit resource errors (10,000 rows / 16 MiB; 30-second statement timeout),
  never a truncated successful attachment. All responses no-store.
- Connected development has an isolated Export periode card with server-anchored
  current/historical 26–25 selector and compact blue export control. It does not
  adopt history filters or replace the local Reports page. Read-only export does
  not dispatch or clear an unresolved financial mutation journal.
- Frontend buffers the whole successful response, checks type/disposition/BOM/header,
  rejects malformed/error/incomplete-network responses, handles empty periods without
  downloading, disables repeated clicks/navigation while busy, and ignores completion
  after unmount. No new dependency, migration, offline queue or Phase 7C.4 cutover.

## Files and verification

Backend: `src/routes/transactionExport.ts`, `src/lib/transactionCsv.ts`, registration
in `src/app.ts`, integration tests `transactionExport.test.ts` and
`frontendPeriodExport.test.ts`. Frontend: `periodExport.ts`, SessionClient method,
`ConnectedPeriodExport.tsx` and ConnectedPockets entry. Contract, decision log and
project handoff/index updated; no changes to accepted local export behavior.

- Backend `npm run typecheck`, `npm run build`: passed.
- New backend export suite: 8 tests passed. Includes 128 eligible rows, exact date
  edges, three types, owner isolation, archived/deleted exclusion, inactive labels,
  formula/Unicode/quotes/newlines, row overflow, byte guard, integer precision and
  unchanged financial tables. Concurrent atomic writes change pocket labels, amounts
  and active row membership; 35 exports remain internally coherent.
- `npx tsx --test --test-concurrency=1` for frontendPeriodExport, transactions_get
  and reports: 61 tests / 4 suites passed; no failures/skips. Includes 4 new transport
  tests covering request snapshot, credentials, malformed responses, interrupted
  stream, HTTP error propagation and no automatic retries.
- Frontend `npx tsc --noEmit`, `npm run build`, `npm run build -- --mode connected`:
  passed, including final accessibility/layout polish (133 modules in both builds).
- Existing connected `npm run dev -- --mode connected` preview at 127.0.0.1:5175
  reused. Verified disposable sessionPreview process on port 3000 restarted to load
  new route, reseeding only `pocketflow_test_7c1_preview`; no user ledger reset.
- `node tests/browser/periodExport.cjs` (bundled Playwright/headless Edge): passed.
  Actual download inspected as bytes; BOM, filename, NFC amount and transfer present.
  Empty prior period downloads nothing; busy navigation/dispatch locked; injected
  network failure downloads nothing. Widths 375/390/430 have no horizontal overflow.
- Browser test initially exposed changing accessible button name during loading.
  Fixed explicit aria-label; rerun passed, including after compact header adjustment.
  No page errors/unexpected app console errors. Expected initial 401, deliberately
  failed request and external Google font failures are classified separately.
  Font availability is not claimed verified.
- Screenshot `.env.period-export.png` is ignored disposable evidence; visual review
  compares the compact blue button and period selector with Iteration-3 reference.
  Raw Stitch HTML not copied. This is automated browser QA/visual inspection, not
  Product Owner manual acceptance.

## Limitations / review

Review at http://127.0.0.1:5175 in connected development. Use the disposable preview
account already provided, locate Export periode, download current CSV and compare
with history, then navigate to an empty historical period. Confirm readability on
your device. Names in CSV are current reference labels, not historical snapshots.

Production-scale performance has not been load-tested. The actual 30-second database
timeout was verified on 2026-10-19 below. Larger-period export refinement is
not silently added. Full Reports backend cutover/reconciliation belongs to Phase 7C.4
after review/approval. No deployment, commit/push or PO acceptance in this turn.

## Final verification

Full `npm run test:integration` on `pocketflow_test_7b4_windows`: 402 tests /
49 suites passed; zero failures, cancellations or skips (249761 ms). Final frontend
type-check and both builds passed; final browser export script passed. Screenshot
review confirms title/export button align horizontally at 375px with a full-width
period selector. `git diff --check` passes (line-ending notices only).

Source/diff review checked owner constraints on every label join, active-state/date
filters, snapshot boundary, no unbounded paging, row/byte guards before attachment,
escaping/BOM/filename, no journal writes, immutable period selection, unmount guard
and delayed download. No new dependency or unrelated production code changes.

Git: 9 modified tracked files and 9 new files, including prior audit documentation;
no staging, commit or push this turn. Latest pushed checkpoint remains `648a9da`.

## Closure verification — 2026-10-19

Added one integration regression to `transactionExport.test.ts`: hold an exclusive
transactions-table lock in the safety-checked disposable database, allow the real
export SELECT to hit its 30-second statement timeout, then release the lock in
`finally`. Verified `503 EXPORT_UNAVAILABLE`, JSON rather than an attachment,
no-store, no SQL leakage, and successful header-only export on subsequent retry.
No production source changes were required.

Initial run could not connect to PostgreSQL (ECONNREFUSED), cancelling all tests.
Restarted the previously approved local installation; its log confirmed recovery
and readiness. Reran `npx tsx --test --test-concurrency=1
tests/integration/transactionExport.test.ts` against `pocketflow_test_7b4_windows`:
9 tests / 1 suite passed, zero failures/cancellations/skips (36497 ms); the timeout
case took 30259 ms. No user ledger modified; table lock released.

Reviewed source/diff and updated consolidated review/current-state/sprint/handoff.
`git diff --check` passes with line-ending notices only. Full 402-test regression,
build/type-check and browser evidence above remain dated 2026-10-18, not claimed
rerun today: only tests/documentation changed in this continuation. PO manual
acceptance is still pending. Git status now has 10 modified tracked files and 9
new files, including earlier implementation; no commit/push or Phase 7C.4 start.
