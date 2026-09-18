# Phase 7C — Frontend/API integration plan

Date: 2026-09-15
Status: temporary connected-development mode accepted by PO on 2026-09-15;
Phase 7C.1 implemented locally after plan commit `d4b2f36` and a clean-tree check.
See [verification](../walkthroughs/phase-7c1-connected-session.md). Implementation
PO review is pending. No normal-mode cutover or data migration performed.

## Authority and baseline

The PO requested the next frontend/backend integration stage after Reports API
commit `08e15fb`. The working tree was clean at entry. The previous verification
checkpoint has 235 passing backend tests; those tests were not rerun for this
documentation-only analysis. Commit authorization is recorded separately from
formal acceptance of every earlier backend phase.

Authority: PR-002–018 and PR-021, DEC-024/026/027/029/030/031, and the accepted
[setup/master-data](SETUP_MASTER_DATA_API_CONTRACT.md),
[transaction](TRANSACTIONS_API_CONTRACT.md), and
[Reports](REPORTS_API_CONTRACT.md) contracts.

## Findings from source

| Existing frontend | Backend requirement | Integration consequence |
|---|---|---|
| `useAuthStore.ts` persists mock login success | HttpOnly session, `/v1/me`, CSRF | Local auth flags cannot authorize API mode; bootstrap and expired-session states are required |
| `AppDataInitializer.tsx` seeds local pockets/categories after local setup | Server setup status and initialization | Disable local seeding in API mode; do not infer server setup from local flags |
| Pocket IDs are template keys; transactions use `txn-...` IDs | UUIDs; immutable pocket `templateKey` | Preserve server IDs and use templateKey for visual roles; do not cast local IDs into UUIDs |
| Store writes are synchronous and immediately report success | Async validation and commit, idempotency and revision checks | Forms must await acknowledgement and preserve unsaved input on failure |
| `Transaction` has no revision or deletedAt | Revision conflicts and deletion tombstones | Use explicit DTO mappings; no silent overwrite/recreation after conflicts or deletion |
| Pocket monthly allocation is treated as a local base | API returns already revised current allocation, nullable when missing | Never apply reallocation twice or coerce unavailable allocation to zero |
| Local calculations can read the whole transaction array | Transaction API defaults to 50 rows/page | Do not compute all-time balance or complete CSV from one page |
| Setup offers day 1–28 | Approved period is fixed 26–25 | API setup must expose the fixed period; preserve legacy local storage until separately migrated |
| LocalStorage is not owner-scoped | Server reads are owner-scoped | Never hydrate server mode with legacy local financial data or leave prior-owner cache visible |

Source reviewed: frontend auth/setup/pocket/transaction stores, initializer,
route guard/router, transaction types, balance calculations and Vite config;
backend auth routes and existing API contracts. This is a data-flow audit, not
a new visual review of Google Stitch.

## Accepted temporary integration behavior

Implement a separate **connected development mode** first. Requests require the
local backend to be reachable; without acknowledgement, a financial action is
not shown as saved. Keep the existing local mode and its storage untouched and
explicitly separate. Never silently fall back from a failed server write to a
local write. The modes are not two automatically synchronized copies.

This is a staged development restriction, not a removal of PR-017 offline input.
Offline queues, Pending/Failed/Retry status, recovery after reload and deletion
propagation need their own approved sync contract before connected mode can
claim offline support. A local loopback backend does not require internet, but
it must be running and reachable from the browser.

PO explicitly confirmed this behavior on 2026-09-15 and requested implementation
following development best practices. This authorizes the bounded 7C.1 scope,
not automatic migration, removal of offline MVP requirements, or deployment.
The PO subsequently authorized its commit and immediate implementation;
documentation checkpoint `d4b2f36` satisfied that entry gate. Implementation
commit/push still requires separate instruction.

## Proposed bounded implementation sequence

Each stage needs its own reviewed scope and verification; listing a later stage
does not authorize its implementation. No new dependencies are proposed.

### 7C.1 — Transport, session and isolated development entry

- Built-in fetch client and same-origin development proxy to the local API;
  credentialed requests, typed errors, no tokens/passwords in logs or storage.
- Real login, `/v1/me` bootstrap, CSRF kept in memory, logout and expiry behavior.
  Distinguish 401 from network/server failure; never interpret a network failure
  as a successful logout or an empty account.
- Coordinate CSRF refresh because the existing GET rotates the session token.
  Concurrent tabs may invalidate each other's CSRF; bounded refresh/retry must
  preserve mutation identity and never loop indefinitely.
- Isolate API session/cache from legacy persisted stores. Do not expose enabled
  local transaction forms under a real login before their API adapters exist.
  A development-only integration boundary may show session/setup status instead.
- Configure mode explicitly for testing; do not switch the user's normal
  application, provision an account with invented credentials, or clear data.
- Keep existing theme, shell and visual components. Read applicable approved
  Stitch references before any UI implementation.

Acceptance: login/invalid credentials, page reload, expiry, logout, backend-down
states, no local financial storage writes, no secret persistence, no local-store
leak into API mode. Test using disposable owner/database fixtures. Owner
provisioning for the user's real development database is a separate explicit
credential setup, not a test fixture left behind.

### 7C.2 — Setup, pockets and categories

- Server setup status; fixed 26–25 setup flow; await atomic PUT setup result.
- Map templateKey to UUID, opening balance, nullable allocation and revisions.
- Read master data before enabling dependent forms; mutation errors retain input.
- Preserve backend-configured Cash/NFC budget owners; do not resolve by names.
- Use current Reports balance read model where complete balances are needed;
  do not replay one transaction page against openingBalance.
- Old LocalStorage remains untouched; no automatic import or merge.

### 7C.3 — Transactions and lifecycle

- Async income/expense/transfer/batch submission and validation feedback.
- Stable mutation UUID per immutable attempt; identical uncertain retries reuse
  it. Disable double submit. Contract must address unresolved outcomes after
  reload before connected financial writes are enabled.
- Preserve expectedRevision; explicit Reload-only conflict handling; server
  errors never silently roll forward local balances.
- Archive/restore/delete confirmation and post-success refresh of affected
  transactions, balances, allocations, Home and Reports.
- Paginated history and complete selected-period export; no 50-row truncation.

### 7C.4 — Home, Reports and end-to-end reconciliation

- Consume report DTOs without recomputing server budget/reallocation effects.
- Preserve unknown/historical null states and all independent Cash/NFC balances.
- Avoid mixed-period/stale responses when navigating quickly or after mutations.
- Verify Home, pocket detail, Reports and CSV agree on seeded financial facts.
- Preserve approved Stitch appearance; loading/error states must not look like
  Rp0 or a successfully saved transaction.

### Later separately refined stages

- User-initiated validated migration/export/import (DEC-027): identity mapping,
  historical attribution, archive state, duplicate detection, preview, rollback
  and failed-import recovery. Existing endpoints are not a generic legacy import
  API; do not replay an old ledger blindly through ordinary create endpoints.
- Offline queue and server-authoritative sync, deletion propagation and expiry
  beyond the 30-day tombstone window; PWA shell and installability.
- Production hosting and backups. No VPS, Vercel or Supabase change in 7C.1.

## Verification and safety gates

For each implementation stage: type-check, frontend build, deterministic adapter
tests using existing tools, live backend tests on disposable PG, development
server, actual browser console and manual route checks at 375/390/430px, then
source/diff review and walkthrough. A build alone is insufficient. Record actual
evidence rather than claiming the whole integration is verified from API tests.

Do not touch browser LocalStorage, production data, credentials, external
services, or Git history during this planning step. No code/schema/dependencies
were changed. The user must confirm the temporary connected-mode behavior before
it replaces any usable financial workflow.
