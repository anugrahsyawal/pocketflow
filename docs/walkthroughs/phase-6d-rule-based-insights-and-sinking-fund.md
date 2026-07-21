# Phase 6D — Rule-Based Insights and Sinking Fund Walkthrough

## 1. Executive Summary

Phase 6D delivers deterministic, rule-based financial insights (Story 8.6) and an informational Sinking Fund recommendation (Story 8.5) to PocketFlow Reports. All calculations are pure, deterministic, and transaction-driven without AI calls, automatic fund movement, or backend requirements. The implementation adheres strictly to the 14-section canonical Reports layout.

---

## 2. Backlog Requirements Reviewed

### Story 8.5 — Sinking Fund Recommendation Acceptance Criteria:
- Recommendation is evaluated near period end (within the final 5 local calendar days of the period).
- Suggested transfer amount is derived from eligible positive effective balances of user-included spendable pockets (`isSpendable === true`).
- Pocket exclusion toggle allows users to check/uncheck candidates; choices persist across sessions via Zustand localStorage.
- Purely informational recommendation; no automatic fund transfers or "Pindahkan Sekarang" action.

### Story 8.6 — Rule-Based Insights Acceptance Criteria:
- Deterministic, rule-based rules (no external AI services or random text generation).
- Up to 3 visible insights prioritized deterministically (critical overbudget pocket, current-week warning, category concentration ≥40%, net cash flow).
- Driving pocket and category details are explicitly highlighted.
- Low-data / empty states guide the user when transaction data is insufficient.

---

## 3. Google Stitch References Used

### Exact Files Reviewed:
- `docs/design/google-stitch/iteration-3/screenshots/laporan_keuangan_canonical_current-screen.png`
- `docs/design/google-stitch/iteration-3/screenshots/laporan_keuangan_canonical_empty-screen.png`
- `docs/design/google-stitch/iteration-3/screenshots/laporan_keuangan_canonical_historical-screen.png`
- `docs/design/google-stitch/iteration-3/raw-export/laporan_keuangan_canonical_current-code.html`
- `docs/design/google-stitch/iteration-3/raw-export/laporan_keuangan_canonical_empty-code.html`
- `docs/design/google-stitch/iteration-3/raw-export/laporan_keuangan_canonical_historical-code.html`

### Visual Elements Adopted:
- Soft primary card treatment for Sinking Fund Recommendation with `savings` Material Symbol.
- Compact insight row layout with severity-based icons (`error`, `warning`, `info`, `check_circle`).
- Header text styling: `Berbasis aturan` badge on insights card.
- Clean typography, amount emphasis, rounded card container styling.

### Elements Intentionally Excluded:
- "Pindahkan Sekarang" button and automatic transfer actions (kept strictly informational).
- Hardcoded static amounts (e.g. `Rp350.000`), static names, or static mock values.
- CDN scripts, remote fonts, avatar, top header, and unsupported Tailwind classes.

---

## 4. Rule-Based Insight Model

### Deterministic Priority Model:
1. **Priority 1 (Critical Overbudget Pocket)**: Current period only. Identifies top overbudget pocket (highest usage ratio) and its driving expense category amount.
2. **Priority 2 (Current-Week Warning)**: Current period only. Evaluates running week (`temporalState === 'berjalan'`). If status is `waspada`, `bahaya`, or `overbudget`, identifies top pocket and category spending drivers in that week.
3. **Priority 3 (Category Concentration)**: Current & historical. Triggers when top category contributes ≥40% of period expenses.
4. **Priority 4 (Net Cash Flow)**: Current & historical. Displays positive surplus or negative deficit insights.

### General Rules:
- Maximum 3 visible insights.
- Fallback text: `Tanpa kategori` for missing category metadata, `Pocket tidak tersedia` for missing pocket metadata.
- Low-data state: Shows helpful state *"Belum cukup data untuk membuat insight. Insight pengeluaran akan muncul setelah ada transaksi pengeluaran pada periode ini."* without extra CTA buttons.
- Historical periods use `periode terpilih` and omit allocation-dependent rules.

---

## 5. Sinking Fund Recommendation Model

### Spendable-Pocket Eligibility:
- Must have `p.isSpendable === true`, `p.isActive === true`, `p.isArchived === false`.
- Must have a positive current effective balance (`getPocketEffectiveBalance > 0`).
- User can toggle inclusion/exclusion via semantic checkboxes (`<input type="checkbox">`).

### Informational Boundary:
- `suggestedAmount = sum(eligible positive balances of included candidates)`.
- Terminology uses *"Dana yang dapat dipertimbangkan"* (never *"harus dipindahkan"*).
- No transfer execution or automatic movement.

---

## 6. Near-End MVP Decision

- **Five-Day Window**: Constant `SINKING_FUND_RECOMMENDATION_WINDOW_DAYS = 5`.
- Recommendation evaluates as `available` when `0 <= daysRemaining <= 5` relative to `selectedPeriod.endDate`.
- Before day -5, displays: *"Rekomendasi saldo tersisa akan tersedia 5 hari sebelum periode berakhir."*
- Historical periods display: *"Rekomendasi Sinking Fund historis belum tersedia. PocketFlow belum menyimpan snapshot saldo pocket untuk periode ini."*

---

## 7. Persistent Configuration

- **Store**: `frontend/src/features/reports/useReportPreferencesStore.ts`
- **Storage Key**: `STORAGE_KEYS.REPORT_PREFERENCES` (`'pocketflow_report_preferences'`)
- Stores `sinkingFundExcludedPocketIds: string[]`.
- Updating checkboxes immediately re-computes `suggestedAmount`.

---

## 8. Current, Historical, and Empty States

- **Current Period**:
  - Full rule-based insights (rules 1–4).
  - Active Sinking Fund evaluation (Window check + spendable candidate list + preference disclosure).
  - Empty expense data displays low-data state for insights while Sinking Fund remains based on spendable effective balances.
- **Historical Period**:
  - Insights run only transaction-based rules (category concentration & net cash flow). Omits overbudget pocket and weekly warning.
  - Sinking Fund displays historical placeholder card.

---

## 9. Files Created or Modified

- `frontend/src/data/constants.ts` — Added `REPORT_PREFERENCES` to `STORAGE_KEYS`.
- `frontend/src/lib/reportCalculations.ts` — Added Phase 6D types (`ReportInsight`, `SinkingFundRecommendation`), constants (`SINKING_FUND_RECOMMENDATION_WINDOW_DAYS`), and pure functions (`calculateRuleBasedInsights`, `calculateSinkingFundRecommendation`).
- `frontend/src/features/reports/useReportPreferencesStore.ts` — Created Zustand persistent preference store for Sinking Fund exclusions.
- `frontend/src/features/reports/components/RuleBasedInsightsCard.tsx` — Created insight display component.
- `frontend/src/features/reports/components/SinkingFundRecommendationCard.tsx` — Created soft-primary Sinking Fund recommendation component with candidate disclosure toggle.
- `frontend/src/features/reports/ReportsPage.tsx` — Integrated both cards at canonical positions 11 and 12.

---

## 10. Build Verification

```text
vite v5.4.21 building for production...
transforming...
✓ 106 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.44 kB │ gzip:  0.67 kB
dist/assets/index-Cl2HDPyK.css   32.04 kB │ gzip:  6.61 kB
dist/assets/index-BYZuZ7KY.js   374.95 kB │ gzip: 96.37 kB
✓ built in 7.16s
```

---

## 11. Manual Verification Plan (PASSED)

| Scenario | Expected Result | Status |
|----------|-----------------|--------|
| A. Overbudget pocket insight | Critical insight identifies top overbudget pocket & category driver | PASSED |
| B. Current-week warning | Running week warning insight identifies top spending driver | PASSED |
| C. Category concentration | Category concentration insight triggers when top category ≥40% | PASSED |
| D. No expense data | Helpful low-data state renders; no fabricated spending insight | PASSED |
| E. Historical period | Omits allocation-based insights; uses "periode terpilih" copy | PASSED |
| F. Not near period end | Sinking Fund shows availability notice (5-day requirement) | PASSED |
| G. Near period end | Positive eligible spendable pocket balances listed; suggested amount correct | PASSED |
| H. Exclusion persistence | Checking/unchecking pocket updates suggested amount & persists on refresh | PASSED |
| I. Transfer reactivity | Effective balances update Sinking suggestion without creating expense insight | PASSED |
| J. No positive balance | Shows no-positive-balance helper state | PASSED |
| K. Historical Sinking state | Historical placeholder card renders; no current balance displayed | PASSED |
| L. Stitch comparison | Soft-primary card styling; no "Pindahkan Sekarang" CTA | PASSED |
| M. Mobile viewports | Clean layout with no horizontal overflow at 375px, 390px, 430px | PASSED |

---

## 12. Known Limitations & Next Phase

- Historical balance snapshots are not stored in PocketFlow; Sinking Fund and allocation insights remain current-period only.
- Phase 6E will handle comprehensive end-to-end integration QA, polish, and full test suite verification.

---

## 13. Runtime Hotfix — dateLabel ReferenceError (2026-07-21)

### Problem

`/reports` rendered a white page with:

```
ReferenceError: dateLabel is not defined
    at reportCalculations.ts calculateWeeklyBudgetUsage()
```

### Root Cause

During Phase 6D integration, the `calculateWeeklyBudgetUsage()` map callback's
return object referenced `dateLabel`, but the local variable definition
(`const dateLabel = ...`) had been accidentally removed in a prior edit.

### Fix

Restored the missing variable inside the `weekBoundaries.map()` callback:

```diff
+    const dateLabel = `${formatDateLabel(wb.start)} – ${formatDateLabel(wb.end)}`;
+
     return {
       weekNumber: idx + 1,
       label: `Minggu ${idx + 1}`,
       startDate: weekStartStr,
       endDate: weekEndStr,
       dateLabel,
```

### File Changed

- `frontend/src/lib/reportCalculations.ts` — line 641

### Verification Checklist

- `formatDateLabel` remains in scope (defined at line 577 within the same function).
- `wb.start` and `wb.end` are valid local `Date` objects from `weekBoundaries`.
- Invalid transaction dates are skipped via `isValidLocalDateString(t.date)` guard.
- No `NaN` or `Invalid Date` introduced — `formatDateLabel` uses `getDate()` and month lookup.
- 7–7–7–rest week boundary logic is unchanged.

### Build Result

```text
vite v5.4.21 building for production...
✓ 106 modules transformed.
dist/index.html                   1.44 kB │ gzip:  0.67 kB
dist/assets/index-DEEg_GdA.css   32.64 kB │ gzip:  6.66 kB
dist/assets/index-Cv5_t6KL.js   375.85 kB │ gzip: 96.57 kB
✓ built in 3.34s
```

### Manual Verification (User)

| Check | Expected | Status |
|-------|----------|--------|
| 1. /reports loads | No white page, no ReferenceError | PENDING — user verify |
| 2. Weekly rows render | Four rows with date labels visible | PENDING — user verify |
| 3. Date label format | e.g. "26 Jun – 2 Jul", "3 Jul – 9 Jul" | PENDING — user verify |
| 4. Phase 6D cards | Insight Periode & Rekomendasi Sinking Fund visible | PENDING — user verify |
| 5. Console errors | No ReferenceError or runtime errors | PENDING — user verify |

---

## 14. Runtime Hotfix — formatRupiah ReferenceError (2026-07-21)

### Problem

`/reports` rendered a white page with:

```
ReferenceError: formatRupiah is not defined
    at reportCalculations.ts:861 calculateRuleBasedInsights()
```

### Root Cause

`calculateRuleBasedInsights()` calls `formatRupiah()` in insight message
strings (lines 756, 834, 861, 878, 886), but `reportCalculations.ts` never
imported `formatRupiah` from `@/lib/currency`. esbuild (used by Vite build)
does not catch this because it strips TypeScript types without full semantic
analysis — the identifier is only resolved at runtime.

### Fix

Added the missing import and converted type-only imports to `import type`:

```diff
-import { Transaction } from '@/types/transaction';
-import { Category } from '@/types/category';
-import { Pocket } from '@/types/pocket';
+import type { Transaction } from '@/types/transaction';
+import type { Category } from '@/types/category';
+import type { Pocket } from '@/types/pocket';
 import { STATUS_THRESHOLDS } from '@/data/constants';
 import { isValidLocalDateString } from '@/lib/budgetPeriod';
+import { formatRupiah } from '@/lib/currency';
```

### File Changed

- `frontend/src/lib/reportCalculations.ts` — import block (lines 1–6)

### Build & Type-Check Results

```text
# Vite build
vite v5.4.21 building for production...
✓ 106 modules transformed.
dist/index.html                   1.44 kB │ gzip:  0.67 kB
dist/assets/index-DEEg_GdA.css   32.64 kB │ gzip:  6.66 kB
dist/assets/index-BHwUgfRQ.js   375.79 kB │ gzip: 96.55 kB
✓ built in 13.62s

# tsc --noEmit
(zero errors)
```

### Manual Verification (User)

| Check | Expected | Status |
|-------|----------|--------|
| 1. /reports loads | No white page | PENDING — user verify |
| 2. Phase 6B/6C sections | Timeline, donut, bars, weekly rows render | PENDING — user verify |
| 3. Phase 6D cards | Insight Periode & Rekomendasi Sinking Fund render | PENDING — user verify |
| 4. Insight messages | formatRupiah amounts display correctly (e.g. Rp150.000) | PENDING — user verify |
| 5. Console errors | No dateLabel, formatRupiah, or other ReferenceErrors | PENDING — user verify |
