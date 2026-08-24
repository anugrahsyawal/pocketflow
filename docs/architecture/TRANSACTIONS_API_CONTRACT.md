# Transaction API Contract Specification

> [!NOTE]
> **PRODUCT OWNER ACCEPTED — IMPLEMENTATION NOT AUTHORIZED**
>
> This specification defines the canonical Phase 7B.4 Transaction API Contract accepted by the Product Owner on 2026-08-24 ([DEC-030](../decisions/DECISION_LOG.md#dec-030---transaction-api-contract-decisions-finalization)). Endpoint implementation (`/v1/transactions*`) remains **NOT AUTHORIZED** until explicit implementation authorization is granted in a subsequent delivery phase.

- **Status**: Product Owner Accepted (2026-08-24) — Implementation Not Authorized
- **Date**: 2026-08-24
- **Approved Architecture Reference**: [BACKEND_ARCHITECTURE_DECISION_PACK.md](BACKEND_ARCHITECTURE_DECISION_PACK.md)
- **Accepted Prior Master Data Contract**: [SETUP_MASTER_DATA_API_CONTRACT.md](SETUP_MASTER_DATA_API_CONTRACT.md)
- **Canonical Decision Record**: [DECISION_LOG.md](../decisions/DECISION_LOG.md#dec-030---transaction-api-contract-decisions-finalization) (DEC-030)
- **Implementation Role**: Antigravity (Backend Developer)
- **Review Role**: Codex (Technical Project Manager / Tech Lead)
- **Product Owner**: Kyune

---

## 1. Scope and Boundary Definition

### 1.1 In-Scope Endpoints for Phase 7B.4

Phase 7B.4 defines the canonical API contract for owner financial transactions (expenses, incomes, standard transfers, and budget reallocation transfers). The approved route inventory is bounded strictly to the 7 endpoints below:

- `GET /v1/transactions` — Query and list owner transactions with pagination and multi-field filtering (`type`, `pocketId`, `categoryId`, `startDate`, `endDate`, `search`, `includeArchived`).
- `POST /v1/transactions` — Create a single transaction (Expense, Income, Standard Transfer, or Budget Reallocation Transfer).
- `POST /v1/transactions/batch` — Create multiple expense transactions atomically in a single SQL transaction (preserves frontend multi-entry expense capture atomicity).
- `PATCH /v1/transactions/:id` — Update an existing active transaction with optimistic revision control and idempotency.
- `POST /v1/transactions/:id/archive` — Mark a transaction as archived (reversibly removing its financial impact from active derived balances and active reports).
- `POST /v1/transactions/:id/restore` — Restore an archived transaction to active status (re-applying its financial impact to derived balances and reports).
- `DELETE /v1/transactions/:id` — Soft-delete / tombstone a transaction (requires client UI confirmation and request body `confirmPermanentDelete: true` per DEC-022 / DEC-030, excludes entity from active queries, and initiates 30-day tombstone retention prior to automated background purge per DEC-027).

### 1.2 Explicit Out-of-Scope List

The following capabilities are explicitly forbidden from implementation in Phase 7B.4 until separately specified and authorized:

- `GET /v1/transactions/:id` — Single transaction GET endpoint does NOT exist in the approved architecture route list. Transaction detail lookups use `GET /v1/transactions` with filtering.
- Public / Administrative Purge API — Automated 30-day tombstone purge is executed exclusively by a backend background worker; no administrative or public HTTP purge endpoint exists.
- Report Endpoints (`/v1/reports/*`) — Analytical period reports and insights endpoints are reserved for Phase 7B.5.
- Client-Side Synchronization Queue / Offline Service Worker — Remote sync queue, client-side conflict reconciliation, and service worker shell are reserved for later approved sync phases.
- Production Infrastructure / DNS / SSL Setup — Production deployment topology and platform setup remain out of scope for local application development.

---

## 2. Technical Prerequisites & Database Schema Analysis

### 2.1 Audit of Existing Database Schema (`backend/src/db/schema.ts`)

The database schema defined in `backend/src/db/schema.ts` includes the `transactions` table with columns: `id`, `user_id`, `type`, `amount`, `pocket_id`, `from_pocket_id`, `to_pocket_id`, `category_id`, `budget_pocket_id`, `transfer_type`, `income_source`, `occurred_on`, `occurred_at_local_time`, `note`, `archived_at`, `deleted_at`, `created_at`, `updated_at`, and `revision`.

Check constraints currently enforced in PostgreSQL:
1. `transactions_amount_gt_zero`: `amount > 0`
2. `transactions_exclusive_topology`:
   `((type IN ('expense', 'income') AND pocket_id IS NOT NULL AND from_pocket_id IS NULL AND to_pocket_id IS NULL) OR (type = 'transfer' AND from_pocket_id IS NOT NULL AND to_pocket_id IS NOT NULL AND from_pocket_id <> to_pocket_id AND pocket_id IS NULL))`

### 2.2 Schema & Model Implementation Prerequisites for Phase 7B.4

Before Phase 7B.4 endpoint implementation begins, the following technical schema enhancements MUST be generated via Drizzle ORM migration tooling:

1. **Query Performance Indices**:
   - `transactions_owner_date_idx`: `ON transactions (user_id, occurred_on DESC, occurred_at_local_time DESC)` for paginated list queries.
   - `transactions_owner_pocket_idx`: `ON transactions (user_id, pocket_id) WHERE pocket_id IS NOT NULL`
   - `transactions_owner_transfer_pockets_idx`: `ON transactions (user_id, from_pocket_id, to_pocket_id) WHERE type = 'transfer'`
   - `transactions_owner_category_idx`: `ON transactions (user_id, category_id) WHERE category_id IS NOT NULL`
   - `transactions_owner_state_idx`: `ON transactions (user_id, deleted_at, archived_at)`

2. **Domain String Enum Canonical Values**:
   - `transferType` allowed values (derived from `frontend/src/types/transaction.ts` and DEC-023): `'normal'`, `'tarik-tunai'`, `'top-up-nfc'`, `'reimbursement'`, `'saving-allocation'`, `'budget-reallocation'`.
   - `incomeSource` allowed values (derived from `frontend/src/types/transaction.ts`): `'gaji'`, `'bonus'`, `'cashback'`, `'reimbursement'`, `'other'`.

3. **Historical Allocation Preservation & Automatic Record Creation**:
   - Per [BACKEND_ARCHITECTURE_DECISION_PACK.md](BACKEND_ARCHITECTURE_DECISION_PACK.md) Section 2 & 4, backend records preserve per-period allocation records in `pocket_budget_allocations` for each budget period. Current allocation is never used as a historical snapshot.
   - **Auto-Creation of Budget Period**: If no `budget_periods` record exists for the budget period containing `occurredOn` (based on fixed 26th–25th period rules), the backend MUST atomically insert the `budget_periods` row within the same SQL transaction before executing budget reallocation.
   - **Auto-Creation of Allocation Record**: When a `budget-reallocation` transfer occurs involving a participating pocket that has no `pocket_budget_allocations` record in the target period, the backend MUST atomically insert a `pocket_budget_allocations` record with initial `allocated_amount = 0` before applying the reallocation.

---

## 3. Authentication, Security & Normative Business Rules

### 3.1 Session Authentication & Cross-Owner Isolation

- **Session Cookie**: Every endpoint MUST require a valid owner session via the `sid` HttpOnly cookie. Unauthenticated requests are rejected with `401 Unauthorized` (`code: "UNAUTHENTICATED"`, `statusCode: 401`).
- **Owner Isolation & Privacy**: Direct resource access (`PATCH /v1/transactions/:id`, `POST /v1/transactions/:id/archive`, `POST /v1/transactions/:id/restore`, `DELETE /v1/transactions/:id`) for an entity belonging to another user MUST return `404 Not Found` (`code: "NOT_FOUND"`) indistinguishably from a non-existent UUID.
- **Foreign Key Validation**: Passing a `pocketId`, `fromPocketId`, `toPocketId`, or `categoryId` that belongs to another user returns `422 Unprocessable Entity` (`code: "INVALID_REFERENCE"`, `statusCode: 422`) without leaking target existence or ownership.

### 3.2 CSRF Protection Requirements

- All state-changing HTTP requests (`POST`, `PATCH`, `DELETE`) MUST require and validate the `X-CSRF-Token` header against the active session's CSRF token hash. Missing, invalid, or mismatched headers return `403 Forbidden` (`code: "INVALID_CSRF_TOKEN"`, `statusCode: 403`).
- Read-only requests (`GET`) DO NOT require the `X-CSRF-Token` header.

### 3.3 Money, Integer Rupiah & Derived Balance Protection

- All financial values (`amount`) MUST be positive integers representing exact Indonesian Rupiah (Rp). Floating-point numbers, negative amounts, and zero amounts are strictly forbidden (`amount > 0`). Minimum value is `1`; maximum safe integer is `9007199254740991` (2^53 - 1).
- **Negative Balance Rejection (DEC-030)**: Expenses and transfer source deductions MUST be rejected with `422 Unprocessable Entity` (`code: "INSUFFICIENT_FUNDS"`, `statusCode: 422`) if the derived balance of the source payment pocket (`pocketId` or `fromPocketId`) would drop below zero after deduction. Negative balances and overdrafts are strictly forbidden.

### 3.4 Jakarta Local Date/Time vs UTC Audit Timestamps

- **Business Calendar Date (`occurredOn`)**: Stored as `DATE` (`YYYY-MM-DD`) in `Asia/Jakarta` local timezone (UTC+7).
- **Business Calendar Time (`occurredAtLocalTime`)**: Stored as `TIME` (`HH:mm:ss` or `HH:mm`) in `Asia/Jakarta` local timezone.
- **Audit Timestamps**: `createdAt`, `updatedAt`, `archivedAt`, and `deletedAt` MUST be stored as UTC ISO 8601 extended strings (`YYYY-MM-DDTHH:mm:ss.sssZ`).

### 3.5 Normative Transaction Topologies & Server-Controlled Attribution Rules

#### Expense (`type: "expense"`)
- `pocketId` (UUID v4) is REQUIRED (represents the payment pocket). Must reference an active, non-archived pocket owned by the user.
- `fromPocketId` and `toPocketId` MUST be `null`.
- `transferType` and `incomeSource` MUST be `null`.
- `categoryId` is OPTIONAL. If provided, `categoryId` MUST reference an active, non-archived category belonging directly to `pocketId` (`category.pocketId === expense.pocketId`) (DEC-030). Mismatched or cross-pocket categories return `422 Unprocessable Entity` (`code: "INVALID_REFERENCE"`).
- **`budgetPocketId` (Server-Controlled Read-Only Snapshot)**: Per DEC-024 / DEC-030, `budgetPocketId` is strictly server-derived at creation time and MUST NOT be supplied in request bodies:
  - If `pocketId`'s `templateKey` is `'cash'` or `'nfc-card'`, the server sets `budgetPocketId` to its configured `budgetOwnerPocketId` (or falls back to `pocketId` if `budgetOwnerPocketId` is `null`).
  - For any other payment pocket, `budgetPocketId` is set equal to `pocketId`.
  - `budgetPocketId` is omitted from `POST`, `POST /batch`, and `PATCH` request bodies.

#### Income (`type: "income"`)
- `pocketId` (UUID v4) is REQUIRED (destination pocket). Must reference an active, non-archived pocket owned by the user.
- `fromPocketId`, `toPocketId`, `categoryId`, `budgetPocketId`, and `transferType` MUST be `null`.
- `incomeSource` is OPTIONAL string enum (`'gaji'`, `'bonus'`, `'cashback'`, `'reimbursement'`, `'other'`).

#### Standard Transfer (`type: "transfer"`, `transferType != "budget-reallocation"`)
- `fromPocketId` and `toPocketId` are REQUIRED and MUST be distinct (`fromPocketId != toPocketId`). Both must reference active, non-archived pockets owned by the user.
- `pocketId`, `categoryId`, `budgetPocketId`, and `incomeSource` MUST be `null`.
- `transferType` is REQUIRED string enum (`'normal'`, `'tarik-tunai'`, `'top-up-nfc'`, `'reimbursement'`, `'saving-allocation'`).
- Financial Effect: Moves `amount` balance from `fromPocketId` to `toPocketId`. Net cash flow across all pockets remains neutral (Rp0).

#### Budget Reallocation Transfer (`type: "transfer"`, `transferType: "budget-reallocation"`) (DEC-023 / DEC-030)
- `fromPocketId` and `toPocketId` are REQUIRED and MUST be distinct (`fromPocketId != toPocketId`).
- `pocketId`, `categoryId`, `budgetPocketId`, and `incomeSource` MUST be `null`.
- **Target Period Selection**: Reallocation applies to the `budget_periods` record containing `occurredOn` (based on fixed 26th–25th period rules). If no period row exists for `occurredOn`, the server creates it atomically.
- **Allocation Floor Rule (DEC-030)**: Reallocation MUST be rejected with `422 Unprocessable Entity` (`code: "INSUFFICIENT_ALLOCATION"`, `statusCode: 422`, message: `"Reallocated budget allocation cannot be less than expenses already incurred in this period"`) if the resulting allocation for `fromPocketId` in the target period would be less than the total recorded expenses incurred by `fromPocketId` in that period.
- **Financial Effect**: Moves `amount` balance from `fromPocketId` to `toPocketId` AND simultaneously decreases `fromPocketId`'s monthly budget allocation by `amount` and increases `toPocketId`'s monthly budget allocation by `amount` for the target period.
- Total Allocation Invariant: Total monthly budget allocation across all pockets remains constant.

### 3.6 Cash/NFC Pocket Budget Owner Snapshot Rule (DEC-024)

- `budgetPocketId` stored on an expense transaction is a server-derived snapshot created at transaction entry time.
- Clients CANNOT supply or override `budgetPocketId` in request payloads (`POST`, `POST /batch`, or `PATCH`).
- Subsequent changes to Cash or NFC Card budget owner configuration on the Pocket Detail page DO NOT retroactively alter stored `budgetPocketId` values of historical transactions.
- Editing an existing transaction (`PATCH /v1/transactions/:id`) preserves its stored `budgetPocketId` snapshot unless the user explicitly changes `pocketId`, in which case the server recalculates `budgetPocketId` based on the new payment pocket's budget owner configuration.

### 3.7 Derived Balances & Historical Fact Preservation

- **Historical Allocations Preserved**: Per [BACKEND_ARCHITECTURE_DECISION_PACK.md](BACKEND_ARCHITECTURE_DECISION_PACK.md), per-period allocation records are preserved in `pocket_budget_allocations` for each budget period.
- **Balance Source of Truth**: Pocket balances are derived dynamically on demand from opening balance plus active transaction effects:
  $$\text{Balance} = \text{OpeningBalance} + \sum \text{Income} - \sum \text{Expense} - \sum \text{TransferFrom} + \sum \text{TransferTo}$$
  There are no historical balance snapshot tables.
- **Archive Effect**: Archiving a transaction (`archivedAt != null`) immediately removes its financial impact from active derived balances. Restoring (`archivedAt == null`) re-applies its financial impact.
- **Delete Tombstone Effect**: Soft-deleting a transaction (`deletedAt != null`) removes its financial impact from active derived balances, lists, search, and reports. A tombstone is retained for 30 days before automated background purge (DEC-027 / DEC-030). Permanent delete requires clear client UI confirmation and request body `confirmPermanentDelete: true` (DEC-022 / DEC-030).

### 3.8 Machine-Readable Error Envelope (`backend/src/lib/errors.ts`)

All error responses MUST strictly conform to the canonical error envelope:

```json
{
  "error": {
    "code": "TYPED_ERROR_CODE",
    "message": "Human-readable explanation",
    "statusCode": 400
  }
}
```

#### Typed Error Code Reference Table

| HTTP Status | Error Code | Trigger Condition |
|---|---|---|
| `400 Bad Request` | `INVALID_INPUT` | Body/query parsing error, invalid field types, constraint violations, unknown properties (`additionalProperties: false`), invalid UUID v4 formats, PATCH body without mutable fields, or `DELETE` with missing/false `confirmPermanentDelete`. |
| `401 Unauthorized` | `UNAUTHENTICATED` | Session cookie `sid` missing, expired, revoked, or non-existent in database. |
| `403 Forbidden` | `INVALID_CSRF_TOKEN` | `X-CSRF-Token` header missing, empty, or mismatched against active session hash. |
| `404 Not Found` | `NOT_FOUND` | Requested transaction UUID does not exist, belongs to another user, or has been soft-deleted (`deletedAt != null`). No ownership leakage permitted. |
| `409 Conflict` | `IDEMPOTENCY_CONFLICT` | Top-level or item-level `clientMutationId` reused with a different request payload, HTTP method, or route path. |
| `409 Conflict` | `REVISION_CONFLICT` | `PATCH`, archive, restore, or delete request `expectedRevision` does not match current stored entity `revision`. |
| `422 Unprocessable Entity` | `INVALID_REFERENCE` | Foreign key reference error: cross-owner pocket/category, category not belonging to payment pocket (`category.pocketId !== expense.pocketId`), archived/inactive pocket/category, self-referencing transfer (`fromPocketId == toPocketId`), or topology mismatch. Target entity details are NEVER exposed. |
| `422 Unprocessable Entity` | `INSUFFICIENT_FUNDS` | Expense or transfer attempt that would result in a negative derived balance for payment/source pocket (`derivedBalance < 0`). |
| `422 Unprocessable Entity` | `INSUFFICIENT_ALLOCATION` | `budget-reallocation` transfer attempt that would result in revised allocation for `fromPocketId` being less than recorded expenses in the target period. |
| `500 Internal Server Error` | `INTERNAL_SERVER_ERROR` | Unhandled database or system exception. Stack traces suppressed in production. |

---

## 4. Idempotency, Concurrency & Revision Control

### 4.1 Single Mutation Idempotency (`clientMutationId`)

Every single mutating request (`POST /v1/transactions`, `PATCH /v1/transactions/:id`, `POST /v1/transactions/:id/archive`, `POST /v1/transactions/:id/restore`, `DELETE /v1/transactions/:id`) MUST require a valid RFC 4122 v4 UUID `clientMutationId`.

- Domain logic and `idempotency_records` insertion execute within a SINGLE SQL transaction.
- Request Hash: SHA-256 over `HTTP_METHOD + "|" + CANONICAL_ROUTE_PATH + "|" + NORMALIZED_JSON_BODY`.
- If a duplicate `clientMutationId` is submitted with a matching request hash, the server replays the stored response (`200 OK` or `201 Created`).
- If request hash differs, the server returns `409 Conflict` (`code: "IDEMPOTENCY_CONFLICT"`).

### 4.2 Multi-Entry Batch Idempotency (`POST /v1/transactions/batch`)

Multi-entry expense creation (`POST /v1/transactions/batch`) uses a dual-level idempotency design:

1. **Top-Level Batch `clientMutationId`**: Required at root of request body to ensure the overall batch operation is idempotent.
2. **Per-Item `clientMutationId`**: Each expense entry in the `items` array MUST include its own unique RFC 4122 v4 UUID `clientMutationId`.
3. **Atomic Execution & Replay**: The entire batch operation and all item idempotency records are committed within a SINGLE SQL transaction. Retrying the batch with identical payload replays the stored `201 Created` array response. Reusing any `clientMutationId` with a mismatched payload returns `409 Conflict` (`code: "IDEMPOTENCY_CONFLICT"`).

### 4.3 Optimistic Revision Control (`expectedRevision`)

All updates (`PATCH`, archive, restore, delete) MUST include `expectedRevision` (integer >= 1).

1. Execution locks the entity row: `SELECT id, revision, archived_at, deleted_at FROM transactions WHERE id = $id AND user_id = $userId FOR UPDATE;`.
2. If row does not exist or `deleted_at IS NOT NULL`: return `404 Not Found` (`code: "NOT_FOUND"`).
3. If `revision != expectedRevision`: return `409 Conflict` (`code: "REVISION_CONFLICT"`).
4. If valid, update state, increment `revision = revision + 1`, update `updated_at = NOW()`, store idempotency record, and commit transaction.
5. **No-Op Policy for PATCH (DEC-030)**: If a `PATCH /v1/transactions/:id` request supplies field values identical to stored state, the backend returns `200 OK` with the current entity, and stored `revision` remains **unchanged**.

---

## 5. Resolved Product Owner Decision Log (DEC-030 Summary)

Following Product Owner audit, all transaction management choices have been finalized and accepted in [DEC-030](../decisions/DECISION_LOG.md#dec-030---transaction-api-contract-decisions-finalization):

1. **DEC-030.1 Multi-Entry Batch Route**: Approved `POST /v1/transactions/batch` endpoint. Validates and writes all entries in one atomic SQL transaction; requires root `clientMutationId` and item-level `clientMutationId`s.
2. **DEC-030.2 Tombstone Purge & Audit Metadata**: Automated 30-day tombstone background worker purge with immutable audit log; no HTTP purge route.
3. **DEC-030.3 Negative Balance Rejection**: Rejects expenses and transfer source deductions with `422 INSUFFICIENT_FUNDS` if derived balance would drop below zero.
4. **DEC-030.4 Payment Pocket Category Scoping**: Expense categories MUST belong directly to `pocketId` (`category.pocketId === expense.pocketId`), else returns `422 INVALID_REFERENCE`.
5. **DEC-030.5 Budget Reallocation Floor Against Recorded Expenses**: Reallocation rejects with `422 INSUFFICIENT_ALLOCATION` if revised allocation < recorded expenses in target period.
6. **DEC-030.6 List Query Defaults**: Defaults fixed at `page = 1`, `limit = 50` (max 100), sort order `occurredOn DESC, occurredAtLocalTime DESC, createdAt DESC`, text search `search` max 100 chars on `note`, `includeArchived` boolean string filter.
7. **DEC-030.7 Permanent Delete Body Confirmation**: `DELETE /v1/transactions/:id` requires request body `confirmPermanentDelete: true`.
8. **DEC-030.8 Foreign Reference Error Uniformity**: Invalid, cross-owner, or archived FK references return `422 INVALID_REFERENCE` without leaking metadata.
9. **DEC-030.9 Target Pocket Allocation Auto-Creation**: Reallocation automatically creates `pocket_budget_allocations` row (starting at Rp0) for target pocket if absent.
10. **DEC-030.10 No-Op PATCH Revision Preservation**: Identical field values on `PATCH` return `200 OK` with unchanged `revision`.
11. **DEC-030.11 Target Period Selection & Auto-Period Creation**: Reallocation applies to budget period containing `occurredOn` (26th–25th), auto-creating `budget_periods` row if absent.

---

## 6. Filtering, Sorting & Pagination Specifications

### 6.1 `GET /v1/transactions` Query Parameters

| Parameter | Type | Required | Default | Validation & Rules |
|---|---|---|---|---|
| `page` | integer | No | `1` | Minimum `1`. |
| `limit` | integer | No | `50` | Minimum `1`, maximum `100`. |
| `type` | string | No | `null` | Enum: `"expense"`, `"income"`, `"transfer"`. |
| `pocketId` | UUID v4 | No | `null` | Matches `pocket_id`, `from_pocket_id`, or `to_pocket_id`. |
| `categoryId` | UUID v4 | No | `null` | Matches `category_id`. |
| `startDate` | string | No | `null` | Format `YYYY-MM-DD`. Filters `occurred_on >= startDate`. |
| `endDate` | string | No | `null` | Format `YYYY-MM-DD`. Filters `occurred_on <= endDate`. |
| `search` | string | No | `null` | Max 100 chars. Case-insensitive ILIKE match against `note`. |
| `includeArchived` | string | No | `"false"` | Enum: `"true"`, `"false"`. Includes archived entities when `"true"`. |

Soft-deleted tombstones (`deletedAt != null`) are NEVER returned by list queries.

### 6.2 Sorting & Pagination Response Envelope

Sort order is deterministic: `occurred_on DESC`, `occurred_at_local_time DESC`, `created_at DESC`.

```json
{
  "transactions": [],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 120,
    "totalPages": 3,
    "hasMore": true
  }
}
```

---

## 7. Complete Formal JSON Schema Specifications & Exact Examples

*Preamble: The JSON schemas in this section are specified as OpenAPI 3.0 / JSON Schema Draft 2020-12 component definitions. Shared schema references are defined under `#/components/schemas/` within an OpenAPI document context.*

All object schemas enforce `additionalProperties: false`.

### 7.1 Entity & Path Component Schemas

#### `UUIDv4` Schema (`#/components/schemas/UUIDv4`)
```json
{
  "type": "string",
  "format": "uuid",
  "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"
}
```

#### `Transaction` Entity Schema (`#/components/schemas/Transaction`)
```json
{
  "type": "object",
  "required": [
    "id", "type", "amount", "pocketId", "fromPocketId", "toPocketId",
    "categoryId", "budgetPocketId", "transferType", "incomeSource",
    "occurredOn", "occurredAtLocalTime", "note", "isArchived",
    "archivedAt", "revision", "createdAt", "updatedAt"
  ],
  "additionalProperties": false,
  "properties": {
    "id": { "$ref": "#/components/schemas/UUIDv4" },
    "type": { "type": "string", "enum": ["expense", "income", "transfer"] },
    "amount": { "type": "integer", "minimum": 1, "maximum": 9007199254740991 },
    "pocketId": { "type": ["string", "null"], "format": "uuid" },
    "fromPocketId": { "type": ["string", "null"], "format": "uuid" },
    "toPocketId": { "type": ["string", "null"], "format": "uuid" },
    "categoryId": { "type": ["string", "null"], "format": "uuid" },
    "budgetPocketId": { "type": ["string", "null"], "format": "uuid" },
    "transferType": {
      "type": ["string", "null"],
      "enum": ["normal", "tarik-tunai", "top-up-nfc", "reimbursement", "saving-allocation", "budget-reallocation", null]
    },
    "incomeSource": {
      "type": ["string", "null"],
      "enum": ["gaji", "bonus", "cashback", "reimbursement", "other", null]
    },
    "occurredOn": { "type": "string", "format": "date" },
    "occurredAtLocalTime": { "type": "string", "pattern": "^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$" },
    "note": { "type": ["string", "null"], "maxLength": 500 },
    "isArchived": { "type": "boolean" },
    "archivedAt": { "type": ["string", "null"], "format": "date-time" },
    "revision": { "type": "integer", "minimum": 1, "maximum": 9007199254740991 },
    "createdAt": { "type": "string", "format": "date-time" },
    "updatedAt": { "type": "string", "format": "date-time" }
  }
}
```

#### `TransactionPathParams` Schema (`#/components/schemas/TransactionPathParams`) (`PATCH`, `POST /archive`, `POST /restore`, `DELETE`)
```json
{
  "type": "object",
  "required": ["id"],
  "additionalProperties": false,
  "properties": {
    "id": { "$ref": "#/components/schemas/UUIDv4" }
  }
}
```

---

### 7.2 Endpoint Schemas & Exact Examples

#### 7.2.1 `GET /v1/transactions`
- **Query Schema**:
```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "page": { "type": "integer", "minimum": 1, "default": 1 },
    "limit": { "type": "integer", "minimum": 1, "maximum": 100, "default": 50 },
    "type": { "type": "string", "enum": ["expense", "income", "transfer"] },
    "pocketId": { "$ref": "#/components/schemas/UUIDv4" },
    "categoryId": { "$ref": "#/components/schemas/UUIDv4" },
    "startDate": { "type": "string", "format": "date" },
    "endDate": { "type": "string", "format": "date" },
    "search": { "type": "string", "maxLength": 100 },
    "includeArchived": { "type": "string", "enum": ["true", "false"], "default": "false" }
  }
}
```
- **Response Schema (`200 OK`)**:
```json
{
  "type": "object",
  "required": ["transactions", "pagination"],
  "additionalProperties": false,
  "properties": {
    "transactions": {
      "type": "array",
      "items": { "$ref": "#/components/schemas/Transaction" }
    },
    "pagination": {
      "type": "object",
      "required": ["page", "limit", "total", "totalPages", "hasMore"],
      "additionalProperties": false,
      "properties": {
        "page": { "type": "integer" },
        "limit": { "type": "integer" },
        "total": { "type": "integer" },
        "totalPages": { "type": "integer" },
        "hasMore": { "type": "boolean" }
      }
    }
  }
}
```
- **Response `200 OK` Example**:
```json
{
  "transactions": [
    {
      "id": "11111111-2222-4333-8444-555555555555",
      "type": "expense",
      "amount": 45000,
      "pocketId": "a1b2c3d4-e5f6-4a5b-8c7d-9e8f7a6b5c4d",
      "fromPocketId": null,
      "toPocketId": null,
      "categoryId": "c1c2c3c4-c5c6-4c7c-8c9c-0c1c2c3c4c5c",
      "budgetPocketId": "a1b2c3d4-e5f6-4a5b-8c7d-9e8f7a6b5c4d",
      "transferType": null,
      "incomeSource": null,
      "occurredOn": "2026-08-24",
      "occurredAtLocalTime": "14:30:00",
      "note": "Makan siang Nasi Padang",
      "isArchived": false,
      "archivedAt": null,
      "revision": 1,
      "createdAt": "2026-08-24T07:30:00.000Z",
      "updatedAt": "2026-08-24T07:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "totalPages": 1,
    "hasMore": false
  }
}
```

---

#### 7.2.2 `POST /v1/transactions`
- **Request Body Schema** (*`budgetPocketId` is omitted because it is server-controlled per DEC-024*):
```json
{
  "type": "object",
  "required": ["clientMutationId", "type", "amount", "occurredOn", "occurredAtLocalTime"],
  "additionalProperties": false,
  "properties": {
    "clientMutationId": { "$ref": "#/components/schemas/UUIDv4" },
    "type": { "type": "string", "enum": ["expense", "income", "transfer"] },
    "amount": { "type": "integer", "minimum": 1, "maximum": 9007199254740991 },
    "pocketId": { "$ref": "#/components/schemas/UUIDv4" },
    "fromPocketId": { "$ref": "#/components/schemas/UUIDv4" },
    "toPocketId": { "$ref": "#/components/schemas/UUIDv4" },
    "categoryId": { "$ref": "#/components/schemas/UUIDv4" },
    "transferType": {
      "type": "string",
      "enum": ["normal", "tarik-tunai", "top-up-nfc", "reimbursement", "saving-allocation", "budget-reallocation"]
    },
    "incomeSource": {
      "type": "string",
      "enum": ["gaji", "bonus", "cashback", "reimbursement", "other"]
    },
    "occurredOn": { "type": "string", "format": "date" },
    "occurredAtLocalTime": { "type": "string", "pattern": "^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$" },
    "note": { "type": "string", "maxLength": 500 }
  }
}
```
- **Response Schema (`201 Created`)**:
```json
{
  "type": "object",
  "required": ["transaction"],
  "additionalProperties": false,
  "properties": {
    "transaction": { "$ref": "#/components/schemas/Transaction" }
  }
}
```
- **Request Body Example (Expense)**:
```json
{
  "clientMutationId": "98765432-10fe-4dcba-8901-abcdef123456",
  "type": "expense",
  "amount": 45000,
  "pocketId": "a1b2c3d4-e5f6-4a5b-8c7d-9e8f7a6b5c4d",
  "categoryId": "c1c2c3c4-c5c6-4c7c-8c9c-0c1c2c3c4c5c",
  "occurredOn": "2026-08-24",
  "occurredAtLocalTime": "14:30:00",
  "note": "Makan siang Nasi Padang"
}
```
- **Response `201 Created` Example**:
```json
{
  "transaction": {
    "id": "11111111-2222-4333-8444-555555555555",
    "type": "expense",
    "amount": 45000,
    "pocketId": "a1b2c3d4-e5f6-4a5b-8c7d-9e8f7a6b5c4d",
    "fromPocketId": null,
    "toPocketId": null,
    "categoryId": "c1c2c3c4-c5c6-4c7c-8c9c-0c1c2c3c4c5c",
    "budgetPocketId": "a1b2c3d4-e5f6-4a5b-8c7d-9e8f7a6b5c4d",
    "transferType": null,
    "incomeSource": null,
    "occurredOn": "2026-08-24",
    "occurredAtLocalTime": "14:30:00",
    "note": "Makan siang Nasi Padang",
    "isArchived": false,
    "archivedAt": null,
    "revision": 1,
    "createdAt": "2026-08-24T07:30:00.000Z",
    "updatedAt": "2026-08-24T07:30:00.000Z"
  }
}
```

---

#### 7.2.3 `POST /v1/transactions/batch`
- **Request Body Schema**:
```json
{
  "type": "object",
  "required": ["clientMutationId", "items"],
  "additionalProperties": false,
  "properties": {
    "clientMutationId": { "$ref": "#/components/schemas/UUIDv4" },
    "items": {
      "type": "array",
      "minItems": 1,
      "maxItems": 50,
      "items": {
        "type": "object",
        "required": ["clientMutationId", "type", "amount", "pocketId", "occurredOn", "occurredAtLocalTime"],
        "additionalProperties": false,
        "properties": {
          "clientMutationId": { "$ref": "#/components/schemas/UUIDv4" },
          "type": { "type": "string", "const": "expense" },
          "amount": { "type": "integer", "minimum": 1, "maximum": 9007199254740991 },
          "pocketId": { "$ref": "#/components/schemas/UUIDv4" },
          "categoryId": { "$ref": "#/components/schemas/UUIDv4" },
          "occurredOn": { "type": "string", "format": "date" },
          "occurredAtLocalTime": { "type": "string", "pattern": "^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$" },
          "note": { "type": "string", "maxLength": 500 }
        }
      }
    }
  }
}
```
- **Response Schema (`201 Created`)**:
```json
{
  "type": "object",
  "required": ["transactions"],
  "additionalProperties": false,
  "properties": {
    "transactions": {
      "type": "array",
      "items": { "$ref": "#/components/schemas/Transaction" }
    }
  }
}
```
- **Request Body Example**:
```json
{
  "clientMutationId": "batch-1111-2222-3333-444444444444",
  "items": [
    {
      "clientMutationId": "item-1111-2222-3333-444444444444",
      "type": "expense",
      "amount": 25000,
      "pocketId": "a1b2c3d4-e5f6-4a5b-8c7d-9e8f7a6b5c4d",
      "categoryId": "c1c2c3c4-c5c6-4c7c-8c9c-0c1c2c3c4c5c",
      "occurredOn": "2026-08-24",
      "occurredAtLocalTime": "08:15:00",
      "note": "Kopi Pagi"
    },
    {
      "clientMutationId": "item-5555-6666-7777-888888888888",
      "type": "expense",
      "amount": 45000,
      "pocketId": "a1b2c3d4-e5f6-4a5b-8c7d-9e8f7a6b5c4d",
      "categoryId": "c1c2c3c4-c5c6-4c7c-8c9c-0c1c2c3c4c5c",
      "occurredOn": "2026-08-24",
      "occurredAtLocalTime": "12:30:00",
      "note": "Makan Siang"
    }
  ]
}
```
- **Response `201 Created` Example**:
```json
{
  "transactions": [
    {
      "id": "txn-item-1111-2222-3333-444444444444",
      "type": "expense",
      "amount": 25000,
      "pocketId": "a1b2c3d4-e5f6-4a5b-8c7d-9e8f7a6b5c4d",
      "fromPocketId": null,
      "toPocketId": null,
      "categoryId": "c1c2c3c4-c5c6-4c7c-8c9c-0c1c2c3c4c5c",
      "budgetPocketId": "a1b2c3d4-e5f6-4a5b-8c7d-9e8f7a6b5c4d",
      "transferType": null,
      "incomeSource": null,
      "occurredOn": "2026-08-24",
      "occurredAtLocalTime": "08:15:00",
      "note": "Kopi Pagi",
      "isArchived": false,
      "archivedAt": null,
      "revision": 1,
      "createdAt": "2026-08-24T07:30:00.000Z",
      "updatedAt": "2026-08-24T07:30:00.000Z"
    },
    {
      "id": "txn-item-5555-6666-7777-888888888888",
      "type": "expense",
      "amount": 45000,
      "pocketId": "a1b2c3d4-e5f6-4a5b-8c7d-9e8f7a6b5c4d",
      "fromPocketId": null,
      "toPocketId": null,
      "categoryId": "c1c2c3c4-c5c6-4c7c-8c9c-0c1c2c3c4c5c",
      "budgetPocketId": "a1b2c3d4-e5f6-4a5b-8c7d-9e8f7a6b5c4d",
      "transferType": null,
      "incomeSource": null,
      "occurredOn": "2026-08-24",
      "occurredAtLocalTime": "12:30:00",
      "note": "Makan Siang",
      "isArchived": false,
      "archivedAt": null,
      "revision": 1,
      "createdAt": "2026-08-24T07:30:00.000Z",
      "updatedAt": "2026-08-24T07:30:00.000Z"
    }
  ]
}
```

---

#### 7.2.4 `PATCH /v1/transactions/:id`
- **Request Body Schema** (`minProperties: 3` enforces `clientMutationId` + `expectedRevision` + at least 1 mutable field; *`budgetPocketId` is omitted because it is server-controlled per DEC-024*):
```json
{
  "type": "object",
  "required": ["clientMutationId", "expectedRevision"],
  "minProperties": 3,
  "additionalProperties": false,
  "properties": {
    "clientMutationId": { "$ref": "#/components/schemas/UUIDv4" },
    "expectedRevision": { "type": "integer", "minimum": 1, "maximum": 9007199254740991 },
    "amount": { "type": "integer", "minimum": 1, "maximum": 9007199254740991 },
    "pocketId": { "$ref": "#/components/schemas/UUIDv4" },
    "fromPocketId": { "$ref": "#/components/schemas/UUIDv4" },
    "toPocketId": { "$ref": "#/components/schemas/UUIDv4" },
    "categoryId": { "$ref": "#/components/schemas/UUIDv4" },
    "transferType": {
      "type": "string",
      "enum": ["normal", "tarik-tunai", "top-up-nfc", "reimbursement", "saving-allocation", "budget-reallocation"]
    },
    "incomeSource": {
      "type": "string",
      "enum": ["gaji", "bonus", "cashback", "reimbursement", "other"]
    },
    "occurredOn": { "type": "string", "format": "date" },
    "occurredAtLocalTime": { "type": "string", "pattern": "^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$" },
    "note": { "type": ["string", "null"], "maxLength": 500 }
  }
}
```
- **Response Schema (`200 OK`)**:
```json
{
  "type": "object",
  "required": ["transaction"],
  "additionalProperties": false,
  "properties": {
    "transaction": { "$ref": "#/components/schemas/Transaction" }
  }
}
```
- **Request Body Example**:
```json
{
  "clientMutationId": "12345678-aaaa-4bbb-8ccc-ddddeeefffff",
  "expectedRevision": 1,
  "amount": 50000,
  "note": "Makan siang Nasi Padang Komplit"
}
```
- **Response `200 OK` Example**:
```json
{
  "transaction": {
    "id": "11111111-2222-4333-8444-555555555555",
    "type": "expense",
    "amount": 50000,
    "pocketId": "a1b2c3d4-e5f6-4a5b-8c7d-9e8f7a6b5c4d",
    "fromPocketId": null,
    "toPocketId": null,
    "categoryId": "c1c2c3c4-c5c6-4c7c-8c9c-0c1c2c3c4c5c",
    "budgetPocketId": "a1b2c3d4-e5f6-4a5b-8c7d-9e8f7a6b5c4d",
    "transferType": null,
    "incomeSource": null,
    "occurredOn": "2026-08-24",
    "occurredAtLocalTime": "14:30:00",
    "note": "Makan siang Nasi Padang Komplit",
    "isArchived": false,
    "archivedAt": null,
    "revision": 2,
    "createdAt": "2026-08-24T07:30:00.000Z",
    "updatedAt": "2026-08-24T08:00:00.000Z"
  }
}
```

---

#### 7.2.5 `POST /v1/transactions/:id/archive`
- **Request Body Schema**:
```json
{
  "type": "object",
  "required": ["clientMutationId", "expectedRevision"],
  "additionalProperties": false,
  "properties": {
    "clientMutationId": { "$ref": "#/components/schemas/UUIDv4" },
    "expectedRevision": { "type": "integer", "minimum": 1, "maximum": 9007199254740991 }
  }
}
```
- **Response Schema (`200 OK`)**:
```json
{
  "type": "object",
  "required": ["transaction"],
  "additionalProperties": false,
  "properties": {
    "transaction": { "$ref": "#/components/schemas/Transaction" }
  }
}
```
- **Request Body Example**:
```json
{
  "clientMutationId": "aaaa1111-bb22-4c33-8d44-eeee55556666",
  "expectedRevision": 2
}
```
- **Response `200 OK` Example**:
```json
{
  "transaction": {
    "id": "11111111-2222-4333-8444-555555555555",
    "type": "expense",
    "amount": 50000,
    "pocketId": "a1b2c3d4-e5f6-4a5b-8c7d-9e8f7a6b5c4d",
    "fromPocketId": null,
    "toPocketId": null,
    "categoryId": "c1c2c3c4-c5c6-4c7c-8c9c-0c1c2c3c4c5c",
    "budgetPocketId": "a1b2c3d4-e5f6-4a5b-8c7d-9e8f7a6b5c4d",
    "transferType": null,
    "incomeSource": null,
    "occurredOn": "2026-08-24",
    "occurredAtLocalTime": "14:30:00",
    "note": "Makan siang Nasi Padang Komplit",
    "isArchived": true,
    "archivedAt": "2026-08-24T08:15:00.000Z",
    "revision": 3,
    "createdAt": "2026-08-24T07:30:00.000Z",
    "updatedAt": "2026-08-24T08:15:00.000Z"
  }
}
```

---

#### 7.2.6 `POST /v1/transactions/:id/restore`
- **Request Body Schema**:
```json
{
  "type": "object",
  "required": ["clientMutationId", "expectedRevision"],
  "additionalProperties": false,
  "properties": {
    "clientMutationId": { "$ref": "#/components/schemas/UUIDv4" },
    "expectedRevision": { "type": "integer", "minimum": 1, "maximum": 9007199254740991 }
  }
}
```
- **Response Schema (`200 OK`)**:
```json
{
  "type": "object",
  "required": ["transaction"],
  "additionalProperties": false,
  "properties": {
    "transaction": { "$ref": "#/components/schemas/Transaction" }
  }
}
```
- **Request Body Example**:
```json
{
  "clientMutationId": "bbbb2222-cc33-4d44-8e55-ffff66667777",
  "expectedRevision": 3
}
```
- **Response `200 OK` Example**:
```json
{
  "transaction": {
    "id": "11111111-2222-4333-8444-555555555555",
    "type": "expense",
    "amount": 50000,
    "pocketId": "a1b2c3d4-e5f6-4a5b-8c7d-9e8f7a6b5c4d",
    "fromPocketId": null,
    "toPocketId": null,
    "categoryId": "c1c2c3c4-c5c6-4c7c-8c9c-0c1c2c3c4c5c",
    "budgetPocketId": "a1b2c3d4-e5f6-4a5b-8c7d-9e8f7a6b5c4d",
    "transferType": null,
    "incomeSource": null,
    "occurredOn": "2026-08-24",
    "occurredAtLocalTime": "14:30:00",
    "note": "Makan siang Nasi Padang Komplit",
    "isArchived": false,
    "archivedAt": null,
    "revision": 4,
    "createdAt": "2026-08-24T07:30:00.000Z",
    "updatedAt": "2026-08-24T08:30:00.000Z"
  }
}
```

---

#### 7.2.7 `DELETE /v1/transactions/:id`
- **Request Body Schema** (*`confirmPermanentDelete: true` is REQUIRED per DEC-022 / DEC-030*):
```json
{
  "type": "object",
  "required": ["clientMutationId", "expectedRevision", "confirmPermanentDelete"],
  "additionalProperties": false,
  "properties": {
    "clientMutationId": { "$ref": "#/components/schemas/UUIDv4" },
    "expectedRevision": { "type": "integer", "minimum": 1, "maximum": 9007199254740991 },
    "confirmPermanentDelete": { "type": "boolean", "const": true }
  }
}
```
- **Response Schema (`200 OK`)**:
```json
{
  "type": "object",
  "required": ["success", "deletedTransactionId", "deletedAt"],
  "additionalProperties": false,
  "properties": {
    "success": { "type": "boolean", "const": true },
    "deletedTransactionId": { "$ref": "#/components/schemas/UUIDv4" },
    "deletedAt": { "type": "string", "format": "date-time" }
  }
}
```
- **Request Body Example**:
```json
{
  "clientMutationId": "cccc3333-dd44-4e55-8f66-000077778888",
  "expectedRevision": 4,
  "confirmPermanentDelete": true
}
```
- **Response `200 OK` Example**:
```json
{
  "success": true,
  "deletedTransactionId": "11111111-2222-4333-8444-555555555555",
  "deletedAt": "2026-08-24T08:45:00.000Z"
}
```

---

## 8. Grouped Integration-Test Inventory

The test suite for Phase 7B.4 MUST implement the following 56 integration test cases across 12 logical groups:

### Group A: Authentication & Authorization
- **T-001**: Reject `GET /v1/transactions` without session cookie (`401 UNAUTHENTICATED`).
- **T-002**: Reject `POST /v1/transactions` without session cookie (`401 UNAUTHENTICATED`).
- **T-003**: Reject `POST /v1/transactions/batch` without session cookie (`401 UNAUTHENTICATED`).
- **T-004**: Reject `PATCH /v1/transactions/:id` without session cookie (`401 UNAUTHENTICATED`).
- **T-005**: Reject `POST /v1/transactions/:id/archive` without session cookie (`401 UNAUTHENTICATED`).
- **T-006**: Reject `POST /v1/transactions/:id/restore` without session cookie (`401 UNAUTHENTICATED`).
- **T-007**: Reject `DELETE /v1/transactions/:id` without session cookie (`401 UNAUTHENTICATED`).

### Group B: CSRF Protection
- **T-008**: Reject `POST /v1/transactions` with missing `X-CSRF-Token` header (`403 INVALID_CSRF_TOKEN`).
- **T-009**: Reject `POST /v1/transactions/batch` with missing `X-CSRF-Token` header (`403 INVALID_CSRF_TOKEN`).
- **T-010**: Reject `PATCH /v1/transactions/:id` with mismatched CSRF token (`403 INVALID_CSRF_TOKEN`).
- **T-011**: Reject `DELETE /v1/transactions/:id` with missing CSRF token (`403 INVALID_CSRF_TOKEN`).

### Group C: Validation & Input Handling
- **T-012**: Reject transaction with `amount = 0` or negative amount (`400 INVALID_INPUT`).
- **T-013**: Reject expense without `pocketId` (`400 INVALID_INPUT`).
- **T-014**: Reject expense with `fromPocketId` or `toPocketId` supplied (`400 INVALID_INPUT`).
- **T-015**: Reject transfer without `fromPocketId` or `toPocketId` (`400 INVALID_INPUT`).
- **T-016**: Reject transfer with `fromPocketId == toPocketId` (`422 INVALID_REFERENCE`).
- **T-017**: Reject invalid `occurredOn` date format (`400 INVALID_INPUT`).
- **T-018**: Reject invalid `occurredAtLocalTime` format (`400 INVALID_INPUT`).

### Group D: Multi-Entry Batch Creation (`POST /v1/transactions/batch`)
- **T-019**: Create multiple valid expense transactions in batch and verify all entries save and return `201 Created`.
- **T-020**: Replay batch response when `POST /v1/transactions/batch` is retried with identical root `clientMutationId`.
- **T-021**: Reject entire batch (`400 INVALID_INPUT` or `422 INVALID_REFERENCE`) if a single item in `items` array fails validation, verifying complete SQL rollback (0 items saved).
- **T-022**: Reject batch with `409 IDEMPOTENCY_CONFLICT` if any item `clientMutationId` is reused with different payload.

### Group E: Single Idempotency & Replays
- **T-023**: Replay stored `201 Created` response when `POST /v1/transactions` is retried with identical `clientMutationId`.
- **T-024**: Return `409 IDEMPOTENCY_CONFLICT` when single `clientMutationId` is reused with modified payload.
- **T-025**: Replay stored `200 OK` response for retried `PATCH` request.
- **T-026**: Replay stored `200 OK` response for retried `DELETE` request.

### Group F: Concurrency & Revisions
- **T-027**: Return `409 REVISION_CONFLICT` when `PATCH` specifies outdated `expectedRevision`.
- **T-028**: Increment `revision` by 1 on successful `PATCH` mutation.
- **T-029**: Return `200 OK` with unchanged `revision` when `PATCH` supplies identical values (DEC-030.10).
- **T-030**: Return `409 REVISION_CONFLICT` when `archive` specifies mismatched `expectedRevision`.

### Group G: Topology, Category Scoping & Derived Balance Constraints
- **T-031**: Create valid Expense transaction and verify derived balance reduction.
- **T-032**: Reject Expense transaction with `422 INSUFFICIENT_FUNDS` when payment pocket derived balance would become negative (`derivedBalance < 0`) (DEC-030.3).
- **T-033**: Create valid Income transaction and verify derived balance increase.
- **T-034**: Create valid Standard Transfer and verify source balance reduction and destination balance increase.
- **T-035**: Reject Standard Transfer with `422 INSUFFICIENT_FUNDS` when source pocket derived balance would become negative (DEC-030.3).
- **T-036**: Reject expense category reference when `category.pocketId !== expense.pocketId` (`422 INVALID_REFERENCE`) (DEC-030.4).
- **T-037**: Reject transaction referencing another owner's pocket or category (`422 INVALID_REFERENCE`) (DEC-030.8).
- **T-038**: Reject transaction referencing an archived pocket or category (`422 INVALID_REFERENCE`) (DEC-030.8).

### Group H: Cash/NFC Budget Owner Attribution Snapshot (DEC-024)
- **T-039**: Create Cash expense without `budgetPocketId` in payload and verify server automatically derives `budgetPocketId` from configured Food & Groceries budget owner.
- **T-040**: Create NFC Card expense without `budgetPocketId` in payload and verify server automatically derives `budgetPocketId` from configured Transportation budget owner.
- **T-041**: Verify updating Cash pocket's budget owner on Pocket Detail does NOT alter historical expense's stored `budgetPocketId` snapshot.
- **T-042**: Verify `PATCH` on expense preserves stored `budgetPocketId` snapshot when payment pocket `pocketId` remains unchanged.

### Group I: Budget Reallocation & Period Rules (DEC-023 / DEC-030)
- **T-043**: Execute `budget-reallocation` transfer and verify simultaneous balance move and budget allocation adjustment in target period containing `occurredOn` (DEC-030.11).
- **T-044**: Verify backend automatically creates `budget_periods` row and initial zero `pocket_budget_allocations` row if target period/pocket allocation row does not exist (DEC-030.9 / DEC-030.11).
- **T-045**: Verify total budget allocation across all pockets remains unchanged after reallocation.
- **T-046**: Reject `budget-reallocation` with `422 INSUFFICIENT_ALLOCATION` when revised allocation for `fromPocketId` would be less than total recorded expenses in target period (DEC-030.5).

### Group J: Archive & Restore Lifecycle
- **T-047**: Archive transaction and verify `archivedAt` is populated and financial effect is removed from derived balances.
- **T-048**: Verify archived transaction is excluded from `GET /v1/transactions` when `includeArchived=false`.
- **T-049**: Verify archived transaction is included in `GET /v1/transactions` when `includeArchived=true`.
- **T-050**: Restore transaction and verify `archivedAt` is set to `null` and financial effect is restored.

### Group K: Delete Tombstone Lifecycle (DEC-022 / DEC-027 / DEC-030)
- **T-051**: Reject `DELETE /v1/transactions/:id` with `400 INVALID_INPUT` when `confirmPermanentDelete` is missing or `false`.
- **T-052**: Soft-delete transaction via `DELETE /v1/transactions/:id` with `confirmPermanentDelete: true` and verify `deletedAt` is populated.
- **T-053**: Verify soft-deleted transaction is excluded from derived balances and `GET /v1/transactions` (even with `includeArchived=true`).
- **T-054**: Reject `PATCH`, `archive`, or `restore` on soft-deleted transaction (`404 NOT FOUND`).

### Group L: Filtering, Search & Owner Isolation
- **T-055**: Filter transactions by `type`, `pocketId`, `categoryId`, date range (`startDate`/`endDate`), and search string `note`.
- **T-056**: Verify `GET /v1/transactions` returns empty list for another user's isolated account.

---

## 9. Entry & Authorization Gate to Implementation

Implementation of Phase 7B.4 transaction backend endpoints (`/v1/transactions*`) CANNOT begin until all of the following conditions are met:

1. **Product Owner Review & Acceptance**: Formal Product Owner acceptance of this contract specification has been recorded in [DEC-030](../decisions/DECISION_LOG.md#dec-030---transaction-api-contract-decisions-finalization).
2. **Explicit Implementation Authorization**: The Product Owner MUST grant a separate, explicit authorization to start Phase 7B.4 backend endpoint implementation.
3. **Clean Working Tree & Verification Gate**: The working tree must be completely clean, and pre-implementation verification MUST pass cleanly.
