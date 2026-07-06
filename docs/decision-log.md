# Decision Log — PocketFlow

This document records important product, UX, architecture, and delivery decisions.

## DL-001 — Product Direction

**Date:** Initial planning  
**Status:** Accepted

PocketFlow will be built as a personal finance tracker PWA, not as a native mobile app.

Core direction:

```text
Pocket-first. Fast input. Daily awareness. Playful but practical.
```

Rationale:

- User manages money using Bank Jago-style pockets.
- Daily use will happen primarily on smartphone.
- PWA is enough for installable mobile-like experience without Play Store/App Store overhead.

## DL-002 — MVP Core Scope

**Status:** Accepted

MVP focuses on:

- fast transaction input;
- pocket management;
- category management;
- budget period 26–25;
- simple dashboard;
- basic reports;
- JSON receipt import as future placeholder;
- offline sync later, not in Sprint 1 implementation.

Deferred:

- OCR;
- AI API;
- bank sync;
- multi-user;
- shared wallet;
- advanced investment tracking.

## DL-003 — Target User

**Status:** Accepted

The application is for single personal use first.

No multi-user or shared wallet in Sprint 1.

## DL-004 — Budget Period

**Status:** Accepted

Budget period starts on the 26th and ends on the 25th of the next month.

Rationale:

- Salary arrives around the 25th night.
- Bank Jago pocket allocation is active on the 26th.
- Reports should match real budgeting cycle, not calendar month.

## DL-005 — Pocket Model

**Status:** Accepted

PocketFlow uses a single Pocket/Wallet model.

All money containers are equal:

- Bank Jago pockets;
- Cash;
- NFC Transportation Card.

Rejected model:

```text
Budget Pocket vs Payment Wallet
```

Rationale:

- User wants Cash and NFC to behave as real pockets.
- Expense should reduce the pocket that actually pays.
- Reimbursement can be represented as transfer between pockets.

## DL-006 — Cash and NFC Handling

**Status:** Accepted

Cash is a pocket.
NFC Transportation Card is a pocket.

Examples:

```text
Food & Groceries → Cash
Transportation → NFC Transportation Card
```

MRT expense reduces NFC Transportation Card, not Transportation directly.

## DL-007 — Transfer Rule

**Status:** Accepted

Transfer moves money between pockets and is not counted as income or expense.

Transfer types:

- Normal transfer
- Tarik Tunai
- Top up NFC
- Reimbursement
- Saving allocation

## DL-008 — Category Model

**Status:** Accepted

Category is custom, scoped per pocket, and used for analysis.

Category is optional during fast input.
If no category is selected, transaction can be saved as `Uncategorized`.

## DL-009 — Goal Behavior

**Status:** Accepted

Goal is created manually, but progress can optionally be linked to selected pockets such as:

- Sinking Fund;
- Self-Investment;
- Investments;
- Emergency Buffer;
- Term Deposit.

Goals are not the priority of Sprint 1 UI implementation.

## DL-010 — Recurring Behavior

**Status:** Accepted

Recurring transactions should require simple confirmation, not full auto-posting in MVP.

Salary allocation and MRT daily preview are important, but not in Sprint 1 foundation.

## DL-011 — JSON Receipt Strategy

**Status:** Accepted

The app will not do OCR or AI processing internally in MVP.

Future approach:

1. User sends receipt photo to external AI.
2. External AI generates JSON according to PocketFlow schema.
3. User pastes JSON into PocketFlow.
4. PocketFlow validates, previews, and saves item-level transactions.

Sprint 1 only shows polished placeholder.

## DL-012 — Offline Sync Strategy

**Status:** Accepted

Offline input and sync are required for the final MVP, but not built fully in Sprint 1.

Sprint 1 should prepare frontend architecture and placeholder, but full IndexedDB queue/sync behavior can wait until transaction model and backend API are stable.

## DL-013 — UI Direction

**Status:** Accepted

Visual style:

- playful/fun;
- warm cream background;
- primary blue actions;
- rounded cards;
- pocket/card metaphor;
- Indonesian copy;
- simple, mobile-first, not dashboard-heavy.

DESIGN.md is the design system source of truth.

## DL-014 — Bottom Navigation

**Status:** Accepted

Final bottom navigation labels:

```text
Beranda / Pocket / + / Riwayat / Laporan
```

Add action is emphasized as center button.

Settings is accessed from avatar/icon on Home, not bottom navigation.

## DL-015 — Google Stitch Output

**Status:** Accepted as visual reference

Google Stitch Iteration 2 is approved for handoff to frontend implementation.

Caveat:

- Do not copy raw Stitch HTML as production code.
- Use Stitch screenshots/designs as visual reference only.
- Fix data/copy inconsistencies during Antigravity implementation.

Important corrections for handoff:

- remove active Google login;
- use final pocket list;
- standardize bottom nav Indonesian labels;
- avoid generic names like Dompet Utama/Rekening Utama/Shopping;
- include Reimbursement transfer type;
- include categories in Pocket Detail;
- keep JSON Struk as placeholder only.

## DL-016 — Authentication Method

**Status:** Accepted

Sprint 1 uses email/username + password mock login.

Google login is not part of Sprint 1.

Reason:

- User is single personal user.
- Google OAuth adds setup and deployment complexity.
- MVP should avoid unnecessary external dependency.

## DL-017 — Deployment Direction

**Status:** Planned

Future deployment target:

- Local Proxmox VM;
- Cloudflare Tunnel;
- Hostinger custom domain;
- HTTPS;
- app-level login required.

Cloudflare Access is deferred.

## DL-018 — Sprint 1 Execution Strategy

**Status:** Accepted

Sprint 1 should build frontend foundation with mock data first.

Backend, database, real auth, offline sync, and deployment are planned for later steps.
