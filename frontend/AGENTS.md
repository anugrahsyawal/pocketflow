# Frontend Instructions

- Stack: React 18, TypeScript, Vite 5, Tailwind 3, React Router 6,
  Zustand persist.
- Do not add dependencies without Product Owner approval.
- Preserve AppShell and existing BottomNav.
- Mobile-first target: 375px, 390px, and 430px.
- No page-level horizontal overflow.
- Existing transactions remain the financial source of truth.
- The budget period is fixed at the 26th through the 25th. The existing
  `budgetPeriodStartDay` setup control is implementation drift, not permission
  to make the product period configurable.
- Archived transactions are excluded from calculations.
- Transfer does not count as income or expense.
- Use transaction.date for selected-period reporting.
- Google Stitch is a visual reference only.
- All new report calculations must be pure and deterministic.
- Run both npx tsc --noEmit and npm run build.
- For UI changes, also run the development server, inspect runtime console
  output, manually verify the approved routes and 375px/390px/430px widths,
  then update the walkthrough with only the evidence actually obtained.
- Do not begin Phase 6E until the preceding documentation checkpoint is
  reviewed, committed, pushed, and the working tree is clean.
