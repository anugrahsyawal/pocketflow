# QA Checklist — PocketFlow Sprint 1

> **Superseded as the active acceptance checklist (2026-07-21).** Retained
> temporarily for Product Owner diff review. Use
> [`quality/ACCEPTANCE_CHECKLIST.md`](quality/ACCEPTANCE_CHECKLIST.md). Existing
> unchecked boxes below are historical planning items, not current failure
> claims.

## Build

- [ ] `npm install` succeeds.
- [ ] `npm run dev` succeeds.
- [ ] `npm run build` succeeds.
- [ ] No TypeScript errors.
- [ ] No obvious console errors on initial load.

## Auth

- [ ] `/login` is accessible without auth.
- [ ] Invalid credential shows error.
- [ ] Valid mock credential logs user in.
- [ ] Protected route redirects unauthenticated user to login.
- [ ] Logout clears session.
- [ ] Google login is not active.

## Setup Wizard

- [ ] Setup appears for first-time user.
- [ ] Budget period defaults to day 26.
- [ ] Pocket template contains all required pockets.
- [ ] Initial balances can be entered.
- [ ] Completing setup routes user to Home.

## Pockets

- [ ] All initial pockets appear.
- [ ] Pocket groups are correct.
- [ ] Cash is treated as a pocket.
- [ ] NFC Transportation Card is treated as a pocket.
- [ ] Pocket detail opens.
- [ ] Pocket detail shows categories.

## Transactions

- [ ] Expense can be created.
- [ ] Expense decreases selected pocket balance.
- [ ] Income can be created.
- [ ] Income increases selected pocket balance.
- [ ] Transfer can be created.
- [ ] Transfer decreases source and increases destination.
- [ ] Transfer does not count as income/expense.
- [ ] Transfer source and destination cannot be the same.
- [ ] Date/time fields are visible and editable.
- [ ] Category can be omitted.

## Home

- [ ] Shows Total Semua Pocket.
- [ ] Shows Sisa Spendable.
- [ ] Shows Aman per hari.
- [ ] Shows Transportation + NFC summary.
- [ ] Shows Pantauan Pocket.
- [ ] Shows recent transactions.
- [ ] Hide/show amount toggle works or is represented.

## Reports

- [ ] Reports route exists.
- [ ] Period selector uses 26–25 cycle.
- [ ] Shows total income, total expense, and remaining.
- [ ] Placeholder sections are clearly marked.

## Settings

- [ ] Settings opens from Home avatar/icon.
- [ ] Contains expected settings items.
- [ ] Sprint 2 data/sync items are placeholder/disabled.

## UI/UX

- [ ] Bottom nav labels are consistent Indonesian.
- [ ] App is usable at 390px width.
- [ ] No horizontal scroll.
- [ ] Primary buttons are reachable.
- [ ] Visual style follows DESIGN.md.
- [ ] No English copy remains except product name or technical placeholder where intentional.
