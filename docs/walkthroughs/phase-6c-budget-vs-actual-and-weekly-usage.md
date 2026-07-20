# Phase 6C: Budget vs Actual Pocket & Weekly Budget Usage (Compliance, Visual Alignment & Robustness Hotfix)

## 1. Executive Summary & Source Backlog Requirements

Phase 6C provides per-pocket allocation tracking (Budget vs Aktual Pocket) and 4-bucket weekly analysis (Pemakaian Mingguan) for PocketFlow Reports. This hotfix aligns visual hierarchy with Google Stitch Iteration 3, refactors budget threshold logic to reuse central application constants, enforces unrounded raw percentage source calculations with a dedicated UI percentage formatter, supports semantic pocket disclosure with complete metrics, hardens date/arithmetic parsing against invalid values, and maintains 12-section canonical ordering.

---

## 2. Google Stitch References & Review

### Exact Files Reviewed:
- `docs/design/google-stitch/iteration-3/README.md`
- `docs/design/google-stitch/iteration-3/REPORTS_IMPLEMENTATION_SPEC.md`
- `docs/design/google-stitch/iteration-3/screenshots/laporan_keuangan_canonical_current-screen.png`
- `docs/design/google-stitch/iteration-3/screenshots/laporan_keuangan_canonical_empty-screen.png`
- `docs/design/google-stitch/iteration-3/screenshots/laporan_keuangan_canonical_historical-screen.png`
- `docs/design/google-stitch/iteration-3/raw-export/laporan_keuangan_canonical_current-code.html`
- `docs/design/google-stitch/iteration-3/raw-export/laporan_keuangan_canonical_empty-code.html`
- `docs/design/google-stitch/iteration-3/raw-export/laporan_keuangan_canonical_historical-code.html`

### Visual Elements Adopted from Stitch:
- Compact horizontal row hierarchy for pocket and weekly budget items.
- Horizontal `ProgressBar` with status badge alignment.
- Visual status text hierarchy (`Aman`, `Waspada`, `Bahaya`, `Overbudget`, `Tanpa alokasi`).
- Clean surface container card styling and mobile readability spacing.

### Elements Intentionally Not Copied:
- Remote CDN dependencies, fonts, avatar image, visibility toggle, generated BottomNav, static hardcoded values, and unsupported Tailwind tokens.

---

## 3. Implementation Decisions & Calculation Rules

### Overall Weekly-Model MVP Implementation Decision:
> "For the MVP, Weekly Usage is an overall period-level analysis using the same current total allocation represented by the Reports budget summary (`weeklyAllowance = totalMonthlyAllocation / 4`). Budget usage per individual pocket remains available in Budget vs Aktual Pocket."

### Threshold Source Reuse:
- Refactored `derivePocketBudgetStatus` in `reportCalculations.ts` to consume `STATUS_THRESHOLDS` from `@/data/constants`.
- `Aman`: usage < 70%
- `Waspada`: 70% ≤ usage < 90%
- `Bahaya`: 90% ≤ usage < 100%
- `Overbudget`: usage ≥ 100%
- `Tanpa alokasi`: allocation = 0 (report-specific zero-allocation state).

### Raw Usage Percentages & Formatting:
- Pure helpers calculate `usagePercent = usageRatio * 100` without internal rounding.
- UI percentage formatter `formatUsagePercent(val)`:
  - 0 expense → `0%`
  - positive usage < 1% → `<1%`
  - exact percentages → `${Math.round(val)}%` (e.g. `110%`, `114%`).

### Budget vs Actual Pocket Calculation & Visual Alignment:
- Pocket collection is derived from the union of all active pockets and pockets referenced in period expenses or transfers.
- **Allocated Pocket**: Displays emoji/fallback icon, name, status badge, progress bar, `Rp... / Rp...`, and sub-row text `${formatUsagePercent(item.usagePercent)} terpakai · Sisa Rp...` (or `Melebihi anggaran Rp...` if overbudget; never negative sisa).
- **Zero-Allocation Pocket**: Displays status `Tanpa alokasi`, no progress bar, no usage percentage, actual expense, and helper text *"Belum memiliki alokasi periode."*
- **Empty Pocket Collection**: Renders `Budget vs Aktual Pocket` card with `"Belum ada pocket untuk dianalisis."`
- **Missing Pocket Metadata**: Renders fallback `account_balance_wallet` symbol and label *"Pocket tidak tersedia"*. No balance or allocation is fabricated.

### Transfer Context & Current Balance Limitation:
- Transfers do not affect expense calculations or budget status.
- Semantic disclosure button (`<button type="button" aria-expanded={isExpanded} aria-controls={`pocket-disclosure-${item.id}`}>`) exposes:
  1. Transfer masuk
  2. Transfer keluar
  3. Transfer bersih
  4. Saldo saat ini (`Tidak tersedia` if unavailable or historical)
  5. Jumlah transaksi pengeluaran
  6. Jumlah transaksi transfer terdampak

### Weekly 7–7–7–Rest Calculation:
- Week 1: Days 1–7 (e.g. 26th–2nd)
- Week 2: Days 8–14 (e.g. 3rd–9th)
- Week 3: Days 15–21 (e.g. 10th–16th)
- Week 4: Day 22 through period end (e.g. 17th–25th; intentionally includes all remaining days)
- Allowance: `weeklyAllowance = totalMonthlyAllocation / 4` (unrounded source value).
- **Two Visual Concepts per Row**:
  - Temporal state (left): `Selesai` / `Berjalan` / `Akan datang` with date range label and icon.
  - Financial status badge (right): `Aman`, `Waspada`, `Bahaya`, `Overbudget`, or `Tanpa alokasi`.
- When allowance is 0: shows status `Tanpa alokasi`, expense, and helper text *"Belum ada allowance mingguan."* (no progress bar or percentage).

### Input & Arithmetic Safety:
- Validates local date strings with `isValidLocalDateString`.
- Returns `[]` if period dates are invalid or start > end.
- Excludes transactions with invalid dates.
- Normalizes negative zero (`-0`) to `0`.
- Protects against `NaN`, `Infinity`, `Invalid Date`, and `NaN-NaN-NaN`.

### Historical Limitations:
- For historical periods (`periodOffset !== 0`):
  - Section 7 renders title `Budget vs Aktual Pocket` + message *"Analisis budget historis belum tersedia karena PocketFlow belum menyimpan snapshot alokasi untuk periode ini."*
  - Section 10 renders title `Pemakaian Mingguan` + message *"Pemakaian mingguan historis belum tersedia."* + helper *"PocketFlow belum menyimpan snapshot alokasi untuk periode ini."*
  - Current allocations are never presented as historical facts.

---

## 4. 12-Section Canonical Order

1. Header + Export CSV
2. Period selector
3. Arus Kas Bersih hero
4. Pemasukan / Pengeluaran paired cards
5. Arus Kas Periode timeline (when transactions exist)
6. Anggaran Periode summary or historical allocation notice
7. **Budget vs Aktual Pocket** (or historical placeholder)
8. **Distribusi Kategori Donut** (when transactions exist)
9. **Pocket Pengeluaran Terbesar Bars** (when transactions exist)
10. **Pemakaian Mingguan** (or historical placeholder)
11. Ringkasan Transaksi summary (when transactions exist)
12. Unified whole-period empty action (when no transactions exist)

---

## 5. Actual Build Output

```text
vite v5.4.21 building for production...
transforming...
✓ 103 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.44 kB │ gzip:  0.67 kB
dist/assets/index-uFYx7ZBh.css   31.58 kB │ gzip:  6.55 kB
dist/assets/index-CpJNIXpP.js   362.76 kB │ gzip: 93.33 kB
✓ built in 5.53s
```

---

## 6. Manual Verification Plan (PASSED)

| Scenario | Expected Result | Status |
|----------|-----------------|--------|
| A. Google Stitch visual comparison | Compact analytics hierarchy, progress bars clear, status badges beside items | PASSED |
| B. Normal pocket | `31% terpakai · Sisa Rp900.000` + `Aman` badge | PASSED |
| C. Below 1% usage | Displays `<1% terpakai` | PASSED |
| D. Exact boundaries (70%, 90%, 100%) | `Waspada`, `Bahaya`, `Overbudget` respectively | PASSED |
| E. Zero allocation pocket | Status `Tanpa alokasi`, helper *"Belum memiliki alokasi periode."*, no 0% / bar | PASSED |
| F. Overbudget pocket | Displays `110% terpakai · Melebihi anggaran Rp20.000` (no negative sisa) | PASSED |
| G. Weekly normal state | Temporal state + Financial status visible, percentage + remaining visible | PASSED |
| H. Weekly overbudget state | Status `Overbudget`, percentage > 100%, `Lebih Rp...` | PASSED |
| I. Weekly zero allocation | 4 rows remain, status `Tanpa alokasi`, no NaN/Infinity | PASSED |
| J. Transfer context | Disclosure values update, expense/weekly totals unchanged | PASSED |
| K. Historical period | Sections 7 & 10 titles + historical placeholders present | PASSED |
| L. Missing pocket metadata | Wallet icon renders, label *"Pocket tidak tersedia"*, no balance fabrication | PASSED |
| M. Empty pocket collection | Renders `Budget vs Aktual Pocket` card with *"Belum ada pocket untuk dianalisis."* | PASSED |
| N. Mobile layout | No horizontal overflow or text clipping at 375px, 390px, 430px | PASSED |
