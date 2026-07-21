# PocketFlow Product Vision

Version: 1.0
Status: Approved planning baseline
Owner: Product Owner (Kyune)
Last updated: 2026-07-21

## Product goal

PocketFlow is a single-user, mobile-first personal finance PWA that helps the
user manage money through pockets, record daily transactions quickly, stay
aware of the current 26–25 budget period, and evaluate spending without giving
up control of personal financial data.

Product direction:

> Pocket-first. Fast input. Daily awareness. Playful but practical.

## Target user

- One personal user first.
- Smartphone-first daily usage.
- Pocket-based monthly budgeting.
- Private, self-controlled financial data.
- A lightweight and friendly interface rather than a spreadsheet-style tool.

## Product principles

1. **Pocket-first** — every money container, including Cash and the NFC card,
   uses one Pocket/Wallet model.
2. **Fast input** — Expense, Income, and Transfer must remain quick to record.
3. **Daily awareness** — Home should explain the user's current financial
   position without requiring a detailed report.
4. **Accurate evaluation** — Reports follow the fixed 26th–25th budget period
   and use transactions rather than hardcoded values.
5. **Playful but practical** — the interface may be warm and encouraging while
   financial rules remain explicit and deterministic.
6. **Private and portable** — production access requires real authentication,
   and the product direction includes offline-capable local input and an
   installable PWA.
7. **Iterative delivery** — backend, synchronization, backup architecture, and
   advanced workflows follow only after the frontend and domain rules are
   stable.

## Approved MVP direction

The approved direction includes:

- single-user PocketFlow;
- pockets and categories;
- Expense, Income, and Transfer;
- a fixed monthly budget period from the 26th through the 25th;
- Goals;
- Home financial awareness;
- basic and analytical Reports;
- selected-period CSV export;
- local/offline transaction input;
- mobile-first and installable PWA behavior;
- supporting Settings and privacy preferences;
- real authentication before production deployment.

The canonical backlog determines delivery sequence. Inclusion in the MVP
direction does not mean inclusion in the immediate Phase 6E scope.

## Later or separately planned capabilities

- debt and receivables;
- quick PIN;
- reimbursement helper;
- transfer templates;
- JSON receipt workflow;
- recurring-transaction enhancements;
- remote synchronization and conflict handling;
- full JSON backup and restore, pending priority refinement;
- production deployment architecture.

## Explicit non-goals for the current frontend checkpoint

- backend implementation;
- database selection;
- production authentication implementation;
- deployment-provider selection;
- historical allocation or balance snapshots;
- automatic Sinking Fund transfers;
- internal OCR or AI receipt processing.
