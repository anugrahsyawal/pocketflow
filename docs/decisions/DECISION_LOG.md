# PocketFlow Decision Log

Status: Canonical
Owner: Product Owner (Kyune)
Last updated: 2026-08-13
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

### DEC-025 - Phase 7 backend core direction

Date: 2026-07-22
Status: Accepted

Decision: PocketFlow backend planning uses TypeScript, Fastify, and PostgreSQL.
The MVP is one owner account with no public sign-up. The implementation must
use schema validation, integer Rupiah amounts, PostgreSQL relational
constraints, UUID entity IDs, and transaction-derived balances. ORM/query-layer
selection remains pending an approved technical comparison.

### DEC-026 - Production authentication and sync integrity direction

Date: 2026-07-22
Status: Accepted

Decision: Production authentication starts with owner email/password, Argon2id
password hashing, and secure HttpOnly cookie sessions; password reset waits for
an approved email provider. Local-first data may later sync to a
server-authoritative backend. Mutations require idempotency IDs; edits use
revisions and must not silently resolve finance conflicts with last-write-wins.
Archive remains reversible. Permanent delete produces a tombstone until an
approved retention/purge policy exists.

### DEC-027 - Phase 7B persistence, migration, and conflict choices

Date: 2026-07-23
Status: Accepted

Decision: Phase 7B uses Drizzle ORM with PostgreSQL. Existing browser
LocalStorage data moves only through a one-time, user-initiated export/import
workflow with validation; it is never silently overwritten or discarded.
Transaction permanent-delete tombstones remain for 30 days before physical
purge. The initial sync conflict experience is Reload-only: financial edits
must reload current server state before retrying, with no silent merge or
Keep-Mine / Use-Server UI.

### DEC-028 - Backup and deployment baseline

Date: 2026-07-23
Status: Accepted

Decision: Production direction is a managed application platform with managed
PostgreSQL. Backups are encrypted, run daily, retain 30 days, undergo a
monthly restore test, and may be initiated only by the owner. Exact deployment
provider, region, domain/DNS, and operating budget are selected when a
production deployment phase is approved; they do not block Phase 7B local
application development.

### DEC-029 - Owner Provisioning, Session Lifecycle, and CSRF Protection

Date: 2026-08-05
Status: Accepted

Decision: PocketFlow MVP authentication uses single-owner provisioning via CLI
(`npm run owner:provision`) reading `OWNER_EMAIL`, `OWNER_DISPLAY_NAME`, and
`OWNER_PASSWORD`. No public registration endpoint exists. Provisioning succeeds
only when the `users` table is completely empty. Passwords use Argon2id
hashing. Session tokens and CSRF tokens are stored strictly as SHA-256 hashes in
the database. Cookies are `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure=true` in
production with a 30-day absolute expiration. Sessions are rotated upon
successful login (revoking any existing active session). State-changing
session-authenticated endpoints require and validate the `X-CSRF-Token` header.

### DEC-030 - Transaction API Contract Decisions Finalization

Date: 2026-08-24
Status: Accepted

Decision: Following Product Owner audit of the MVP transaction management rules, the canonical Transaction API Contract decisions are accepted as follows:

1. **Multi-Entry Expense Capture Batch Endpoint**: Multi-entry expense capture atomicity is preserved by adding `POST /v1/transactions/batch` to the approved architecture. The batch endpoint validates and executes all entry writes in a single atomic SQL transaction. Batch requests require a top-level `clientMutationId` for the batch operation, plus each item in the `items` array carries its own `clientMutationId`.
2. **Automated Tombstone Purge & Audit Metadata**: Soft-deleted transaction tombstones (`deletedAt`) are automatically purged after 30 days of retention by a scheduled backend background worker, writing immutable deletion/purge audit metadata. No administrative or public purge API is exposed.
3. **Negative Balance Rejection**: Expenses and transfer source deductions MUST be rejected with `422 Unprocessable Entity` (`code: "INSUFFICIENT_FUNDS"`) if the resulting derived balance of the payment or source pocket would drop below zero.
4. **Payment Pocket Category Scoping**: Expense categories MUST belong directly to the selected payment pocket (`category.pocketId === expense.pocketId`). Mismatched or cross-pocket category references return `422 Unprocessable Entity` (`code: "INVALID_REFERENCE"`).
5. **Budget Reallocation Floor Against Recorded Expenses**: `budget-reallocation` transfers MUST be rejected with `422 Unprocessable Entity` (`code: "INSUFFICIENT_ALLOCATION"`) if the revised allocation for `fromPocketId` in the target period would be less than the total recorded expenses already incurred by `fromPocketId` in that period.
6. **Filtering, Sorting & Pagination Defaults**: `GET /v1/transactions` query defaults are fixed at `page = 1`, `limit = 50` (max limit 100), default sort order `occurredOn DESC, occurredAtLocalTime DESC, createdAt DESC`, text search `search` max 100 characters against `note`, and `includeArchived` boolean string filter (`"true"` / `"false"`).
7. **Permanent Delete Body Confirmation**: Permanent delete (`DELETE /v1/transactions/:id`) requires both client UI confirmation and explicit request body parameter `confirmPermanentDelete: true`.
8. **Foreign Reference Error Uniformity**: Invalid, cross-owner, or archived foreign key references return `422 Unprocessable Entity` (`code: "INVALID_REFERENCE"`) without leaking target entity existence or metadata.
9. **Target Pocket Allocation Auto-Creation**: Reallocation to a target pocket lacking an allocation record in the target period automatically creates a `pocket_budget_allocations` row (starting at Rp0) before applying the reallocation addition.
10. **No-Op PATCH Revision Preservation**: A `PATCH /v1/transactions/:id` request supplying identical field values returns `200 OK` with the current entity and leaves stored `revision` unchanged.
11. **Reallocation Target Period by Date & Auto-Period Creation**: `budget-reallocation` applies to the budget period containing `occurredOn` (26th–25th). If no `budget_periods` row exists for historical or future `occurredOn`, the backend automatically creates the `budget_periods` row within the same SQL transaction.

### DEC-031 - Reports data availability and local exclusions

Date: 2026-09-14
Status: Accepted by Product Owner, conditional on preserving the existing MVP

1. Phase 7B.5 historical reports show transaction analytics but not historical
   allocation-dependent budget/weekly allowance, current balances presented as
   historical balances, or Sinking Fund recommendations. Historical snapshots
   remain deferred; existing per-period rows are not silently promoted to a
   complete snapshot feature.
2. Missing current-period allocation means "Belum diatur", not zero. Report GETs
   never auto-copy previous allocations or create period/allocation records.
3. Sinking Fund exclusions remain locally persisted and are sent through a
   validated optional report query parameter. No preference database, sync
   feature or transfer action is added by this decision.

This acceptance authorizes finalizing the report contract, not production
deployment, new MVP features or endpoint implementation before its contract gate.

## Pending decisions


The following are deliberately unresolved and must not be guessed:

- deployment platform and topology;
- full JSON backup/restore release priority;
- deployment-specific backup execution choices (host/provider storage integration, monitoring, credentials/secrets management, and restore runbook evidence);
- production security and operational architecture.
