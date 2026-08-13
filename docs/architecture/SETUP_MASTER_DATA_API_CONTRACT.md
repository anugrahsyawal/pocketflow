# Setup & Master Data API Contract Specification

- **Status**: Product Owner Accepted (2026-08-13)
- **Date**: 2026-08-13
- **Approved Architecture Reference**: [BACKEND_ARCHITECTURE_DECISION_PACK.md](BACKEND_ARCHITECTURE_DECISION_PACK.md)
- **Implementation Role**: Antigravity (Backend Developer)
- **Review Role**: Codex (Technical Project Manager / Tech Lead)
- **Product Owner**: Kyune

---

## 1. Scope and Boundary Definition

### 1.1 In-Scope Endpoints for Phase 7B.3

Phase 7B.3 defines the setup initialization and master-data management endpoints for Pockets and Categories. The approved route inventory is strictly bounded to:

- `GET /v1/setup` — Check owner setup completion status.
- `PUT /v1/setup` — Execute one-time initial setup (master data initialization & initial budget period).
- `GET /v1/pockets` — List owner pockets (unpaginated, filterable by `includeArchived`).
- `GET /v1/pockets/:id` — Get pocket detail by UUID (supports active and archived entities).
- `PATCH /v1/pockets/:id` — Update pocket properties or archive/restore state.
- `GET /v1/categories` — List owner categories (unpaginated, filterable by `pocketId` and `includeArchived`).
- `POST /v1/categories` — Create a custom category within an active owner pocket.
- `PATCH /v1/categories/:id` — Update category properties or archive/restore state.

### 1.2 Explicit Out-of-Scope List

The following capabilities are explicitly forbidden from being implemented in Phase 7B.3:

- `POST /v1/pockets` — Pocket creation endpoint does NOT exist in the approved architecture (route is absent from approved route list; pocket creation remains Not Started).
- `GET /v1/categories/:id` — Single category detail GET route does NOT exist in approved route list; category lookups use `GET /v1/categories?pocketId=<UUID>`.
- `DELETE /v1/pockets/:id` or `DELETE /v1/categories/:id` — Hard delete endpoints do not exist; removal uses `PATCH` with `isArchived: true`.
- Current-period pocket budget allocation mutations — Current-period allocation on pockets is READ-ONLY in Phase 7B.3. Allocation modifications belong to dedicated budget period allocation routes reserved for later phases.
- Transaction endpoints (`/v1/transactions*`) — Reserved for Phase 7B.4.
- Report endpoints (`/v1/reports*`) — Reserved for Phase 7B.5.
- Client-side LocalStorage automatic import or synchronization queue — Reserved for later approved sync phase.
- Production deployment infrastructure, DNS, SSL setup, or remote sync workers.
- Frontend store or UI modifications.

---

## 2. Technical Prerequisites & Database Schema Additions

Phase 7B.3 implementation requires database schema additions. The next Drizzle migration MUST be generated via Drizzle ORM migration tooling without guessing or hardcoding migration numbers or filenames.

### 2.1 Required Database Schema Prerequisite Additions

1. **`users.setup_completed_at` Column**:
   - Schema: `setupCompletedAt: timestamp('setup_completed_at', { withTimezone: true })` (nullable).
   - Purpose: Durable timestamp populated when `PUT /v1/setup` executes successfully.
2. **`idempotency_records.expires_at` Nullability**:
   - Schema Change: Remove `.notNull()` constraint from `expires_at` column (`expiresAt: timestamp('expires_at', { withTimezone: true })`).
   - Purpose: Phase 7B.3 writes `NULL` into `expires_at` for indefinite replay retention. Idempotency lookups DO NOT filter by expiration date, and no cleanup/purge process is implemented until a formal Product Owner retention policy is approved. This is a technical schema prerequisite, not a new product retention decision.
3. **`pockets.template_key` Column & Partial Unique Index**:
   - Schema: `templateKey: text('template_key')` (nullable). Immutable and read-only via API endpoints.
   - Partial Unique Index: `CREATE UNIQUE INDEX pockets_owner_template_key_idx ON pockets (user_id, template_key) WHERE template_key IS NOT NULL;`.
   - Purpose: Stores stable server template role keys (`'food-groceries'`, `'cash'`, `'transportation'`, `'nfc-card'`, etc.) for setup pockets, while remaining `NULL` for future custom pockets. Ensures the backend can reliably identify Cash and NFC Card pockets to enforce DEC-024 budget owner rules after setup. Primary key remains a generated UUID v4 string.

*Integration Test Runner Toolchain Requirement*: The automated integration test runner MUST use the existing Node/TypeScript toolchain (`tsx` / `node:test`). Adding new npm dependencies is NOT authorized and requires separate approval.

---

## 3. Authentication, Security & Normative Business Rules

### 3.1 Session Authentication Requirements

Every route in this contract MUST require a valid owner session via the `sid` HttpOnly cookie.

- Unauthenticated requests MUST be rejected immediately with `401 Unauthorized` (`code: "UNAUTHENTICATED"`, `statusCode: 401`) before schema validation or business logic.

### 3.2 CSRF Protection Requirements

All mutating HTTP requests (`PUT`, `POST`, `PATCH`) MUST require and validate the `X-CSRF-Token` header.

- Mutating requests with missing, invalid, or mismatched CSRF tokens MUST be rejected with `403 Forbidden` (`code: "INVALID_CSRF_TOKEN"`, `statusCode: 403`).
- Read-only requests (`GET`) DO NOT require the `X-CSRF-Token` header.

### 3.3 Persisted Base Opening Balance & Derived Balance Rules

`openingBalance` is the persisted base; current/effective balance is derived later from openingBalance plus transaction effects and is neither stored nor returned by these Phase 7B.3 endpoints. PATCH openingBalance changes the base and future derived result; it does not create historical snapshots. No separate derived balance property is added to Phase 7B.3 Pocket response schemas.

### 3.4 Normative Master Data Business Rules

#### Input String Trimming & Non-Blank Rules
All string inputs for `name` and `emoji` MUST be trimmed of leading and trailing whitespace prior to persistence. Inputs MUST contain at least one non-whitespace code point, with maxima of 100 Unicode code points for `name` and 32 Unicode code points for `emoji`. Empty or whitespace-only strings trigger `400 Bad Request` (`code: "INVALID_INPUT"`).

#### List Filtering & Single Detail Lookup Rules
- `GET /v1/pockets` and `GET /v1/categories` exclude archived entities by default (`includeArchived=false`).
- Passing `includeArchived=true` on list endpoints returns both active and archived entities.
- `GET /v1/pockets/:id` single detail lookup can return an archived pocket entity by UUID for inspection or restoration.

#### Pocket Budget Owner & Attribution Fallback Rules
- `budgetOwnerPocketId` is mutable ONLY on source pockets whose immutable `templateKey` is `'cash'` or `'nfc-card'`. Attempts to set or modify `budgetOwnerPocketId` on any other pocket (e.g. `'food-groceries'`) return `422 Unprocessable Entity` (`code: "INVALID_REFERENCE"`, message: `"Budget owner mapping is permitted only for Cash and NFC Card pockets"`).
- A non-null mapping (`budgetOwnerPocketId: "<UUID>"`) may be set or changed ONLY when the resulting Cash or NFC Card source pocket is active (`isArchived: false`). The target MUST be a different, active, non-archived pocket owned by the same user.
- Setting `budgetOwnerPocketId: null` indicates that no explicit budget owner mapping is configured, and the accepted attribution fallback is the payment pocket itself. Clearing `budgetOwnerPocketId` to `null` is ALWAYS allowed for Cash and NFC Card pockets (whether active or archived) and requires no target lookup.
- Archiving a Cash or NFC Card pocket retains its current `budgetOwnerPocketId` mapping (whether non-null or `null`) in the database.
- Restoring a Cash or NFC Card pocket with a retained non-null `budgetOwnerPocketId` mapping whose target is invalid, inactive, or archived returns `422 Unprocessable Entity` (`code: "INVALID_REFERENCE"`), UNLESS the same atomic `PATCH` request supplies either a valid active replacement target OR `null` (which selects the payment pocket fallback). Restoring a Cash or NFC Card pocket with a retained `null` mapping succeeds using the payment pocket fallback (`200 OK`).

#### Pocket Archive & Restore Semantics
- Archiving a pocket (`PATCH /v1/pockets/:id` with `isArchived: true`) sets `isArchived: true` and `isActive: false`, preserving all historical transaction data. Restoring sets `isArchived: false` and `isActive: true`.
- Archiving an active budget-owner target pocket is rejected with `422 Unprocessable Entity` (`code: "INVALID_REFERENCE"`, message: `"Cannot archive pocket while it is configured as budget owner for active Cash or NFC Card pocket(s). Remap or archive dependent pocket(s) first."`) while active Cash or NFC Card pockets reference it as `budgetOwnerPocketId`.

#### Category Creation & Archive/Restore Semantics
- `POST /v1/categories` requires a same-owner, active (`isActive: true`), non-archived (`isArchived: false`) parent pocket. Invalid parent pocket references or cross-owner references return `422 Unprocessable Entity` (`code: "INVALID_REFERENCE"`) without leaking target ownership or entity state.
- Archiving a category (`PATCH /v1/categories/:id` with `isArchived: true`) sets `isArchived: true` and `isActive: false`, preserving history. Restoring sets `isArchived: false` and `isActive: true`.
- Restoring a category under an inactive or archived parent pocket is rejected with `422 Unprocessable Entity` (`code: "INVALID_REFERENCE"`, message: `"Cannot restore category under an archived or inactive pocket"`).

#### Owner Isolation & Privacy Rules
- Direct entity access (`GET /v1/pockets/:id`, `PATCH /v1/pockets/:id`, `PATCH /v1/categories/:id`) for an entity belonging to another user returns `404 Not Found` (`code: "NOT_FOUND"`) indistinguishably from a non-existent UUID.
- Foreign key and filter references to another user's entity (e.g., `pocketId` in `POST /v1/categories` or `GET /v1/categories?pocketId=<UUID>`, or `budgetOwnerPocketId` in `PATCH /v1/pockets/:id`) return `422 Unprocessable Entity` (`code: "INVALID_REFERENCE"`) for mutating endpoints or empty list `200 OK` (`{ "categories": [] }`) for list filters, without exposing target entity names or ownership status.

### 3.5 Exact Machine-Readable Error Envelope (`backend/src/lib/errors.ts`)

All error responses MUST conform strictly to `backend/src/lib/errors.ts`:

```json
{
  "error": {
    "code": "TYPED_ERROR_CODE",
    "message": "Human-readable explanation",
    "statusCode": 400
  }
}
```

- `code` (string): Required typed error code.
- `message` (string): Required human-readable message.
- `statusCode` (number): Required HTTP status code matching the response header.
- `details` (unknown): Optional. Omitted from JSON when undefined; present only when validation error details are supplied. Explicit `details: null` appears ONLY if the caller intentionally supplies null.

*Fastify Schema Validation Normalization Requirement*: Phase 7B.3 implementation MUST normalize Fastify default validation errors (`FST_ERR_VALIDATION`) using Fastify `setErrorHandler` to `code: "INVALID_INPUT"`, `statusCode: 400`, passing validation error details in `details`.

### 3.6 Typed Error Code Reference Table

| HTTP Status | Error Code | Trigger Condition |
|---|---|---|
| `400 Bad Request` | `INVALID_INPUT` | Body/query parsing error, invalid field types, constraint violations, unknown properties (`additionalProperties: false`), invalid UUID v4 formats, unknown query params, or PATCH body without mutable fields. |
| `401 Unauthorized` | `UNAUTHENTICATED` | Session cookie `sid` missing, expired, revoked, or non-existent in database. |
| `403 Forbidden` | `INVALID_CSRF_TOKEN` | `X-CSRF-Token` header missing, empty, or mismatched against active session hash. |
| `404 Not Found` | `NOT_FOUND` | Requested entity UUID does not exist or belongs to another user. No ownership leakage permitted. |
| `409 Conflict` | `SETUP_ALREADY_COMPLETED` | `PUT /v1/setup` invoked when `users.setup_completed_at` is populated and request is not an idempotent retry. |
| `409 Conflict` | `IDEMPOTENCY_CONFLICT` | `clientMutationId` reused with a different request payload, HTTP method, or route path. |
| `409 Conflict` | `REVISION_CONFLICT` | `PATCH` request `expectedRevision` does not match current stored entity `revision`. |
| `422 Unprocessable Entity` | `INVALID_REFERENCE` | Foreign key or domain reference error: cross-owner reference attempt, category creation/restore under archived/inactive pocket, non-Cash/NFC budget-owner source pocket, target pocket self-reference, target pocket archived/inactive, or missing companion template in setup. Target entity details are NEVER exposed in error messages. |
| `500 Internal Server Error` | `INTERNAL_SERVER_ERROR` | Unhandled database or system exception. Stack traces and connection strings MUST be suppressed in non-development environments. |

---

## 4. Setup Domain Specifications (`GET /v1/setup` & `PUT /v1/setup`)

### 4.1 Fixed Budget Period Calculation (26th – 25th)

- Budget period start/end dates are calculated using `Asia/Jakarta` (UTC+7) local calendar date:
  - If current local day of month >= 26: Period starts on 26th of current month and ends on 25th of next month (e.g. `2026-07-26` to `2026-08-25`).
  - If current local day of month <= 25: Period starts on 26th of previous month and ends on 25th of current month (e.g. `2026-06-26` to `2026-07-25`).
- Audit timestamps (`createdAt`, `updatedAt`, `setupCompletedAt`) remain UTC ISO 8601 extended strings.
- `PUT /v1/setup` MUST NEVER accept or expose a configurable start day (e.g. `budgetPeriodStartDay`). Requests containing `budgetPeriodStartDay` MUST be rejected with `400 Bad Request` (`INVALID_INPUT`).

### 4.2 Template Catalog Baseline & Default Categories (Exactly 44 Total)

The 12 server template keys and their exact defaults (matching `frontend/src/data/defaultPockets.ts` and `frontend/src/data/defaultCategories.ts`) are:

| Server Template Key | Pocket Name | Group | Spendable | Monthly Allocation | Opening Balance Rule | Companion Requirement | Category Count |
|---|---|---|---|---:|---|---|---:|
| `food-groceries` | Food & Groceries | `daily` | `true` | Rp1,300,000 | Equals allocation (Rp1,300,000) | None | 9 |
| `cash` | Cash | `daily` | `true` | `null` (0) | `cashOpeningBalance` (supplied) | `food-groceries` | 0 |
| `transportation` | Transportation | `daily` | `true` | Rp200,000 | Equals allocation (Rp200,000) | None | 6 |
| `nfc-card` | NFC Transportation Card | `daily` | `true` | `null` (0) | `nfcOpeningBalance` (supplied) | `transportation` | 0 |
| `personal-care` | Personal Care | `daily` | `true` | Rp133,500 | Equals allocation (Rp133,500) | None | 6 |
| `entertainment` | Entertainment | `daily` | `true` | Rp200,000 | Equals allocation (Rp200,000) | None | 6 |
| `housing-utilities` | Housing & Utilities | `bills` | `false` | Rp866,500 | Equals allocation (Rp866,500) | None | 6 |
| `sinking-fund` | Sinking Fund | `savings` | `false` | Rp500,000 | Equals allocation (Rp500,000) | None | 0 |
| `self-investment` | Self-Investment | `savings` | `false` | Rp250,000 | Equals allocation (Rp250,000) | None | 6 |
| `investments` | Investments | `savings` | `false` | Rp150,000 | Equals allocation (Rp150,000) | None | 5 |
| `emergency-buffer` | Emergency Buffer | `savings` | `false` | Rp200,000 | Equals allocation (Rp200,000) | None | 0 |
| `term-deposit` | Term Deposit | `savings` | `false` | Rp2,000,000 | Equals allocation (Rp2,000,000) | None | 0 |

#### Per-Selection Subset Behavior
- `PUT /v1/setup` accepts `selectedPocketKeys` (array of string enum, minItems 1, maxItems 12, unique items).
- Creating pockets, allocations, and categories applies ONLY to the selected subset.
- Full 12-pocket selection creates 12 pockets, 10 pocket budget allocations totaling Rp5,800,000, and exactly 44 default categories.
- `totalAllocatedAmount` in response summary is the sum of allocations for the selected subset.

#### Companion Pocket Dependency Validation Rules (DEC-024)
- If `'cash'` is in `selectedPocketKeys`, `'food-groceries'` MUST also be in `selectedPocketKeys`.
- If `'nfc-card'` is in `selectedPocketKeys`, `'transportation'` MUST also be in `selectedPocketKeys`.
- Missing companion pockets return `422 Unprocessable Entity` (`code: "INVALID_REFERENCE"`, message: `"Selected pocket 'cash' requires companion pocket 'food-groceries' to be selected"`). Pockets are never auto-added.

#### Conditional Opening Balance Parameters
- `cashOpeningBalance`: Required in request body IF AND ONLY IF `'cash'` is in `selectedPocketKeys`; MUST be omitted otherwise. When present, value is a non-null integer between 0 and `9007199254740991`.
- `nfcOpeningBalance`: Required in request body IF AND ONLY IF `'nfc-card'` is in `selectedPocketKeys`; MUST be omitted otherwise. When present, value is a non-null integer between 0 and `9007199254740991`.

#### Transient `templateKeyToIdMap` Response Helper
The setup response includes `templateKeyToIdMap` mapping selected template keys to newly generated pocket UUIDs. The property key set of `templateKeyToIdMap` MUST exactly equal `selectedPocketKeys` from the successful setup request (no missing or extra known keys). This is a transient response helper returned in the setup response envelope and is NOT stored as a column in the `pockets` table (the immutable template role key is stored in `pockets.template_key`).

### 4.3 Setup Transaction Concurrency & Post-Lock Precedence

`PUT /v1/setup` performs setup inside a single SQL transaction using row locking:

1. **Begin Transaction**.
2. **Pre-Lock Idempotency Lookup**: Query `idempotency_records` for `(user_id, client_mutation_id)`. If record exists: compare canonical request hash. If match, replay stored response; if mismatch, return `409 IDEMPOTENCY_CONFLICT`.
3. **Lock Owner User Row**: Execute `SELECT id, setup_completed_at FROM users WHERE id = authUser.id FOR UPDATE;`.
4. **Post-Lock Precedence Sequence**:
   - **Post-Lock Precedence Step A (Idempotency Re-check)**: Query `idempotency_records` for `(user_id, client_mutation_id)`. If record now exists (a winning concurrent transaction committed during lock wait), compare canonical request hash: if match, replay stored `200 OK` response; if mismatch, return `409 IDEMPOTENCY_CONFLICT`.
   - **Post-Lock Precedence Step B (Setup Completion Check)**: ONLY if no idempotency record exists for `clientMutationId`, check `users.setup_completed_at`. If `setup_completed_at IS NOT NULL`, return `409 Conflict` (`code: "SETUP_ALREADY_COMPLETED"`).
5. **Validate & Create Domain Entities**:
   - Validate companion dependencies and conditional opening balances. Generate entity UUIDs.
   - Insert selected pockets into `pockets` table (populating `template_key` for setup templates, setting `opening_balance` equal to `monthlyAllocation` for allocated templates or supplied `cashOpeningBalance`/`nfcOpeningBalance`).
   - Set foreign keys: Cash `budget_owner_pocket_id` -> Food & Groceries generated UUID; NFC Card `budget_owner_pocket_id` -> Transportation generated UUID.
   - Insert budget period record into `budget_periods`.
   - Insert allocation records into `pocket_budget_allocations` for selected allocated pockets.
   - Insert default categories (up to 44) into `categories`.
6. **Populate Durable Owner Setup Marker**:
   - Execute `UPDATE users SET setup_completed_at = NOW(), updated_at = NOW() WHERE id = authUser.id RETURNING setup_completed_at;`.
   - Capture the exact returned `setup_completed_at` timestamp value to use as `completedAt` in the response payload.
7. **Insert Idempotency Record**: Serialize versioned JSON replay envelope `{"version":1,"statusCode":200,"body":{...}}` using the exact `completedAt` timestamp, set `expires_at = NULL`, insert into `idempotency_records`.
8. **Commit Transaction**.

*Atomic Rollback Guarantee*: If any step fails, the entire transaction rolls back atomically (`users.setup_completed_at`, created pockets, allocations, categories, and idempotency record). Subsequent retries can safely re-attempt setup.

---

## 5. Mutation Idempotency & Concurrency Semantics

### 5.1 Generic Concurrent-Idempotency Algorithm (Domain Mutations)

For contracted domain mutations (`PUT /v1/setup`, `POST /v1/categories`, `PATCH /v1/pockets/:id`, `PATCH /v1/categories/:id`), `clientMutationId` is required. Auth endpoints (`/v1/auth/login`, `/v1/auth/logout`, etc.) are NOT required to use `clientMutationId`.

1. Domain mutation logic and `idempotency_records` insertion execute within a SINGLE SQL transaction.
2. Canonical request hash = SHA-256 over `HTTP_METHOD + "|" + CANONICAL_ROUTE_WITH_PARAMS + "|" + NORMALIZED_JSON_BODY`.
3. Serialized replay envelope stored in `idempotency_records.response_reference` (Schematic Illustration):
```text
{
  "version": 1,
  "statusCode": 200,
  "body": { ... }
}
```
4. If a losing concurrent transaction hits PostgreSQL `23505` unique constraint (`idempotency_records_user_mutation_unique`), it MUST fully roll back first. ONLY AFTER ROLLBACK may it re-query the winning record from `idempotency_records`:
   - Compare canonical request hash.
   - If hash matches: Replay stored status code (including `200 OK` or `201 Created`) and body.
   - If hash differs: Return `409 Conflict` (`code: "IDEMPOTENCY_CONFLICT"`).

### 5.2 Atomic Optimistic Concurrency Control (`PATCH`)

Mutating `PATCH` endpoints (`PATCH /v1/pockets/:id`, `PATCH /v1/categories/:id`) enforce optimistic revision control via `expectedRevision`:

1. Execution MUST begin a SQL transaction and acquire an owner-scoped row lock:
   ```sql
   SELECT id, revision, name, emoji, ... FROM pockets WHERE id = $id AND user_id = $userId FOR UPDATE;
   ```
2. If no row is returned: Return `404 Not Found` (`code: "NOT_FOUND"`). No ownership leakage occurs.
3. If row is returned, verify `revision == expectedRevision`:
   - If `revision != expectedRevision`: Return `409 Conflict` (`code: "REVISION_CONFLICT"`).
4. Evaluate supplied mutable fields against current stored values:
   - **No-Op Case (Identical Values Provided)**: If ALL supplied mutable fields match current stored values (no actual state change): Store idempotency record (if `clientMutationId` supplied) and return `200 OK` with current entity state. `revision` remains UNCHANGED.
   - **Mutation Case (Values Changed)**: Execute atomic update, increment `revision` by exactly 1 (`revision = revision + 1`), update `updated_at = NOW()`, store idempotency record, and commit transaction (`200 OK`).
5. **Empty Payload Behavior**: Request body with NO mutable fields provided (only `clientMutationId` and `expectedRevision`) returns `400 Bad Request` (`code: "INVALID_INPUT"`).

---

## 6. Complete Formal JSON Schema Specifications

This section defines the compact formal JSON schema specifications for all endpoints. For every object, `additionalProperties: false` is enforced.

All `format: "uuid"` properties in this contract strictly mean RFC 4122 v4 UUIDs matching the exact pattern `^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$`.

### 6.1 Common Schema Components

#### `UUIDv4` Schema
```json
{
  "type": "string",
  "format": "uuid",
  "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"
}
```

---

### 6.2 `GET /v1/setup`

#### Response Schema (`200 OK`): `SetupStatusResponse`
```json
{
  "type": "object",
  "required": ["isSetupCompleted", "completedAt"],
  "additionalProperties": false,
  "properties": {
    "isSetupCompleted": { "type": "boolean" },
    "completedAt": { "type": ["string", "null"], "format": "date-time" }
  }
}
```

---

### 6.3 `PUT /v1/setup`

#### Request Body Schema: `PutSetupRequest`
```json
{
  "type": "object",
  "required": ["clientMutationId", "selectedPocketKeys"],
  "additionalProperties": false,
  "properties": {
    "clientMutationId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"
    },
    "selectedPocketKeys": {
      "type": "array",
      "minItems": 1,
      "maxItems": 12,
      "uniqueItems": true,
      "items": {
        "type": "string",
        "enum": [
          "food-groceries", "cash", "transportation", "nfc-card",
          "personal-care", "entertainment", "housing-utilities",
          "sinking-fund", "self-investment", "investments",
          "emergency-buffer", "term-deposit"
        ]
      }
    },
    "cashOpeningBalance": { "type": "integer", "minimum": 0, "maximum": 9007199254740991 },
    "nfcOpeningBalance": { "type": "integer", "minimum": 0, "maximum": 9007199254740991 }
  },
  "allOf": [
    {
      "if": {
        "properties": {
          "selectedPocketKeys": { "contains": { "const": "cash" } }
        },
        "required": ["selectedPocketKeys"]
      },
      "then": {
        "required": ["cashOpeningBalance"]
      },
      "else": {
        "not": { "required": ["cashOpeningBalance"] }
      }
    },
    {
      "if": {
        "properties": {
          "selectedPocketKeys": { "contains": { "const": "nfc-card" } }
        },
        "required": ["selectedPocketKeys"]
      },
      "then": {
        "required": ["nfcOpeningBalance"]
      },
      "else": {
        "not": { "required": ["nfcOpeningBalance"] }
      }
    }
  ]
}
```

#### Response Schema (`200 OK`): `PutSetupResponse`
```json
{
  "type": "object",
  "required": ["isSetupCompleted", "completedAt", "summary"],
  "additionalProperties": false,
  "properties": {
    "isSetupCompleted": { "type": "boolean", "const": true },
    "completedAt": { "type": "string", "format": "date-time" },
    "summary": {
      "type": "object",
      "required": ["pocketsCreated", "categoriesCreated", "totalAllocatedAmount", "budgetPeriod", "templateKeyToIdMap"],
      "additionalProperties": false,
      "properties": {
        "pocketsCreated": { "type": "integer", "minimum": 1, "maximum": 12 },
        "categoriesCreated": { "type": "integer", "minimum": 0, "maximum": 44 },
        "totalAllocatedAmount": { "type": "integer", "minimum": 0, "maximum": 9007199254740991 },
        "budgetPeriod": {
          "type": "object",
          "required": ["id", "startDate", "endDate"],
          "additionalProperties": false,
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid",
              "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"
            },
            "startDate": { "type": "string", "format": "date" },
            "endDate": { "type": "string", "format": "date" }
          }
        },
        "templateKeyToIdMap": {
          "type": "object",
          "minProperties": 1,
          "maxProperties": 12,
          "additionalProperties": false,
          "properties": {
            "food-groceries": { "type": "string", "format": "uuid", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$" },
            "cash": { "type": "string", "format": "uuid", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$" },
            "transportation": { "type": "string", "format": "uuid", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$" },
            "nfc-card": { "type": "string", "format": "uuid", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$" },
            "personal-care": { "type": "string", "format": "uuid", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$" },
            "entertainment": { "type": "string", "format": "uuid", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$" },
            "housing-utilities": { "type": "string", "format": "uuid", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$" },
            "sinking-fund": { "type": "string", "format": "uuid", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$" },
            "self-investment": { "type": "string", "format": "uuid", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$" },
            "investments": { "type": "string", "format": "uuid", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$" },
            "emergency-buffer": { "type": "string", "format": "uuid", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$" },
            "term-deposit": { "type": "string", "format": "uuid", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$" }
          }
        }
      }
    }
  }
}
```

---

### 6.4 Entity Component Schemas (`Pocket` & `Category`)

#### `Pocket` Entity Schema
```json
{
  "type": "object",
  "required": [
    "id", "templateKey", "name", "emoji", "groupId", "isSpendable",
    "budgetOwnerPocketId", "isActive", "isArchived", "openingBalance",
    "currentPeriodAllocation", "revision", "createdAt", "updatedAt"
  ],
  "additionalProperties": false,
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"
    },
    "templateKey": {
      "type": ["string", "null"],
      "enum": [
        "food-groceries", "cash", "transportation", "nfc-card",
        "personal-care", "entertainment", "housing-utilities",
        "sinking-fund", "self-investment", "investments",
        "emergency-buffer", "term-deposit", null
      ]
    },
    "name": { "type": "string", "minLength": 1, "maxLength": 100, "pattern": "^(?!\\s*$).+" },
    "emoji": { "type": "string", "minLength": 1, "maxLength": 32, "pattern": "^(?!\\s*$).+" },
    "groupId": { "type": "string", "enum": ["daily", "bills", "savings"] },
    "isSpendable": { "type": "boolean" },
    "budgetOwnerPocketId": {
      "type": ["string", "null"],
      "format": "uuid",
      "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"
    },
    "isActive": { "type": "boolean" },
    "isArchived": { "type": "boolean" },
    "openingBalance": { "type": "integer", "minimum": 0, "maximum": 9007199254740991 },
    "currentPeriodAllocation": {
      "type": ["object", "null"],
      "required": ["periodId", "startDate", "endDate", "allocatedAmount", "revision"],
      "additionalProperties": false,
      "properties": {
        "periodId": {
          "type": "string",
          "format": "uuid",
          "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"
        },
        "startDate": { "type": "string", "format": "date" },
        "endDate": { "type": "string", "format": "date" },
        "allocatedAmount": { "type": "integer", "minimum": 0, "maximum": 9007199254740991 },
        "revision": { "type": "integer", "minimum": 1, "maximum": 9007199254740991 }
      }
    },
    "revision": { "type": "integer", "minimum": 1, "maximum": 9007199254740991 },
    "createdAt": { "type": "string", "format": "date-time" },
    "updatedAt": { "type": "string", "format": "date-time" }
  }
}
```

#### `Category` Entity Schema
```json
{
  "type": "object",
  "required": [
    "id", "pocketId", "name", "emoji", "isDefault", "isActive",
    "isArchived", "revision", "createdAt", "updatedAt"
  ],
  "additionalProperties": false,
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"
    },
    "pocketId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"
    },
    "name": { "type": "string", "minLength": 1, "maxLength": 100, "pattern": "^(?!\\s*$).+" },
    "emoji": { "type": "string", "minLength": 1, "maxLength": 32, "pattern": "^(?!\\s*$).+" },
    "isDefault": { "type": "boolean" },
    "isActive": { "type": "boolean" },
    "isArchived": { "type": "boolean" },
    "revision": { "type": "integer", "minimum": 1, "maximum": 9007199254740991 },
    "createdAt": { "type": "string", "format": "date-time" },
    "updatedAt": { "type": "string", "format": "date-time" }
  }
}
```

---

### 6.5 Pocket Endpoints Schemas

#### Path Schema: `PocketPathParams` (`GET /v1/pockets/:id`, `PATCH /v1/pockets/:id`)
```json
{
  "type": "object",
  "required": ["id"],
  "additionalProperties": false,
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"
    }
  }
}
```

#### `GET /v1/pockets` Query Schema
```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "includeArchived": { "type": "string", "enum": ["true", "false"], "default": "false" }
  }
}
```

#### `GET /v1/pockets` Response Schema (`200 OK`): `GetPocketsResponse`
```json
{
  "type": "object",
  "required": ["pockets"],
  "additionalProperties": false,
  "properties": {
    "pockets": {
      "type": "array",
      "items": { "$ref": "#/components/schemas/Pocket" }
    }
  }
}
```

#### `GET /v1/pockets/:id` Response Schema (`200 OK`): `GetPocketDetailResponse`
```json
{
  "type": "object",
  "required": ["pocket"],
  "additionalProperties": false,
  "properties": {
    "pocket": { "$ref": "#/components/schemas/Pocket" }
  }
}
```

#### `PATCH /v1/pockets/:id` Request Body Schema: `PatchPocketRequest`
- Path Schema: `PocketPathParams`
- Request Body Schema (`minProperties: 3` enforces `clientMutationId` + `expectedRevision` + at least 1 mutable field):
```json
{
  "type": "object",
  "required": ["clientMutationId", "expectedRevision"],
  "minProperties": 3,
  "additionalProperties": false,
  "properties": {
    "clientMutationId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"
    },
    "expectedRevision": { "type": "integer", "minimum": 1, "maximum": 9007199254740991 },
    "name": { "type": "string", "minLength": 1, "maxLength": 100, "pattern": "^(?!\\s*$).+" },
    "emoji": { "type": "string", "minLength": 1, "maxLength": 32, "pattern": "^(?!\\s*$).+" },
    "groupId": { "type": "string", "enum": ["daily", "bills", "savings"] },
    "isSpendable": { "type": "boolean" },
    "budgetOwnerPocketId": {
      "type": ["string", "null"],
      "format": "uuid",
      "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"
    },
    "isArchived": { "type": "boolean" },
    "openingBalance": { "type": "integer", "minimum": 0, "maximum": 9007199254740991 }
  }
}
```
*Rejected / Read-Only Properties*: Attempting to pass `id`, `templateKey`, `isActive`, `currentPeriodAllocation`, `revision`, `createdAt`, or `updatedAt` in `PatchPocketRequest` body is forbidden and rejected by `additionalProperties: false` (`400 Bad Request`, `INVALID_INPUT`).

#### `PATCH /v1/pockets/:id` Response Schema (`200 OK`): `PatchPocketResponse`
```json
{
  "type": "object",
  "required": ["pocket"],
  "additionalProperties": false,
  "properties": {
    "pocket": { "$ref": "#/components/schemas/Pocket" }
  }
}
```

---

### 6.6 Category Endpoints Schemas

#### Path Schema: `CategoryPathParams` (`PATCH /v1/categories/:id`)
```json
{
  "type": "object",
  "required": ["id"],
  "additionalProperties": false,
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"
    }
  }
}
```

#### `GET /v1/categories` Query Schema
```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "includeArchived": { "type": "string", "enum": ["true", "false"], "default": "false" },
    "pocketId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"
    }
  }
}
```

#### `GET /v1/categories` Response Schema (`200 OK`): `GetCategoriesResponse`
```json
{
  "type": "object",
  "required": ["categories"],
  "additionalProperties": false,
  "properties": {
    "categories": {
      "type": "array",
      "items": { "$ref": "#/components/schemas/Category" }
    }
  }
}
```

#### `POST /v1/categories` Request Body Schema: `PostCategoryRequest`
```json
{
  "type": "object",
  "required": ["clientMutationId", "pocketId", "name", "emoji"],
  "additionalProperties": false,
  "properties": {
    "clientMutationId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"
    },
    "pocketId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"
    },
    "name": { "type": "string", "minLength": 1, "maxLength": 100, "pattern": "^(?!\\s*$).+" },
    "emoji": { "type": "string", "minLength": 1, "maxLength": 32, "pattern": "^(?!\\s*$).+" }
  }
}
```

#### `POST /v1/categories` Response Schema (`201 Created`): `PostCategoryResponse`
```json
{
  "type": "object",
  "required": ["category"],
  "additionalProperties": false,
  "properties": {
    "category": { "$ref": "#/components/schemas/Category" }
  }
}
```

#### `PATCH /v1/categories/:id` Request Body Schema: `PatchCategoryRequest`
- Path Schema: `CategoryPathParams`
- Request Body Schema (`minProperties: 3` enforces `clientMutationId` + `expectedRevision` + at least 1 mutable field):
```json
{
  "type": "object",
  "required": ["clientMutationId", "expectedRevision"],
  "minProperties": 3,
  "additionalProperties": false,
  "properties": {
    "clientMutationId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"
    },
    "expectedRevision": { "type": "integer", "minimum": 1, "maximum": 9007199254740991 },
    "name": { "type": "string", "minLength": 1, "maxLength": 100, "pattern": "^(?!\\s*$).+" },
    "emoji": { "type": "string", "minLength": 1, "maxLength": 32, "pattern": "^(?!\\s*$).+" },
    "isArchived": { "type": "boolean" }
  }
}
```
*Rejected / Read-Only Properties*: Attempting to pass `id`, `pocketId`, `isDefault`, `isActive`, `revision`, `createdAt`, or `updatedAt` in `PatchCategoryRequest` body is forbidden and rejected by `additionalProperties: false` (`400 Bad Request`, `INVALID_INPUT`).

#### `PATCH /v1/categories/:id` Response Schema (`200 OK`): `PatchCategoryResponse`
```json
{
  "type": "object",
  "required": ["category"],
  "additionalProperties": false,
  "properties": {
    "category": { "$ref": "#/components/schemas/Category" }
  }
}
```

---

### 6.7 Error Envelope Schema

```json
{
  "type": "object",
  "required": ["error"],
  "additionalProperties": false,
  "properties": {
    "error": {
      "type": "object",
      "required": ["code", "message", "statusCode"],
      "additionalProperties": false,
      "properties": {
        "code": {
          "type": "string",
          "enum": [
            "INVALID_INPUT", "UNAUTHENTICATED", "INVALID_CSRF_TOKEN",
            "NOT_FOUND", "SETUP_ALREADY_COMPLETED", "IDEMPOTENCY_CONFLICT",
            "REVISION_CONFLICT", "INVALID_REFERENCE", "INTERNAL_SERVER_ERROR"
          ]
        },
        "message": { "type": "string" },
        "statusCode": {
          "type": "integer",
          "enum": [400, 401, 403, 404, 409, 422, 500]
        },
        "details": {}
      }
    }
  }
}
```

---

## 7. Complete Endpoint Specifications with Exact JSON Examples

### 7.1 `GET /v1/setup`

- Headers: Session cookie `sid`.
- Response `200 OK`:

```json
{
  "isSetupCompleted": false,
  "completedAt": null
}
```

---

### 7.2 `PUT /v1/setup`

- Headers: Session cookie `sid`, `X-CSRF-Token`, `Content-Type: application/json`.
- Request Body Schema:

```json
{
  "clientMutationId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "selectedPocketKeys": [
    "food-groceries", "cash", "transportation", "nfc-card",
    "personal-care", "entertainment", "housing-utilities",
    "sinking-fund", "self-investment", "investments",
    "emergency-buffer", "term-deposit"
  ],
  "cashOpeningBalance": 150000,
  "nfcOpeningBalance": 50000
}
```

- Response `200 OK`:

```json
{
  "isSetupCompleted": true,
  "completedAt": "2026-08-13T10:15:30.123Z",
  "summary": {
    "pocketsCreated": 12,
    "categoriesCreated": 44,
    "totalAllocatedAmount": 5800000,
    "budgetPeriod": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "startDate": "2026-07-26",
      "endDate": "2026-08-25"
    },
    "templateKeyToIdMap": {
      "food-groceries": "c56a4180-65aa-42ec-a945-5fd21dec0538",
      "cash": "e7b9a2b8-9351-4f8e-a2f0-1094892c9007",
      "transportation": "8b3a72df-50f7-4a0b-93e1-9556d1170d12",
      "nfc-card": "1f90d182-3d84-4b57-a9a7-24816c802e34",
      "personal-care": "4d9c7e2b-18f3-4a6c-9b0e-56123456789a",
      "entertainment": "6a8b9c0d-1e2f-4a3b-8c7d-9e0f1a2b3c4d",
      "housing-utilities": "7b8c9d0e-2f3a-4b5c-9d0e-1f2a3b4c5d6e",
      "sinking-fund": "8c9d0e1f-3a4b-4c6d-8e1f-2a3b4c5d6e7f",
      "self-investment": "9d0e1f2a-4b5c-4d7e-8f2a-3b4c5d6e7f8a",
      "investments": "0e1f2a3b-5c6d-4e8f-9a3b-4c5d6e7f8a9b",
      "emergency-buffer": "1f2a3b4c-6d7e-4f9a-8b4c-5d6e7f8a9b0c",
      "term-deposit": "2a3b4c5d-7e8f-4a0b-9c5d-6e7f8a9b0c1d"
    }
  }
}
```

---

### 7.3 `GET /v1/pockets`

- Headers: Session cookie `sid`.
- Query Params: `includeArchived` (`'true'` \| `'false'`, default `'false'`).
- Ordering: `created_at ASC, name ASC`.
- Response `200 OK`:

```json
{
  "pockets": [
    {
      "id": "c56a4180-65aa-42ec-a945-5fd21dec0538",
      "templateKey": "food-groceries",
      "name": "Food & Groceries",
      "emoji": "🍜",
      "groupId": "daily",
      "isSpendable": true,
      "budgetOwnerPocketId": null,
      "isActive": true,
      "isArchived": false,
      "openingBalance": 1300000,
      "currentPeriodAllocation": {
        "periodId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "startDate": "2026-07-26",
        "endDate": "2026-08-25",
        "allocatedAmount": 1300000,
        "revision": 1
      },
      "revision": 1,
      "createdAt": "2026-08-13T10:15:30.123Z",
      "updatedAt": "2026-08-13T10:15:30.123Z"
    },
    {
      "id": "e7b9a2b8-9351-4f8e-a2f0-1094892c9007",
      "templateKey": "cash",
      "name": "Cash",
      "emoji": "💵",
      "groupId": "daily",
      "isSpendable": true,
      "budgetOwnerPocketId": "c56a4180-65aa-42ec-a945-5fd21dec0538",
      "isActive": true,
      "isArchived": false,
      "openingBalance": 150000,
      "currentPeriodAllocation": null,
      "revision": 1,
      "createdAt": "2026-08-13T10:15:30.123Z",
      "updatedAt": "2026-08-13T10:15:30.123Z"
    }
  ]
}
```

---

### 7.4 `GET /v1/pockets/:id`

- Headers: Session cookie `sid`. Path Param: `id` (UUID v4 format).
- Response `200 OK` (Supports looking up active or archived entity by UUID):

```json
{
  "pocket": {
    "id": "c56a4180-65aa-42ec-a945-5fd21dec0538",
    "templateKey": "food-groceries",
    "name": "Food & Groceries",
    "emoji": "🍜",
    "groupId": "daily",
    "isSpendable": true,
    "budgetOwnerPocketId": null,
    "isActive": true,
    "isArchived": false,
    "openingBalance": 1300000,
    "currentPeriodAllocation": {
      "periodId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "startDate": "2026-07-26",
      "endDate": "2026-08-25",
      "allocatedAmount": 1300000,
      "revision": 1
    },
    "revision": 1,
    "createdAt": "2026-08-13T10:15:30.123Z",
    "updatedAt": "2026-08-13T10:15:30.123Z"
  }
}
```

---

### 7.5 `PATCH /v1/pockets/:id`

- Headers: Session cookie `sid`, `X-CSRF-Token`, `Content-Type: application/json`. Path Param: `id` (UUID v4 format).
- Request Body Schema:

```json
{
  "clientMutationId": "4a8f9c12-3b56-4d78-9e01-2f3a4b5c6d7e",
  "expectedRevision": 1,
  "budgetOwnerPocketId": "c56a4180-65aa-42ec-a945-5fd21dec0538"
}
```

- Response `200 OK`:

```json
{
  "pocket": {
    "id": "e7b9a2b8-9351-4f8e-a2f0-1094892c9007",
    "templateKey": "cash",
    "name": "Cash",
    "emoji": "💵",
    "groupId": "daily",
    "isSpendable": true,
    "budgetOwnerPocketId": "c56a4180-65aa-42ec-a945-5fd21dec0538",
    "isActive": true,
    "isArchived": false,
    "openingBalance": 150000,
    "currentPeriodAllocation": null,
    "revision": 2,
    "createdAt": "2026-08-13T10:15:30.123Z",
    "updatedAt": "2026-08-13T11:20:00.000Z"
  }
}
```

---

### 7.6 `GET /v1/categories`

- Headers: Session cookie `sid`.
- Query Params: `includeArchived` (`'true'` \| `'false'`), `pocketId` (UUID v4 string).
- Ordering: `pocket_id ASC, is_default DESC, created_at ASC, name ASC`.
- Response `200 OK`:

```json
{
  "categories": [
    {
      "id": "d9b2b71b-3129-4e4a-9588-34827d04f7b4",
      "pocketId": "c56a4180-65aa-42ec-a945-5fd21dec0538",
      "name": "Sarapan",
      "emoji": "🌅",
      "isDefault": true,
      "isActive": true,
      "isArchived": false,
      "revision": 1,
      "createdAt": "2026-08-13T10:15:30.123Z",
      "updatedAt": "2026-08-13T10:15:30.123Z"
    }
  ]
}
```

---

### 7.7 `POST /v1/categories`

- Headers: Session cookie `sid`, `X-CSRF-Token`, `Content-Type: application/json`.
- Request Body Schema:

```json
{
  "clientMutationId": "8c9d0e1f-2a3b-4c5d-9e0f-1a2b3c4d5e6f",
  "pocketId": "c56a4180-65aa-42ec-a945-5fd21dec0538",
  "name": "Kopi Malam",
  "emoji": "☕"
}
```

- Response `201 Created`:

```json
{
  "category": {
    "id": "6f9c8d10-8671-42e3-b908-567e7c81a293",
    "pocketId": "c56a4180-65aa-42ec-a945-5fd21dec0538",
    "name": "Kopi Malam",
    "emoji": "☕",
    "isDefault": false,
    "isActive": true,
    "isArchived": false,
    "revision": 1,
    "createdAt": "2026-08-13T11:45:00.000Z",
    "updatedAt": "2026-08-13T11:45:00.000Z"
  }
}
```

---

### 7.8 `PATCH /v1/categories/:id`

- Headers: Session cookie `sid`, `X-CSRF-Token`, `Content-Type: application/json`. Path Param: `id` (UUID v4 format).
- Request Body Schema:

```json
{
  "clientMutationId": "7b8a9c0d-1e2f-4a5b-9c8d-3e4f5a6b7c8d",
  "expectedRevision": 1,
  "isArchived": true
}
```

- Response `200 OK`:

```json
{
  "category": {
    "id": "6f9c8d10-8671-42e3-b908-567e7c81a293",
    "pocketId": "c56a4180-65aa-42ec-a945-5fd21dec0538",
    "name": "Kopi Malam",
    "emoji": "☕",
    "isDefault": false,
    "isActive": false,
    "isArchived": true,
    "revision": 2,
    "createdAt": "2026-08-13T11:45:00.000Z",
    "updatedAt": "2026-08-13T12:00:00.000Z"
  }
}
```

---

### 7.9 Error Response Examples (Omitted vs Present `details`)

#### Standard Error Envelope (Omitted `details`):
```json
{
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Authentication session cookie is missing or invalid.",
    "statusCode": 401
  }
}
```

#### Validation Error Envelope (Present `details`):
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Body validation failed: selectedPocketKeys must contain at least 1 item.",
    "statusCode": 400,
    "details": [
      {
        "field": "selectedPocketKeys",
        "message": "must NOT have fewer than 1 items"
      }
    ]
  }
}
```

---

## 8. Grouped Integration Test Inventory

The automated integration test suite MUST be organized into maintainable test groups without claiming an arbitrary total test count. Every scenario below MUST be executed as a distinct, unambiguous test case:

### Group 1: Authentication Security Checks
- `AUTH-01`: Unauthenticated `GET /v1/setup` returns `401 Unauthorized` (`UNAUTHENTICATED`).
- `AUTH-02`: Unauthenticated `PUT /v1/setup` returns `401 Unauthorized` (`UNAUTHENTICATED`).
- `AUTH-03`: Unauthenticated `GET /v1/pockets` returns `401 Unauthorized` (`UNAUTHENTICATED`).
- `AUTH-04`: Unauthenticated `GET /v1/pockets/:id` returns `401 Unauthorized` (`UNAUTHENTICATED`).
- `AUTH-05`: Unauthenticated `PATCH /v1/pockets/:id` returns `401 Unauthorized` (`UNAUTHENTICATED`).
- `AUTH-06`: Unauthenticated `GET /v1/categories` returns `401 Unauthorized` (`UNAUTHENTICATED`).
- `AUTH-07`: Unauthenticated `POST /v1/categories` returns `401 Unauthorized` (`UNAUTHENTICATED`).
- `AUTH-08`: Unauthenticated `PATCH /v1/categories/:id` returns `401 Unauthorized` (`UNAUTHENTICATED`).

### Group 2: CSRF Security Checks
- `CSRF-01`: `PUT /v1/setup` with missing `X-CSRF-Token` header returns `403 Forbidden` (`INVALID_CSRF_TOKEN`).
- `CSRF-02`: `PUT /v1/setup` with invalid `X-CSRF-Token` header returns `403 Forbidden` (`INVALID_CSRF_TOKEN`).
- `CSRF-03`: `POST /v1/categories` with missing `X-CSRF-Token` header returns `403 Forbidden` (`INVALID_CSRF_TOKEN`).
- `CSRF-04`: `POST /v1/categories` with invalid `X-CSRF-Token` header returns `403 Forbidden` (`INVALID_CSRF_TOKEN`).
- `CSRF-05`: `PATCH /v1/pockets/:id` with missing `X-CSRF-Token` header returns `403 Forbidden` (`INVALID_CSRF_TOKEN`).
- `CSRF-06`: `PATCH /v1/pockets/:id` with invalid `X-CSRF-Token` header returns `403 Forbidden` (`INVALID_CSRF_TOKEN`).
- `CSRF-07`: `PATCH /v1/categories/:id` with missing `X-CSRF-Token` header returns `403 Forbidden` (`INVALID_CSRF_TOKEN`).
- `CSRF-08`: `PATCH /v1/categories/:id` with invalid `X-CSRF-Token` header returns `403 Forbidden` (`INVALID_CSRF_TOKEN`).

### Group 3: Input Validation, Parameter & Path Parsing
- `VAL-01`: Omitted `includeArchived` query parameter defaults to `false` (returns active entities only).
- `VAL-02`: Explicit `includeArchived=true` parses valid boolean string correctly and returns active plus archived entities.
- `VAL-03`: Unknown query parameter `GET /v1/pockets?unknownParam=123` returns `400 Bad Request` (`INVALID_INPUT`).
- `VAL-04`: Unknown query parameter `GET /v1/categories?foo=bar` returns `400 Bad Request` (`INVALID_INPUT`).
- `VAL-05`: Unknown body property in `PUT /v1/setup` (`additionalProperties: false`) returns `400 Bad Request` (`INVALID_INPUT`).
- `VAL-06`: Unknown body property in `POST /v1/categories` returns `400 Bad Request` (`INVALID_INPUT`).
- `VAL-07`: Unknown body property in `PATCH /v1/pockets/:id` returns `400 Bad Request` (`INVALID_INPUT`).
- `VAL-08`: Unknown body property in `PATCH /v1/categories/:id` returns `400 Bad Request` (`INVALID_INPUT`).
- `VAL-09`: Invalid UUID format path param `GET /v1/pockets/invalid-uuid` returns `400 Bad Request` (`INVALID_INPUT`).
- `VAL-10`: Invalid UUID format path param `PATCH /v1/pockets/not-a-uuid` returns `400 Bad Request` (`INVALID_INPUT`).
- `VAL-11`: Invalid UUID format path param `PATCH /v1/categories/12345` returns `400 Bad Request` (`INVALID_INPUT`).
- `VAL-12`: Syntactically valid non-v4 UUID string (such as a version-1 or version-5 UUID string) in path parameter or `clientMutationId` returns `400 Bad Request` (`INVALID_INPUT`).
- `VAL-13`: Empty or whitespace-only string input for `name` or `emoji` returns `400 Bad Request` (`INVALID_INPUT`).

### Group 4: Setup Domain, Marker & Budget Period Boundaries
- `SETUP-01`: Period calculation: local `Asia/Jakarta` date <= 25th (July 25) calculates start `2026-06-26` and end `2026-07-25`.
- `SETUP-02`: Period calculation: local `Asia/Jakarta` date >= 26th (July 26) calculates start `2026-07-26` and end `2026-08-25`.
- `SETUP-03`: Rejection of `budgetPeriodStartDay` parameter returns `400 Bad Request` (`INVALID_INPUT`).
- `SETUP-04`: Full 12-pocket selection setup execution creates 12 pockets, 10 allocations, Rp5,800,000 total, and 44 categories.
- `SETUP-05`: Subset 3-pocket selection (`food-groceries`, `cash`, `transportation`) setup execution creates 3 pockets, 2 allocations, Rp1,500,000 total, and 15 categories.
- `SETUP-06`: Per-pocket opening balance matching allocation: allocated pockets get opening balances equal to monthly allocations.
- `SETUP-07`: `cashOpeningBalance` supplied when `'cash'` selected populates Cash pocket `openingBalance`.
- `SETUP-08`: `nfcOpeningBalance` supplied when `'nfc-card'` selected populates NFC Card pocket `openingBalance`.
- `SETUP-09`: Missing companion pocket `'food-groceries'` when `'cash'` selected returns `422 Unprocessable Entity` (`INVALID_REFERENCE`).
- `SETUP-10`: Missing companion pocket `'transportation'` when `'nfc-card'` selected returns `422 Unprocessable Entity` (`INVALID_REFERENCE`).
- `SETUP-11`: `cashOpeningBalance` omitted when `'cash'` selected returns `400 Bad Request` (`INVALID_INPUT`).
- `SETUP-12`: `cashOpeningBalance` supplied when `'cash'` NOT selected returns `400 Bad Request` (`INVALID_INPUT`).
- `SETUP-13`: `nfcOpeningBalance` omitted when `'nfc-card'` selected returns `400 Bad Request` (`INVALID_INPUT`).
- `SETUP-14`: `nfcOpeningBalance` supplied when `'nfc-card'` NOT selected returns `400 Bad Request` (`INVALID_INPUT`).
- `SETUP-15`: Successful durable setup marker persistence: `users.setup_completed_at` is populated via `RETURNING setup_completed_at` and matches response `completedAt`.
- `SETUP-16`: Mid-transaction database failure triggers atomic rollback: `users.setup_completed_at` remains null and 0 domain entities persist.
- `SETUP-17`: Subsequent setup retry after atomic rollback succeeds cleanly (`200 OK`).
- `SETUP-18`: Setup response `templateKeyToIdMap` property keys strictly equal `selectedPocketKeys` mapped to valid generated primary UUID v4 strings.
- `SETUP-19`: Database `pockets.template_key` column is populated for setup pockets, while entity primary keys use generated UUIDs.
- `SETUP-20`: Partial unique index `pockets_owner_template_key_idx` enforces per-owner uniqueness for non-null `template_key`.

### Group 5: Mutation Idempotency & Concurrency
- `IDEM-01`: Identical setup request replay with same `clientMutationId` returns original `200 OK` response with 0 duplicate entities.
- `IDEM-02`: Setup request retry after completion with NEW `clientMutationId` returns `409 Conflict` (`SETUP_ALREADY_COMPLETED`).
- `IDEM-03`: Standalone valid `POST /v1/categories` creation returns `201 Created` and creates category entity.
- `IDEM-04`: Identical `POST /v1/categories` request replay returns original `201 Created` response.
- `IDEM-05`: `POST /v1/categories` with reused `clientMutationId` and different payload returns `409 Conflict` (`IDEMPOTENCY_CONFLICT`).
- `IDEM-06`: Cross-route `clientMutationId` reuse returns `409 Conflict` (`IDEMPOTENCY_CONFLICT`).
- `IDEM-07`: Concurrent setup requests with IDENTICAL mutation IDs replay one committed `200 OK` response with zero duplicate setup executions.
- `IDEM-08`: Concurrent setup requests with DIFFERENT mutation IDs yield 1x `200 OK` and 1x `409 Conflict` (`SETUP_ALREADY_COMPLETED`).
- `IDEM-09`: `idempotency_records.expires_at` is written as `NULL` for indefinite retention.

### Group 6: Revision Control & No-Op Payload Semantics
- `REV-01`: `PATCH /v1/pockets/:id` with matching `expectedRevision` applies updates, increments `revision` by 1, and updates `updated_at`.
- `REV-02`: `PATCH /v1/pockets/:id` with stale `expectedRevision` returns `409 Conflict` (`REVISION_CONFLICT`).
- `REV-03`: `PATCH /v1/pockets/:id` with NO mutable fields provided (only `clientMutationId` and `expectedRevision`) returns `400 Bad Request` (`INVALID_INPUT`).
- `REV-04`: `PATCH /v1/pockets/:id` with valid mutable fields matching existing values returns `200 OK` with `revision` UNCHANGED.
- `REV-05`: Attempting to pass `templateKey` in `PATCH /v1/pockets/:id` returns `400 Bad Request` (`INVALID_INPUT`).
- `REV-06`: `PATCH /v1/categories/:id` with matching `expectedRevision` updates category and increments `revision`.
- `REV-07`: `PATCH /v1/categories/:id` with stale `expectedRevision` returns `409 Conflict` (`REVISION_CONFLICT`).
- `REV-08`: `PATCH /v1/categories/:id` with NO mutable fields provided returns `400 Bad Request` (`INVALID_INPUT`).
- `REV-09`: `PATCH /v1/categories/:id` with same existing values returns `200 OK` with `revision` UNCHANGED.

### Group 7: Owner Isolation & Access Privacy
- `ISO-01`: `GET /v1/pockets/:id` for another user's pocket returns `404 Not Found` (`NOT_FOUND`).
- `ISO-02`: `PATCH /v1/pockets/:id` for another user's pocket returns `404 Not Found` (`NOT_FOUND`).
- `ISO-03`: `POST /v1/categories` referencing another user's pocket as `pocketId` returns `422 Unprocessable Entity` (`INVALID_REFERENCE`).
- `ISO-04`: `PATCH /v1/pockets/:id` referencing another user's pocket as `budgetOwnerPocketId` returns `422 Unprocessable Entity` (`INVALID_REFERENCE`).
- `ISO-05`: `PATCH /v1/categories/:id` for another user's category returns `404 Not Found` (`NOT_FOUND`).
- `ISO-06`: `GET /v1/categories?pocketId=<OTHER_USER_UUID>` returns empty category list `200 OK` (`{ "categories": [] }`).
- `ISO-07`: `GET /v1/categories?pocketId=<NON_EXISTENT_UUID>` returns empty category list `200 OK` (`{ "categories": [] }`).
- `ISO-08`: Error messages for invalid cross-owner references NEVER leak target entity names or ownership status.

### Group 8: Budget Owner Fallback, Archive & Restore Rules
- `ARCH-01`: Archiving a pocket sets `isArchived: true` and `isActive: false`, preserving historical data.
- `ARCH-02`: Restoring an archived pocket sets `isArchived: false` and `isActive: true`.
- `ARCH-03`: Archiving a target pocket referenced as budget owner by active Cash/NFC pockets is rejected with `422 Unprocessable Entity` (`INVALID_REFERENCE`).
- `ARCH-04`: Archiving Cash or NFC Card pocket retains its `budgetOwnerPocketId` in database.
- `ARCH-05`: Restoring Cash or NFC Card pocket when its target budget owner is archived/inactive returns `422 Unprocessable Entity` (`INVALID_REFERENCE`).
- `ARCH-06`: Restoring Cash or NFC Card pocket while providing a valid active replacement `budgetOwnerPocketId` in the same `PATCH` payload succeeds (`200 OK`).
- `ARCH-07`: Restoring Cash or NFC Card pocket with retained `null` `budgetOwnerPocketId` mapping succeeds using payment pocket fallback (`200 OK`).
- `ARCH-08`: Restoring Cash or NFC Card pocket while providing `budgetOwnerPocketId: null` in the replacement payload succeeds using payment pocket fallback (`200 OK`).
- `ARCH-09`: Active Cash or NFC Card pocket clearing `budgetOwnerPocketId: null` succeeds using payment pocket fallback (`200 OK`).
- `ARCH-10`: Setting `budgetOwnerPocketId` on a non-Cash/NFC pocket (e.g. `food-groceries`) returns `422 Unprocessable Entity` (`INVALID_REFERENCE`).
- `ARCH-11`: `POST /v1/categories` under an archived or inactive parent pocket returns `422 Unprocessable Entity` (`INVALID_REFERENCE`).
- `ARCH-12`: Restoring a category under an archived or inactive parent pocket returns `422 Unprocessable Entity` (`INVALID_REFERENCE`).
- `ARCH-13`: Archiving a category sets `isArchived: true` and `isActive: false`.
- `ARCH-14`: Restoring a category sets `isArchived: false` and `isActive: true`.

### Group 9: Filters, Allocations & Ordering
- `FIL-01`: `GET /v1/pockets` defaults (`includeArchived=false`) return active pockets ordered by `created_at ASC, name ASC`.
- `FIL-02`: `GET /v1/pockets?includeArchived=true` returns both active and archived pockets.
- `FIL-03`: `GET /v1/categories` defaults return active categories ordered by `pocket_id ASC, is_default DESC, created_at ASC, name ASC`.
- `FIL-04`: `GET /v1/categories?pocketId=<UUID>` returns categories filtered by parent `pocketId`.
- `FIL-05`: `GET /v1/categories?includeArchived=true` returns active and archived categories.
- `ALLOC-01`: Allocated pocket in `GET /v1/pockets` returns `currentPeriodAllocation` sub-object with period details and allocated amount.
- `ALLOC-02`: Unallocated pocket in `GET /v1/pockets` returns `currentPeriodAllocation: null`.

### Group 10: Error Envelope & Validation Normalization
- `ERR-01`: Standard error responses omit `details` property from JSON envelope.
- `ERR-02`: Fastify validation errors (`FST_ERR_VALIDATION`) are normalized to `code: "INVALID_INPUT"`, `statusCode: 400`, with `details` present.
- `ERR-03`: `error.statusCode` matches HTTP response header status code in all error responses.
- `ERR-04`: Invalid UUID path parameters return `400 Bad Request` (`INVALID_INPUT`).
- `ERR-05`: Unknown body properties (`additionalProperties: false`) return `400 Bad Request` (`INVALID_INPUT`).

---

## 9. Implementation Entry Gate

Phase 7B.2.2 documentation reconciliation and this Phase 7B.3 contract specification were formally accepted by the Product Owner on 2026-08-13.

Endpoint implementation of Phase 7B.3 setup and master data endpoints (`/v1/setup`, `/v1/pockets`, `/v1/categories`) remains **NOT STARTED** and MAY BEGIN only after:

1. A targeted docs-only commit is created and pushed cleanly to `origin/main`.
2. Working tree is verified clean.
3. Separate explicit authorization is granted for Phase 7B.3 endpoint implementation.
