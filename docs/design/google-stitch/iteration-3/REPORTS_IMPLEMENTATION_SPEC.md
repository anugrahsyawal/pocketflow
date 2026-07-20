\# Reports Implementation Specification



\## Canonical page structure



1\. Laporan header and Export CSV

2\. 26–25 period selector

3\. Net cash-flow hero

4\. Income and expense summary

5\. Daily cash-flow timeline

6\. Period budget summary

7\. Budget vs actual by pocket

8\. Expense distribution by category

9\. Top spending pockets

10\. Weekly budget usage

11\. Rule-based period insights

12\. Sinking Fund recommendation

13\. Compact transaction activity summary



\## Common layout



Current populated, historical populated, and empty periods must use the same

section order and visual structure.



Only data, status, available actions, and explanatory copy may differ.



\## Existing application shell



Do not recreate:



\- PocketFlow top header;

\- avatar;

\- visibility button;

\- BottomNav;

\- AppShell.



Use the existing application components.



\## Terminology



Use:



\- Periode berjalan

\- Periode historis

\- Surplus Periode Ini

\- Defisit Periode Ini

\- Arus Kas Periode



Do not use:



\- Bulan Ini

\- Surplus Bulan Ini

\- Arus Kas Bulan Itu



\## Financial rules



\- Expense contributes to period expense.

\- Income contributes to period income.

\- Net cash flow = income - expense.

\- Transfers do not contribute to income, expense, or net cash flow.

\- Archived transactions are excluded.

\- Filter using transaction.date.

\- The selected period is inclusive from the 26th through the 25th.

\- Invalid dates are excluded safely.



\## Required analytics



\### Daily cash-flow timeline



Show daily income and expense across the selected period.



\### Budget vs actual pocket



Show:



\- allocation;

\- actual expense;

\- percentage used;

\- remaining or overbudget;

\- status;

\- transfer in;

\- transfer out;

\- ending balance.



\### Category distribution



Show top five categories and combine the remainder as Lainnya.



Preserve Tanpa kategori when applicable.



\### Top spending pockets



Show a horizontal relative bar visualization.



\### Weekly usage



Split the selected period into:



\- week 1: days 1–7;

\- week 2: days 8–14;

\- week 3: days 15–21;

\- week 4: day 22 through period end.



\### Insights



Insights are deterministic and rule-based, not AI-generated.



\### Sinking Fund



Informational recommendation only.



Do not implement an automatic “Pindahkan Sekarang” action in this phase.



\## CSV export



Export active transactions in the selected period.



Include:



\- transaction\_id;

\- type;

\- date;

\- time;

\- amount;

\- pocket;

\- source\_pocket;

\- destination\_pocket;

\- category;

\- income\_source;

\- transfer\_type;

\- note;

\- created\_at;

\- updated\_at.



Requirements:



\- UTF-8 BOM;

\- Excel-compatible CSV;

\- formula-injection protection;

\- selected-period filename;

\- archived transactions excluded.



\## Empty state



\- Keep the same page header and period selector.

\- Summary values show Rp0.

\- Allocation may still be displayed.

\- Use one unified CTA, not repeated CTAs.

\- Current empty period: Catat Pengeluaran.

\- Historical empty period: Kembali ke Periode Berjalan.

