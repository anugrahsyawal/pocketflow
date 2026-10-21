# Phase 7C.4 — Connected rule-based period insights

Date: 2026-10-20
Status: bounded continuation implemented; review pending

## Scope / authority

PO requested continuation into the next identified slice, still inside Phase 7C.4.
Previous weekly changes were uncommitted and preserved; no commit or new phase
started. Last pushed checkpoint remains `7dc729e`.

Reviewed required documentation order, backlog 8.6, PR-006/010/011, DEC-031,
Reports API insight rules, approved Iteration-3 insight specification and existing
RuleBasedInsightsCard source. Canonical screenshot already inspected in this
delivery session. Server owns rule eligibility, ranking and the maximum three
facts; frontend translates facts, not ledger history or AI-generated advice.

## Files / implementation

- `frontend/src/lib/api/reportInsights.ts`: typed pure adapter for four rules.
  Preserves order, IDs and severity. Resolves labels by identity from the report,
  not current master data or a guessed spending cause. Uses safe unavailable
  pocket/Tanpa kategori fallback and no cross-period claims.
  “Mencapai batas” remains truthful at exactly 100% budget use.
- `ConnectedReportInsights.tsx`: reuses existing severity styles and maximum-three
  card display. Existing hasExpenseData gate is satisfied when server insights
  exist so valid income-only surplus is not hidden. Local card is unchanged.
- ConnectedReportSummary places insights after Weekly Usage; ConnectedPeriodExport
  updates its partial integration disclosure.
- Added `frontendReportInsights.test.ts`, `reportInsights.cjs`, and documentation.

Historical eligibility remains server-owned (category/net cash-flow only).
No added dependency, API, schema, persisted setting or financial mutation.
Local reports and connected development isolation remain unchanged.

## Verification

- `npx tsc --noEmit`, `npm run build`, `npm run build -- --mode connected`: passed;
  both builds transformed 143 modules.
- `npx tsx --test tests/integration/frontendReportInsights.test.ts
  tests/integration/frontendWeeklyDisplay.test.ts
  tests/integration/frontendReportDistribution.test.ts`: 6 tests passed.
  Covers all rule copy, order/severity, immutability, no fabricated weekly driver,
  label identity/null fallback, cash-flow direction and empty insights; also
  reruns weekly exact fractions and distribution adapter regressions.
- Reused running Vite development preview (127.0.0.1:5175, connected mode,
  `npm run dev -- --mode connected --host 127.0.0.1 --port 5175 --strictPort`) and
  dedicated disposable API fixture on port 3000. No reset or financial write.
- `node tests/browser/reportInsights.cjs`: passed. Real fixture shows category MRT
  Rp18,000 / 100% plus deficit Rp18,000; empty historical report has no insight.
  Intercepted renderer-only fixtures test income-only surplus, historical
  category/cash-flow, three ordered severity cards, weekly identity, null category,
  and overbudget pocket label. These fixtures do not verify backend eligibility.
- Browser widths 375/390/430 passed overflow checks, no unexpected page/console
  errors. Expected unauthenticated 401 and external-font failures are classified.
- Visually inspected ignored `.env.report-insights.png`: red/yellow/blue hierarchy,
  wrapped copy and readable amounts, no clipping. This is automated visual QA,
  not Product Owner manual acceptance.
- Full backend suite not rerun; backend rules unchanged.
- Regression `reportWeekly.cjs`, `reportPeriod.cjs`, `reportDistribution.cjs` and
  `periodExport.cjs`: all passed. Source/diff reviewed and `git diff --check`
  passed; prior weekly implementation remains intact.

## Review / next

At http://127.0.0.1:5175 inspect Insight Periode below Pemakaian Mingguan.
Check MRT concentration/deficit against the actual report and navigate to an empty
historical period. No advice should be inferred from missing allocation.

Next bounded slice: informational Sinking Fund/local exclusions, then complete
report presentation, Home/pocket detail and mutation/CSV reconciliation.
No deployment, automatic transfer or historical snapshot implementation.
Weekly and insight slices remain uncommitted for review.
