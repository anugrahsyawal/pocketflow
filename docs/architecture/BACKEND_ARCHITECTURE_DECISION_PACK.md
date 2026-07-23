# Backend Architecture Decision Pack

Status: Approved for Phase 7B backend foundation

Date: 2026-07-23

## 1. Purpose and boundary

This pack defines the Phase 7A backend direction for PocketFlow. It is a
contract for future backend implementation, not backend code. Antigravity is
the backend developer in a separate task; Codex remains PM, technical lead,
and reviewer.

The backend must preserve the MVP domain already approved by the Product
Owner: one personal user, the fixed 26th--25th budget period, Pocket/Wallet
unification, transaction-derived balances, neutral transfers, Cash/NFC budget
attribution, budget reallocation, archive/restore, and explicit permanent
delete.

Out of scope: multi-user/shared wallets, Goals, recurring transactions,
receipt JSON, production deployment, remote-sync implementation, and offline
service-worker implementation.

## 2. Accepted core decisions

| Area | Decision |
|---|---|
| Backend language and HTTP layer | TypeScript with Fastify. Route request/response schemas are mandatory. |
| Database | PostgreSQL. |
| ORM / query layer | Drizzle ORM. |
| Ownership | One owner account for MVP; no public registration. |
| Authentication | Email/password login, Argon2id password hashing, secure HttpOnly cookie-based session, CSRF protection, and session rotation. Password reset waits for an approved email provider. |
| Money | Indonesian Rupiah stored as non-negative integer minor-free amounts; never floating point. |
| Time | Transaction business date is an Indonesia-local `DATE`; business time is a local `TIME`; audit timestamps are UTC. |
| Balance source | Transactions are the financial source of truth. Cached balances may be introduced only as derived data. |
| Identity | Client and server use UUID entity IDs. Every mutation carries a unique `clientMutationId`/idempotency key. |
| Sync conflicts | Server-authoritative. Create is idempotent; edits use revisions. No silent last-write-wins merge for financial edits. |
| Archive/delete | Archive is reversible. Permanent delete becomes a server tombstone first; physical purge waits for an approved retention policy. |
| Historical budget data | New backend records preserve per-period allocation records from day one. Current allocation must never be used as a historical snapshot. |
| Local data migration | One-time, user-initiated browser export/import with server validation; never silently overwrite or discard local data. |
| Backup baseline | Encrypted daily backups, 30-day retention, monthly restore test, owner-only restore initiation. |
| Deployment baseline | Managed application platform with managed PostgreSQL. Provider and region are selected only when production deployment is approved. |
| Tombstone retention | Transaction delete tombstones remain for 30 days before physical purge. |
| Initial sync conflict UX | Reload-only: the user refreshes server state before retrying a conflicting edit. |

Fastify schema validation and response serialization are part of the selected
HTTP approach. PostgreSQL foreign keys and constraints enforce relational
integrity. Password hashing and session handling follow OWASP guidance.

## 3. Approved implementation decisions

The Product Owner approved the following decisions for backend implementation:

1. **ORM / query layer:** Drizzle ORM.
2. **Existing LocalStorage data:** one-time, user-initiated browser
   export/import; no silent data loss or overwrite.
3. **Backup policy:** encrypted daily backups, 30-day retention, monthly
   restore test, owner-only restore initiation.
4. **Deployment direction:** managed application platform with managed
   PostgreSQL. Exact provider, region, domain/DNS, and operational budget are
   a pre-production selection, not a Phase 7B application-code blocker.
5. **Permanent-delete retention:** tombstone retained for 30 days, then
   physical purge.
6. **Conflict experience:** Reload-only for the first sync release; no
   Keep-Mine / Use-Server merge UI yet.

## 4. Conceptual data model

```text
users
  id, email, display_name, password_hash, created_at, updated_at

auth_sessions
  id, user_id, token_hash, expires_at, revoked_at, created_at, last_used_at

pockets
  id, user_id, name, emoji, group_id, is_spendable,
  budget_owner_pocket_id nullable, is_active, is_archived,
  opening_balance, created_at, updated_at, revision

categories
  id, user_id, pocket_id, name, emoji, is_default, is_active, is_archived,
  created_at, updated_at, revision

budget_periods
  id, user_id, start_date, end_date, created_at

pocket_budget_allocations
  id, budget_period_id, pocket_id, allocated_amount,
  created_at, updated_at, revision

transactions
  id, user_id, type, amount,
  pocket_id nullable, from_pocket_id nullable, to_pocket_id nullable,
  category_id nullable, budget_pocket_id nullable,
  transfer_type nullable, income_source nullable,
  occurred_on, occurred_at_local_time, note,
  archived_at nullable, deleted_at nullable,
  created_at, updated_at, revision

idempotency_records
  id, user_id, client_mutation_id unique per user, request_hash,
  response_reference, created_at, expires_at
```

Required database invariants include:

- every row is owned by one user;
- `amount > 0`;
- expense/income identify a valid payment Pocket;
- transfer identifies distinct source and destination Pockets;
- a transaction may reference only that user's Pocket/category records;
- archived and deleted records are excluded from active balances and reports;
- `budgetPocketId` is an expense attribution snapshot, not a live lookup;
- `budget-reallocation` is a transfer and changes allocation only within its
  budget period.

## 5. API contract shape

All routes are versioned under `/v1`, authenticate the current owner, return
JSON, use schema validation, and expose machine-readable errors.

```text
POST /v1/auth/login
POST /v1/auth/logout
GET  /v1/me

GET  /v1/setup
PUT  /v1/setup

GET  /v1/pockets
GET  /v1/pockets/:id
PATCH /v1/pockets/:id

GET  /v1/categories
POST /v1/categories
PATCH /v1/categories/:id

GET    /v1/transactions
POST   /v1/transactions
PATCH  /v1/transactions/:id
POST   /v1/transactions/:id/archive
POST   /v1/transactions/:id/restore
DELETE /v1/transactions/:id

GET  /v1/reports/periods/:startDate
GET  /v1/reports/current-period
```

Every mutating request includes:

```json
{
  "clientMutationId": "uuid",
  "expectedRevision": 4
}
```

`expectedRevision` is required for edits, archive, restore, and delete. A
stale revision returns a typed conflict response; the server must not silently
overwrite a finance record.

## 6. Sync and lifecycle policy

1. The frontend may continue recording locally while offline.
2. On connectivity, queued mutations are submitted in client order with their
   `clientMutationId`.
3. The server returns the prior successful result for duplicate mutation IDs.
4. New transactions are append operations; duplicate submission is prevented by
   idempotency.
5. Updates, archive, restore, and delete compare `expectedRevision`.
6. Conflicts are retained for explicit user resolution; they are never silently
   merged with last-write-wins.
7. A permanent delete creates a tombstone so offline devices cannot resurrect
   the deleted entity. Purge waits for the retention decision.

Remote sync implementation remains a later approved Phase. This contract is
defined now so backend entities and APIs do not block it.

## 7. Phase sequencing

### Phase 7A -- current

- record approved decisions;
- refine the open Product Owner decisions above;
- create a detailed database schema and endpoint request/response contract;
- define LocalStorage migration and verification strategy.

### Phase 7B -- authorized next

- Antigravity backend technical spike for the approved ORM/query layer;
- backend scaffold, migration tooling, auth/session implementation, and local
  PostgreSQL developer environment;
- API implementation in bounded tasks: auth, setup/master data, transactions,
  reports/read models, then sync.

## 8. Phase 7B acceptance gate

Before implementation begins, this pack requires:

- the approved decisions in section 3;
- a reviewed SQL/ORM schema with ownership and integrity constraints;
- endpoint request, response, error, and pagination/filter contracts;
- LocalStorage migration/rollback plan;
- test strategy for money, authorization, idempotency, archive/delete, and
  conflict behavior;
- a managed deployment and backup baseline for non-development environments.

## References

- PostgreSQL data-definition and constraint documentation:
  <https://www.postgresql.org/docs/current/ddl.html>
- Fastify validation and serialization:
  <https://fastify.dev/docs/v5.8.x/Reference/Validation-and-Serialization/>
- OWASP Password Storage Cheat Sheet:
  <https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html>
- OWASP Session Management Cheat Sheet:
  <https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html>
