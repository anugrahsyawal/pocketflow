# Phase 7C.4 — Connected aggregate Weekly Usage

Date: 2026-10-20
Status: bounded slice implemented; technical verification recorded below

## Authority / scope

PO requested commit/push then continuation. Distribution checkpoint `7dc729e`
was pushed to origin/codex/audit-pocketflow-documentation; clean tree confirmed.
Reviewed current documentation, backlog 8.4, PR-002/006/010–013, DEC-019/031,
Reports contract and approved Iteration-3 weekly specification. Canonical screenshot
was already inspected in this delivery session. Existing local weekly source
requires numeric allocations and cannot represent unknown server values safely.

New connected-only presentation retains existing theme/progress tokens. It does
not change the local WeeklyBudgetUsageChart or fabricate allowances to reuse it.
The server owns the four 7–7–7–remainder buckets, period expense, allowance, status
and temporal state. Frontend does not calculate a new budget or reattribute records.

## Files / behavior

- `ConnectedWeeklyUsage.tsx`: section after spending distributions. Four date
  ranges, expense, separate temporal/financial labels, current-week highlight.
  Available target/remainder uses server fractions. Overbudget text can exceed
  100% while visual progress caps at 100%. Missing and historical targets show
  explanatory copy; known zero shows zero target with no invented usage ratio.
- `weeklyDisplay.ts`: exact integer-quarter display using BigInt quotient/remainder,
  Indonesian decimal comma and currency grouping. Handles negative fractions and
  MAX_SAFE_INTEGER without floating-point rounding.
- ConnectedReportSummary/ConnectedPeriodExport updated for section/disclosure.
- New `frontendWeeklyDisplay.test.ts` and `reportWeekly.cjs`.
- Docs index/current state/sprint/handoff updated.

No new dependency, API, schema, financial write, per-pocket weekly matrix or
production cutover. Fixed 26–25 period and local reports remain unchanged.

## Verification

- `npx tsc --noEmit`, `npm run build`, `npm run build -- --mode connected`:
  all passed; both builds transformed 141 modules.
- `npx tsx --test tests/integration/frontendWeeklyDisplay.test.ts`: passed,
  one test covering eight exact outputs including negative and safe-integer edge.
- Reused existing Vite dev preview at 127.0.0.1:5175 (started with `npm run dev --
  --mode connected --host 127.0.0.1 --port 5175 --strictPort`) and disposable test API
  at port 3000. No database reset or ledger mutation in this slice.
- `node tests/browser/reportWeekly.cjs`: passed. Actual fixture checks Rp18,000
  total weekly expense equals period expense, server date labels, missing targets,
  and empty historical targets. Intercepted presentation-only fixture checks
  Rp15,000.25 target, -Rp2,999.75 remainder, 120% text / 100% bar, all three
  temporal states and known-zero target distinct from missing.
  Synthetic data tests rendering only, not backend temporal/budget calculations.
- Widths 375/390/430 pass overflow checks; no unexpected console/page errors.
  Expected unauthenticated 401/external-font failures classified separately.
- Visually inspected ignored `.env.report-weekly.png`: readable date ranges,
  quarter-rupiah values, red overbudget and highlighted running week without
  clipping. Automated QA is not Product Owner manual acceptance.
- Full backend suite not rerun; backend calculations are unchanged.
- Regression `reportPeriod.cjs`, `reportDistribution.cjs` and `periodExport.cjs`
  all passed, including loading/stale response, retry, distributions and real CSV
  download. Source/diff review and `git diff --check` passed.

## Review / next

Open http://127.0.0.1:5175 and review Pemakaian Mingguan in Laporan. Disposable
fixture lacks Cash allocation, so weekly target honestly shows Belum diatur.
Actual spending is still visible. Historical targets remain unavailable.

Next bounded slice: deterministic report insights; then informational Sinking
Fund/exclusions, complete report presentation, Home/pocket detail and mutation/
CSV reconciliation. Historical snapshots and deployment remain outside this work.
This slice is local/uncommitted; last pushed checkpoint is `7dc729e`.
