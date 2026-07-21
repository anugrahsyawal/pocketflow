# PocketFlow Product Requirements

Version: 1.0
Status: Approved planning baseline
Owner: Product Owner (Kyune)
Last updated: 2026-07-21
Supersedes as an active authority: `docs/product-requirements.md`

## 1. Purpose and authority

This document contains stable product rules and approved scope boundaries.
Story-level delivery status and acceptance criteria belong in
`PRODUCT_BACKLOG.md`. Implementation facts belong in `CURRENT_STATE.md` and
verification evidence belongs in walkthroughs and the traceability matrix.

## 2. Core requirements

| ID | Requirement |
|---|---|
| PR-001 | PocketFlow is a single-user, mobile-first personal finance PWA. |
| PR-002 | The MVP budget period is fixed from the 26th through the 25th. |
| PR-003 | Bank-style pockets, Cash, and the NFC Transportation Card use one Pocket/Wallet model. |
| PR-004 | Categories are analytical labels scoped to a pocket; they are optional during fast Expense input and fall back to `Uncategorized`/`Tanpa kategori`. |
| PR-005 | Expense decreases one pocket, Income increases one pocket, and Transfer moves value between two distinct pockets. |
| PR-006 | Transfers do not contribute to income, expense, or net cash flow. |
| PR-007 | Transactions are the financial source of truth for derived effective balances and Reports. |
| PR-008 | Archive is the normal reversible transaction-removal flow; Restore reverses it. Permanent delete is a separate, explicitly confirmed destructive action. |
| PR-009 | Home provides current-period awareness, including total money, spendable money, a safe-daily indicator, pocket attention, recent transactions, and amount privacy. |
| PR-010 | Reports use inclusive transaction dates within the selected 26–25 period and exclude archived transactions. |
| PR-011 | Reports include period cash flow, category and pocket spending, current Budget vs Actual, Weekly Usage, deterministic insights, and an informational Sinking Fund recommendation. |
| PR-012 | Weekly Usage is an overall current-period analysis: `weeklyAllowance = total current-period allocation / 4`, using 7–7–7–remainder day buckets. |
| PR-013 | Budget vs Actual per pocket remains separate from aggregate Weekly Usage. |
| PR-014 | The Sinking Fund recommendation is informational only and must not execute an automatic transfer. |
| PR-015 | Selected-period CSV export is part of the current Reports MVP. |
| PR-016 | Goals are part of the MVP direction; their detailed workflow still requires refinement before implementation. |
| PR-017 | Local/offline transaction input and an installable PWA are part of the MVP direction. |
| PR-018 | Real authentication is required before production deployment; provider and implementation remain TBD before backend work. |
| PR-019 | Settings supports product preferences such as privacy, app configuration, authentication, backup/sync entry points, and appearance where applicable. |
| PR-020 | JSON receipt input and recurring-transaction enhancements belong to Sprint 2 or later. |
| PR-021 | Remote synchronization requires an approved backend queue, idempotency, conflict, retry, and status model. |
| PR-022 | Full JSON backup/restore priority and its schema remain Refinement Needed. |
| PR-023 | Historical allocation and balance snapshots are deferred; future data design must not make them impossible. |

## 3. Budget period

The MVP period is always:

```text
26th of one month through 25th of the next month
```

Examples:

```text
26 June 2026 – 25 July 2026
26 December 2026 – 25 January 2027
```

The persisted `budgetPeriodStartDay` field and the setup UI that permits days
1–28 are legacy implementation drift. They do not change the approved rule.
They must not be silently deleted or migrated during documentation work. A
frontend remediation/migration task belongs in Phase 6E or a later approved
phase.

## 4. Pocket and category model

Initial fixed monthly allocations total Rp5,800,000:

| Pocket | Monthly allocation | Group | Spendable |
|---|---:|---|---|
| Housing & Utilities | Rp866,500 | Bills | No |
| Personal Care | Rp133,500 | Daily | Yes |
| Food & Groceries | Rp1,300,000 | Daily | Yes |
| Transportation | Rp200,000 | Daily | Yes |
| Entertainment | Rp200,000 | Daily | Yes |
| Sinking Fund | Rp500,000 | Savings | No |
| Self-Investment | Rp250,000 | Savings | No |
| Investments | Rp150,000 | Savings | No |
| Emergency Buffer | Rp200,000 | Savings | No |
| Term Deposit | Rp2,000,000 | Savings | No |
| Cash | Configurable | Daily | Yes |
| NFC Transportation Card | Configurable | Daily | Yes |

Pockets and categories with financial history should normally be archived
rather than removed in a way that breaks historical references.

## 5. Transaction rules

### Expense

- Required: amount, pocket, date, and time.
- Optional: category and note.
- Amount must be greater than zero.
- Expense reduces the selected pocket's effective balance.

### Income

- Required: amount, pocket, date, and time.
- Optional: source and note.
- Income increases the selected pocket's effective balance.

### Transfer

- Required: source pocket, destination pocket, amount, date, and time.
- Source and destination must differ.
- Transfer moves value between pockets and remains financially neutral in
  Reports.
- Supported labels include normal transfer, cash withdrawal, NFC top-up,
  reimbursement, and saving allocation.

### Removal lifecycle

- Archive: reversible and excluded from active balances and Reports.
- Restore: re-applies the archived transaction's financial effect.
- Permanent delete: allowed only as a distinct destructive action with clear
  confirmation.
- Before backend implementation, deletion propagation, tombstones, audit
  metadata, retention, and sync-conflict behavior must be approved.

## 6. Reports rules

- Filter using `transaction.date` and valid local `YYYY-MM-DD` dates.
- Selected-period boundaries are inclusive.
- Archived transactions are excluded.
- Transfer volume may be shown as activity but is excluded from income,
  expense, and net cash flow.
- Current allocations must not be presented as historical facts.
- Current Budget vs Actual and aggregate Weekly Usage may use current
  allocations.
- Historical allocation-dependent analytics remain unavailable until
  snapshots exist.
- Insights are pure, deterministic, and rule-based rather than AI-generated.
- The Sinking Fund recommendation is available near the end of the current
  period and remains informational.

## 7. Authentication, offline, and PWA

- Current mock authentication is development-only.
- Production authentication provider is TBD before backend implementation.
- Private financial routes require authentication in production.
- Offline-capable local transaction input is required by the MVP direction.
- Remote synchronization is a later backend/integration concern.
- Installable PWA behavior requires valid icons, a service worker/app-shell
  strategy, and actual installability verification.
- Runtime dependency on external fonts and icons should be minimized or
  removed for offline reliability.

## 8. Deferred and TBD requirements

The following do not block the documentation bootstrap:

- production authentication provider;
- backend framework and database;
- synchronization conflict strategy;
- deployment platform;
- JSON backup/restore release priority;
- backup retention, encryption, storage location, and restore-test frequency;
- production security and operations architecture.

These items must remain explicit in the backlog, decision-log pending section,
and Risks and Blockers until resolved.
