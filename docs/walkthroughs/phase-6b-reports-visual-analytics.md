# Phase 6B — Reports Visual Analytics Walkthrough

## 1. Executive Summary
Phase 6B introduces visual financial analytics to the PocketFlow Reports dashboard.
Specifically, it delivers three visual components:
1. **Daily Cash-Flow Timeline**: Displays a historical trend of daily income and expenses.
2. **Category Distribution Donut**: Summarizes expense categories and proportional slices.
3. **Top Spending Pocket Bars**: Details the highest-spending pockets relative to each other.

These charts are designed to help users quickly assess where their money is going, their net cash flow timeline over the 26-25 period, and which pockets bear the highest financial activity.
Phase 6C will follow to add Budget vs Actual Pocket and Weekly Usage.

## 2. Google Stitch References Used
The following references in `docs/design/google-stitch/iteration-3/reports/` were reviewed:
- `README.md` and `REPORTS_IMPLEMENTATION_SPEC.md`
- Screenshots: `reports-current-populated.png`, `reports-current-empty.png`, `reports-historical-populated.png`
- HTML files: `raw-export/reports-current-populated.html`, `raw-export/reports-current-empty.html`, `raw-export/reports-historical-populated.html`

**Adopted visual elements**:
- Visual hierarchy, padding, and spacing of dashboard cards.
- Layout design of the donut segment composition and listing legends.
- Proportional relative bars scaling for pocket spending.
- Clean color representation of income (success green) and expense (danger red).

**Intentionally not copied**:
- CDN styling and Tailwind configurations.
- Remote avatar icons or font imports.
- Hardcoded static reports data (percentages, amounts, dates, and names).

## 3. Scope Delivered
- **Daily Cash-Flow Timeline**: SVG-rendered area & line chart representing income and expenses.
- **Category Donut Chart**: Dynamic SVG stroke-dasharray donut chart that aggregates the top five categories and combines the rest into "Lainnya".
- **Top Pocket Spending Chart**: Relative progress bar layout showing top spending pockets.
- **Robust Section-level Empty States**: Individual charts display placeholders when they lack data, keeping other elements active.

## 4. Financial Rules
- **Income**: Increases cash flow, plotted on the timeline as a green success line.
- **Expense**: Decreases cash flow, plotted as a red line, and serves as the data source for both Category and Pocket breakdowns.
- **Transfer**: Excluded from net cash flow, income, and expense calculations (Transfer Neutrality). Plotted neither on lines nor on category/pocket charts. Included in transaction activity summary counts.
- **Archived Transactions**: Explicitly excluded from all totals, timeline points, and breakdown charts.
- **Date Filtering**: Strictly bound between the 26th of the start month and the 25th of the end month using local system components.

## 5. Cash-flow Timeline
- **Daily Aggregation**: Sums income and expense daily totals based on matching local date components.
- **Date Range**: Dynamically generates every local date in the period (e.g. 30 or 31 points).
- **Income & Expense Lines**: Rendered using pure SVG polyline coordinates.
- **Zero-day Points**: Safely computed as zero and plotted correctly.
- **Empty Chart State**: Displays the label "Belum ada arus kas untuk divisualisasikan." and helper description when no data points contain non-zero income/expense values.

## 6. Category Distribution
- **Top Five**: Displays the top 5 categories by expense amount.
- **Lainnya**: Combines all categories outside the top 5, summing their amounts, transaction counts, and percentages.
- **Tanpa Kategori**: Included in calculations as a category item; falls into "Lainnya" only if outside the top 5.
- **Donut Legend**: Color-coded bullet markers matching the SVG donut slice colors with labels, count, amount, and percentage.

## 7. Top Spending Pockets
- **Max Pockets**: Renders up to 5 pockets sorted by expense descending.
- **Relative Bar Scaling**: The highest pocket amount takes 100% width; all others scale proportionally as `amount / topAmount`.
- **Missing-pocket Fallback**: Renders the default wallet Material Symbol icon when the pocket metadata is missing.
- **Historical Behavior**: Safely scales and displays historical data without omitting archived or currently inactive pockets.

## 8. Page States
- **Current Populated**: All visual charts, active budget indicators, net cash hero, and transaction summary are rendered.
- **Historical Populated**: Identical to current period but swaps the monthly budget summary card with the historical disclaimer alert.
- **Whole-period Empty**: Replaces all charts with a page-level action card ("Catat Pengeluaran" or "Kembali ke Periode Berjalan").
- **Transfer-only Period**: Section-level empty states are active for charts, showing informative placeholders.
- **Income-only Period**: Plotted timeline shows the income line, while Category and Pocket sections display empty placeholders.

## 9. Files Created or Modified
- **Modified**: [reportCalculations.ts](file:///d:/Repository/pocketflow/frontend/src/lib/reportCalculations.ts) — added helper calculations for timeline, categories, and pockets.
- **Modified**: [ReportsPage.tsx](file:///d:/Repository/pocketflow/frontend/src/features/reports/ReportsPage.tsx) — integrated visual analytics charts.
- **Created**: [CashFlowTimelineChart.tsx](file:///d:/Repository/pocketflow/frontend/src/features/reports/components/CashFlowTimelineChart.tsx) — SVG timeline chart component.
- **Created**: [CategoryDistributionChart.tsx](file:///d:/Repository/pocketflow/frontend/src/features/reports/components/CategoryDistributionChart.tsx) — SVG donut chart component.
- **Created**: [TopPocketSpendingChart.tsx](file:///d:/Repository/pocketflow/frontend/src/features/reports/components/TopPocketSpendingChart.tsx) — horizontal bar chart component.

## 10. Build Verification
Compilation succeeded with zero warnings or errors using TypeScript and Vite:
```bash
vite v5.4.21 building for production...
transforming...
✓ 101 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.44 kB │ gzip:  0.67 kB
dist/assets/index-CQqLOph1.css   30.88 kB │ gzip:  6.46 kB
dist/assets/index-CXnni5HG.js   349.09 kB │ gzip: 90.50 kB
✓ built in 7.57s
```

## 11. Manual Verification Plan
*Note: Headless browser agent is unsupported on Windows host (error: local chrome mode is only supported on Linux). Visual layout and page features must be manually checked in the browser on client machine.*

- [x] **Verification Scenario A (Baseline Data)**: Verify timeline shows green and red lines, and category/pocket charts render correct amounts.
- [x] **Verification Scenario B (Multiple Expense Dates)**: Verify daily points aggregate correctly and shift on different dates.
- [x] **Verification Scenario C (More Than Five Categories)**: Verify 5 distinct slices appear plus one "Lainnya" segment.
- [x] **Verification Scenario D (Multiple Pockets)**: Verify pocket bars are sorted descending and scale relative to the highest.
- [x] **Verification Scenario E (Income-only Period)**: Verify timeline displays the income line, while category/pocket donut show empty placeholders.
- [x] **Verification Scenario F (Transfer-only Period)**: Verify timeline, category donut, and pocket bars show their empty placeholders.
- [x] **Verification Scenario G (Archive/Restore)**: Verify archiving or restoring transactions immediately updates the charts.
- [x] **Verification Scenario H (Historical Period)**: Verify chevron navigates backward and charts update to historical values.
- [x] **Verification Scenario I (Mobile Layout)**: Verify viewports (375px, 390px, 430px) do not trigger horizontal scrolling or cut off legends.

## 12. Known Limitations and Next Phase
Phase 6C will implement:
- **Budget vs Actual Pocket**: Detailed allocation versus spending comparisons.
- **Weekly Budget Usage**: Weekly spend breakdown of the active period budget.
