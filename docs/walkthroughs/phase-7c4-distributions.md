# Phase 7C.4 — Connected spending distributions

Date: 2026-10-20
Status: bounded slice implemented and technically verified; PO review pending

## Scope and authority

PO approved continuation after pocket budget checkpoint `9078609` was committed
and pushed. Working tree was clean before starting.

Reviewed documentation index/current state/current sprint, backlog 8.3, PR-004,
PR-006, PR-010/011, DEC-031, Reports API contract and Iteration-3 implementation
specification plus canonical current screenshot. This is the existing category
and payment-pocket reporting MVP, not a new analytical feature or phase.

## Files and implementation

- `frontend/src/lib/api/reportDistribution.ts`: pure typed presentation adapter.
  Retains server ordering/labels/amounts/counts; null category gets a UI-only stable
  key distinct from unresolved IDs. Top five categories + Lainnya aggregate the
  remainder amounts/counts; percentage uses full report expense. Pocket top five
  retain payment identity, server share of total and relative-to-largest bars.
  No history-page/local-store calculations or budget-owner reattribution.
- `ConnectedReportDistribution.tsx`: reuses existing CategoryDistributionChart
  and TopPocketSpendingChart without modifying local chart behavior. Explanatory
  copy identifies expense-only scope, top-five display and payment-vs-budget.
- `ConnectedReportSummary.tsx`: inserts distributions after pocket budget.
- `ConnectedPeriodExport.tsx`: updates the partial integration disclosure.
- `backend/tests/integration/frontendReportDistribution.test.ts`: three pure tests.
- `backend/tests/browser/reportDistribution.cjs`: new browser verification.
- Index/current state/sprint/handoff and this walkthrough updated.

No dependency, schema, endpoint, persisted setting or financial mutation added.
Local ReportsPage stays unchanged. No deployment or production cutover.

## Verification actually obtained

- `npx tsc --noEmit`: passed.
- `npm run build` and `npm run build -- --mode connected`: passed, 139 modules each.
- `npx tsx --test tests/integration/frontendReportDistribution.test.ts`: 3 passed.
  Covers grouping sum/count, ties preserved, input immutability, empty data,
  null vs unresolved IDs, top-five pocket limit and all-pocket denominator.
- Reused running Vite development preview on 127.0.0.1:5175 and API on port 3000,
  previously started with `npm run dev -- --mode connected --host 127.0.0.1 --port
  5175 --strictPort` and disposable sessionPreview. Ports confirmed listening;
  no database reset or mutation in this slice.
- `node tests/browser/reportDistribution.cjs`: passed in headless Edge. Real
  fixture shows MRT Rp18,000 and NFC Card Rp18,000, not Transportation or top-up
  Rp100,000. Historical empty shows empty sections, not charts with fake data.
  Intercepted presentation-only historical fixture tests seven categories grouped
  to six rows, Tanpa kategori, long label, six payment pockets limited to five,
  unresolved pocket label, all-pocket percentage denominator, and historical
  analytics despite unavailable budget. Synthetic fixture is not server-ledger
  integration evidence and never writes to the database.
- Existing `reportPeriod.cjs` and `periodExport.cjs`: both passed. Covers stale
  responses, retry/loading, historical budget, pocket balances, actual CSV/BOM,
  empty export and network failure.
- Widths 375/390/430 pass overflow checks; no unexpected page/application console
  errors. Expected unauthenticated 401, deliberately injected errors in regression
  scripts and external-font load failures are classified separately.
- Visually inspected `.env.report-distribution-category.png` and
  `.env.report-distribution-pocket.png`: existing palette, donut/legend and relative
  bars preserved; long label truncates without overlapping amounts. Generated
  evidence is ignored, not staged. Automated visual QA is not PO manual acceptance.
- Source review and `git diff --check`: passed. Full backend suite not rerun,
  because financial calculation/transport is unchanged.

## Manual review and remaining work

At http://127.0.0.1:5175 sign in with the disposable preview account. In Laporan,
compare category and payment-pocket amounts against period total/CSV; NFC payment
must appear on NFC while Transportation budget usage remains in pocket budget.
Navigate to an empty historical period and back; old charts must not remain.

This slice is local/uncommitted. Next: aggregate Weekly Usage, then deterministic
insights/Sinking exclusions, full report presentation, Home/pocket-detail
integration and mutation-to-screen/CSV reconciliation. Historical budget snapshots,
automatic midnight rollover and production deployment remain outside this slice.
