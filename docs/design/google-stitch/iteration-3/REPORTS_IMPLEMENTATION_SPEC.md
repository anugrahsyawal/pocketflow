# Reports Implementation Specification

Status: Approved implementation specification
Owner: Product Owner
Last reconciled: 2026-07-21

This specification controls Reports structure and presentation. Canonical
product requirements and recorded Product Owner decisions control product
behavior if a conflict is discovered.

## Canonical page structure

1. Laporan header and Export CSV
2. 26-25 period selector
3. Net cash-flow hero
4. Income and expense summary
5. Daily cash-flow timeline
6. Period budget summary
7. Budget vs Actual by pocket
8. Expense distribution by category
9. Top spending pockets
10. Aggregate Weekly Usage
11. Rule-based period insights
12. Sinking Fund recommendation
13. Compact transaction activity summary

## Common layout

Current populated, historical populated, and empty periods use the same section
order and visual structure. Only data, temporal status, available actions, and
explanatory copy may differ.

## Existing application shell

Do not recreate the PocketFlow top header, avatar, visibility control,
BottomNav, or AppShell. Use existing application components.

## Terminology

Use `Periode berjalan`, `Periode historis`, `Surplus Periode Ini`,
`Defisit Periode Ini`, and `Arus Kas Periode`. Do not substitute month-based
terms for the 26-25 budget period.

## Financial rules

- Expense contributes to period expense.
- Income contributes to period income.
- Net cash flow equals income minus expense.
- Transfer contributes to none of income, expense, or net cash flow.
- Archived transactions are excluded.
- Filtering uses `transaction.date` and includes both period boundaries.
- The budget period is fixed from the 26th through the 25th.
- Invalid dates are excluded safely.
- Current allocations/balances must not be presented as historical snapshots.

## Required analytics

### Daily cash-flow timeline

Show daily income and expense across the selected period.

### Budget vs Actual by pocket

For the current period, show allocation, actual expense, percentage used,
remaining/overbudget, status, transfer context, and current balance where
available. Historical allocation/balance-dependent values must use an honest
unavailable state until snapshots exist.

### Category distribution

Show the top five categories and combine the remainder as `Lainnya`. Preserve
`Tanpa kategori` where applicable.

### Top spending pockets

Show a horizontal relative-bar visualization sourced from period expenses.

### Aggregate Weekly Usage

Weekly Usage is period-level, not a per-pocket matrix:

- allowance equals total current allocation divided by four;
- week 1 is days 1-7;
- week 2 is days 8-14;
- week 3 is days 15-21;
- week 4 is day 22 through period end.

Each row distinguishes temporal state from financial status. Per-pocket budget
usage remains in Budget vs Actual.

### Insights

Insights are deterministic and rule-based, never AI-generated or randomized.
Historical insights must omit rules that require unavailable allocation/balance
snapshots.

### Sinking Fund

The recommendation is informational only. It must not execute or imply an
automatic transfer. Historical recommendation values remain unavailable until
balance snapshots exist.

## CSV export

Export active transactions from the selected period with these fields:

- transaction ID;
- type;
- date and time;
- amount;
- pocket;
- source and destination pockets;
- category;
- income source;
- transfer type;
- note;
- created and updated timestamps.

The file uses a UTF-8 BOM, remains Excel-compatible, protects against formula
injection, includes the selected period in its filename, and excludes archived
transactions.

## Empty state

- Keep the same page header, period selector, and section order.
- Summary values show Rp0; allocation may still be displayed where truthful.
- Use one unified CTA rather than repeated section CTAs.
- Current empty period CTA: `Catat Pengeluaran`.
- Historical empty period CTA: `Kembali ke Periode Berjalan`.

## Visual and implementation constraints

- Use real transaction/pocket/category state; never hardcode report values.
- Preserve the existing responsive shell and Indonesian UI copy.
- Use screenshots as comparison evidence and raw HTML as raw-only reference.
- Do not import external CDNs, fonts, icons, avatars, static chart values, or
  generated navigation from Stitch.
- Keep calculations pure and deterministic.
