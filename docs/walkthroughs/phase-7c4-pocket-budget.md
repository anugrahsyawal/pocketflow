# Phase 7C.4 — Connected pocket Budget vs Actual

Date: 2026-10-20
Status: bounded frontend slice; no full-phase completion or PO acceptance

## Entry / requirements

PO authorized commit/push then continuation. Previous period-summary slice was
committed as `85aba13` and pushed to origin/codex/audit-pocketflow-documentation.
Clean working tree confirmed before this slice.

Reviewed active requirements/backlog, DEC-031, Reports contract and Iteration-3
canonical current-period screenshot. Preserve fixed 26–25 periods, transfer
neutrality, stored budget attribution, independent Cash/NFC balances and honest
unavailable historical values. No dependency, API, schema or financial write added.

## Files / behavior

- `ConnectedPocketBudgetActuals.tsx`: new presentation-only server DTO component.
  Compact pocket rows, existing theme/progress component, native expandable details.
  Server allocation already includes reallocation: no extra addition/subtraction.
  Budget expense differs from payment expense; both are labeled in details.
  Current balance, ordinary transfers, reallocation, transfer-type breakdown and
  stored budget-source breakdown remain distinct. Uses imported transfer labels.
  Missing allocation is not zero. Historical allocation/balance are unavailable.
  Zero allocated budget stays explicit. Percentage text can exceed 100%; visual
  progress clamps at 100%. Inactive/missing metadata rows remain visible.
- `ConnectedReportSummary.tsx`: inserts pocket section after period budget.
- `ConnectedPeriodExport.tsx`: updates partial-preview disclosure.
- `backend/tests/browser/reportPeriod.cjs`: extends browser assertions.
- Documentation index/current state/sprint/handoff updated.

Local ReportsPage and navigation remain unchanged. New UI is in the isolated
connected preview, not a production mode cutover. Details reset with period changes.

## Verification

- `npx tsc --noEmit`: passed.
- `npm run build` and `npm run build -- --mode connected`: passed, 137 modules each.
- Started `npm run dev -- --mode connected --host 127.0.0.1 --port 5175 --strictPort`.
  PostgreSQL running confirmed with elevated pg_ctl status. Initial sandbox status
  was misleading; attempted start failed to access the existing log, and did not
  require installing or replacing PostgreSQL.
- Started `npx tsx tests/helpers/sessionPreview.ts --with-pockets` against dedicated
  `pocketflow_test_7c1_preview`. Only disposable fixtures were reset.
- `node tests/browser/reportPeriod.cjs`: browser verification covers Transportation
  balance Rp100,000, budget expense Rp18,000 / Rp200,000 (9%, remaining Rp182,000);
  NFC balance Rp82,000, payment expense Rp18,000 and budget expense zero; Cash
  balance Rp50,000 with missing allocation; historical unknowns; retry/stale
  response/loading; 375/390/430 widths and console.
  Final rerun passed, including a clearly synthetic intercepted response (no
  ledger write): 120% overbudget renders 100% bar, remaining -Rp3,000, revised
  allocation Rp15,000 is not reduced again by Rp185,000 reallocation, and inactive
  pocket warning is visible. No unexpected application console/page errors;
  expected 401/503 and external font failures are classified separately.
- `node tests/browser/periodExport.cjs`: passed real CSV/BOM, empty period,
  navigation, busy lock, network-failure and mobile/console regression.
- `.env.report-pockets.png` visually inspected at 375px: separate balances and
  attribution, themed expandable details, no clipping. Ignored generated images
  are not committed. Automated browser QA is not PO manual acceptance.
- No full backend suite rerun: this slice changes frontend presentation and tests,
  not backend calculation. Source/diff reviewed; no financial recomputation.

## Review / next

Review Laporan at http://127.0.0.1:5175 using disposable preview credentials.
Expand Transportation, NFC Card and Cash; compare balance vs budget expense.
Navigate to an older period and ensure unavailable values are not shown as zero.

Remaining 7C.4: distributions, weekly usage, insights, Sinking Fund exclusions,
complete report presentation, Home/pocket detail and mutation/CSV reconciliation.
No deployment, migration, midnight-rollover change or new product decision.
Changes in this slice remain local for review; last pushed checkpoint `85aba13`.
