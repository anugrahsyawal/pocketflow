# PocketFlow Decision Log

Status: Canonical
Owner: Product Owner (Kyune)
Last updated: 2026-07-21
Supersedes as an active authority: `docs/decision-log.md`

Accepted decisions record product or delivery rules that future agents must
not silently reinterpret. Implementation checkpoints belong in
[`PROGRESS.md`](../agile/PROGRESS.md).

## Accepted decisions

### DL-001 - Product direction

Status: Accepted

Decision: PocketFlow is a personal finance PWA with the direction
"Pocket-first. Fast input. Daily awareness. Playful but practical."

### DL-002 - MVP core scope

Status: Accepted, clarified 2026-07-21

Decision: Core direction includes fast transaction input, pocket/category
management, fixed 26-25 budgeting, Home, analytical Reports, Goals,
local/offline input, and an installable PWA. JSON receipt, advanced recurring
work, remote sync, and production infrastructure are sequenced separately.

### DL-003 - Target user

Status: Accepted

Decision: Single personal user first. Multi-user and shared-wallet behavior are
outside the current MVP.

### DL-004 - Fixed budget period

Status: Accepted, reaffirmed 2026-07-21

Decision: The MVP period begins on the 26th and ends on the 25th. The
configurable 1-28 setup field is legacy implementation drift and does not
change the product rule.

### DL-005 - Pocket model

Status: Accepted

Decision: PocketFlow uses one Pocket/Wallet model rather than separate Budget
Pocket and Payment Wallet concepts.

### DL-006 - Cash and NFC handling

Status: Accepted

Decision: Cash and the NFC Transportation Card are normal pockets. An MRT
expense paid by the card reduces the NFC pocket; an NFC top-up is a transfer.

### DL-007 - Transfer neutrality

Status: Accepted, reaffirmed 2026-07-21

Decision: Transfer moves value between pockets and does not count as income,
expense, or net cash flow.

### DL-008 - Category model

Status: Accepted

Decision: Categories are custom analytical labels scoped to pockets. They are
optional during fast entry and fall back to Uncategorized/Tanpa kategori.

### DL-009 - Goals

Status: Accepted

Decision: Goals are part of the MVP direction. A Goal is created manually and
may later derive progress from selected pockets. Detailed acceptance criteria
remain Refinement Needed.

### DL-010 - Recurring behavior

Status: Accepted

Decision: Recurring transactions use preview and confirmation rather than
unattended auto-posting. Enhancements are Sprint 2 or later.

### DL-011 - JSON receipt strategy

Status: Accepted

Decision: PocketFlow does not perform internal OCR or AI processing in the
current MVP. A later workflow may validate and preview JSON produced by an
external AI.

### DL-012 - Offline and remote-sync separation

Status: Accepted, clarified 2026-07-21

Decision: Local/offline transaction input is part of the MVP direction. Remote
sync waits for approved backend queue, idempotency, retry, conflict, and status
contracts.

### DL-013 - UI direction

Status: Accepted

Decision: Playful, warm-cream, rounded, mobile-first UI with Indonesian copy.
`DESIGN.md` is the design-system authority.

### DL-014 - Bottom navigation

Status: Accepted

Decision: `Beranda / Pocket / + / Riwayat / Laporan`. Settings is not a bottom
navigation item.

### DL-015 - Google Stitch use

Status: Accepted

Decision: Stitch is a visual and interaction reference, never production code
or product authority. Generated data, dependencies, navigation, and unsupported
actions must not be copied.

### DL-016 - Authentication direction

Status: Accepted, clarified 2026-07-21

Decision: Current email/password auth is a development mock. Real
authentication is required before production. Provider and implementation are
TBD before backend work; Google login may be considered when simple and
appropriate, with a single-user email/username fallback.

### DL-017 - Deployment direction

Status: Superseded in part

Original direction: Proxmox VM, Cloudflare Tunnel, Hostinger domain, and HTTPS
were considered.

Current decision: No deployment provider is approved. Platform and topology are
TBD before deployment architecture. HTTPS and application authentication remain
production requirements.

### DL-018 - Frontend-first execution

Status: Accepted

Decision: Stabilize the frontend and domain behavior before backend, database,
production authentication, synchronization, or deployment work.

### DEC-019 - Aggregate Weekly Usage

Date: 2026-07-21
Status: Accepted

Decision: `weeklyAllowance = total current-period allocation / 4`. Buckets are
days 1-7, 8-14, 15-21, and day 22 through period end. Per-pocket usage remains
in Budget vs Aktual Pocket; no per-pocket weekly matrix is required.

### DEC-020 - Informational Sinking Fund recommendation

Date: 2026-07-21
Status: Accepted

Decision: The recommendation is informational only. There is no automatic
transfer or "Pindahkan Sekarang" action in the MVP. Historical recommendations
remain unavailable without balance snapshots.

### DEC-021 - Sprint and Phase terminology

Date: 2026-07-21
Status: Accepted

Decision: A Sprint is a product-planning and delivery container. A Phase is a
technical implementation sub-stage inside a Sprint. They are not synonyms.

### DEC-022 - Permanent transaction deletion

Date: 2026-07-21
Status: Accepted

Decision: Archive is the normal reversible removal flow; Restore reverses it.
Permanent delete remains a separate destructive action requiring clear
confirmation. Backend tombstones, propagation, audit metadata, conflicts, and
retention must be designed before backend implementation.

### DEC-023 - Budget Reallocation Transfer (Pindah Alokasi Budget)

Date: 2026-07-22
Status: Accepted

Decision: `Pindah Alokasi Budget` (`budget-reallocation`) is a neutral transfer
type (`type === 'transfer'`) that moves effective balance and active-period
monthly budget allocation between Pockets simultaneously. It is not an expense
or income, and does not alter the total overall budget allocation across all
Pockets.

### DEC-024 - Pocket Budget Owner Configuration for Payment Pockets (Cash & NFC)

Date: 2026-07-22
Status: Accepted

Decision: Cash and the NFC Transportation Card are standard Pockets/Wallets
equal to other Pockets. Their budget owner is configured directly on their
Pocket Detail page (`budgetOwnerPocketId`). Default owners: Cash → Food &
Groceries (`food-groceries`), NFC Card → Transportation (`transportation`).
New expenses paid from Cash/NFC record the configured budget owner
attribution into `t.budgetPocketId` at creation time. Updating the owner
mapping on Pocket Detail does not retroactively alter stored attribution of
historical transactions. Editing an existing transaction preserves its stored
`budgetPocketId` unless the user explicitly changes the payment pocket.

## Pending decisions

The following are deliberately unresolved and must not be guessed:

- production authentication provider and session design;
- backend framework and database;
- deployment platform and topology;
- remote-sync conflict strategy;
- full JSON backup/restore release priority;
- backup retention, encryption, storage location, and restore-test frequency;
- production security and operational architecture.
