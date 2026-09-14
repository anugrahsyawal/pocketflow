# Phase 7B.4 — Idempotency remediation

Date: 2026-09-14
Implementer / verifier: Codex, directly authorized by the Product Owner.
Status: Implemented and verified locally; Product Owner accepted and authorized
commit/push on 2026-09-14. Git history records the delivery commit.
Existing uncommitted Windows-review documentation was
preserved as part of this continuation, not a new implementation phase.

## Scope and requirements

Resolves the two findings in [Windows re-verification](phase-7b4-windows-reverification.md):
duplicate batch-item expenses (P1) and concurrent single-create 500 responses
(P2). Follows DEC-030.1 and transaction contract sections 4.1–4.3: replay identical
mutation IDs, reject changed payloads with 409, preserve batch atomicity and
optimistic revisions. The Product Owner explicitly assigned implementation to
Codex rather than Antigravity for this task.

No dependencies, database schema, API routes, financial rules, authentication,
frontend, Reports, sync or hosting changes were introduced. Stitch references
are not applicable to this backend-only change.

## Implementation

- `backend/src/lib/idempotency.ts`: optional transaction-scoped record lookup;
  shared transaction mutation wrapper obtains PostgreSQL transaction-level
  advisory locks and rechecks the stored result before executing domain logic.
  Keys incorporate owner and mutation UUIDs and are sorted before acquisition.
  All locks release on commit/rollback; there is no process-local mutex or new
  persistent lock table. Hash collisions can serialize unrelated requests but
  cannot cause them to share replay records.
- `backend/src/routes/transactions.ts`: all six mutating transaction handlers
  use the wrapper. Batch root/item keys share the same coordination mechanism
  as single creates. Existing items replay their saved response; only new items
  undergo reference/funds checks and insertion, preserving response order.
  Duplicate root/item IDs and case-equivalent duplicate item IDs are rejected.
  Existing item records are not silently ignored after inserting a new expense.
- `backend/tests/integration/transactions_idempotency_regression.test.ts`:
  15 regression cases covering concurrent identical/changed single requests,
  cross-batch and single/batch reuse, mixed new/replayed items, rollback,
  concurrent roots/overlapping reversed-order items, key collisions and
  concurrent PATCH/archive/restore/delete replay.
- `backend/AGENTS.md`: records the bounded Product Owner role override.

Replaying a prior item is not a fresh mutation: it returns the stored original
response even if current funds would no longer allow a new expense. New items
still require current valid references and sufficient funds. Failed mixed
batches preserve already committed historical items and commit no new effects.

## Evidence on local PostgreSQL 16.15

All financial test writes targeted `pocketflow_test_7b4_windows` on
`127.0.0.1:5432`, never frontend LocalStorage or a cloud/production database.

| Verification | Result |
|---|---|
| `npm run typecheck` | Passed (production TypeScript source) |
| `npm run build` | Passed |
| Focused regression runner | 15/15 tests passed, ~14.1 seconds |
| `npm run test:integration` | 193 tests / 16 suites, all passed, ~66.0 seconds |
| Re-run original diagnostic harness | Concurrent POST: 201 + 201, same ID, one row; cross-batch item: same ID |
| Native loopback HTTP smoke | `/health` 200; unauthenticated `/v1/transactions` 401; temporary listener closed |
| CORS preflight PUT/PATCH/DELETE | 204; requested methods allowed |
| `node dist/db/migrate.js` twice on separate development DB | Both passed; still four migrations, no new migration |
| Source/diff review and `git diff --check` | Passed |

Focused command (from `backend`, with the dedicated local `TEST_DATABASE_URL`):

```powershell
npx tsx --test --test-concurrency=1 tests/integration/transactions_idempotency_regression.test.ts
npm run test:integration
```

The existing test helper applies migrations and resets dedicated test tables.
Do not point it at a development or production database. Native PostgreSQL on
Windows was used in place of the historical Docker verification command under
the Product Owner's explicit local-installation approval.

## Limitations and handoff

- The closed findings are bounded to transaction API idempotency. This is not
  a general concurrency, security, load or production-readiness certification.
- Other API domains retain their existing concurrency implementations.
- No manual frontend/backend integration verification was performed; the
  frontend still uses its existing local persistence.
- PostgreSQL is a manually started local process, not an auto-start service.
- The Product Owner accepted this remediation and authorized commit/push.
  Older checkpoint acceptance states are not retroactively changed. Reports
  still requires its own approved contract before implementation; no deployment.
