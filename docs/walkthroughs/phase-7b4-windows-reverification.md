# Phase 7B.4 — Windows PostgreSQL re-verification

Date: 2026-09-13
Reviewer: Codex (PM / Tech Lead)
Source checkpoint: `90b3e59` (backend implementation unchanged from `84af8c9`).
Historical status on 2026-09-13: Local database ready; baseline tests pass; additional review found two
idempotency defects requiring remediation before new backend feature work.

Follow-up 2026-09-14: both findings were fixed and verified by Codex under direct
PO authorization. See [remediation evidence](phase-7b4-idempotency-remediation.md).
The original reproduction evidence below is retained unchanged.

This is new verification evidence, not a retroactive withdrawal of previously
accepted checkpoints. Phase 7B.4 Product Owner acceptance remains pending.

## Installation and isolation

- PostgreSQL 16.15 Windows x64 binaries obtained via the official PostgreSQL
  Windows download page's EDB distributor: <https://www.enterprisedb.com/download-postgresql-binaries>.
- Package SHA-256 recorded locally:
  `5E8AFFFE67DAF949AEEB03B74951F1EC2324E1888F73FBD036AB0E567AB004D9`.
  This is a local fingerprint, not an independently matched publisher checksum.
  `postgres.exe` reports Authenticode `NotSigned`; no signed-binary claim is made.
- Installed outside the repository under
  `C:\Users\mylaptop\AppData\Local\PocketFlow\PostgreSQL16`.
- Manual-start process, no Windows service, no global PATH or firewall changes.
- `listen_addresses = 127.0.0.1`, port `5432`, timezone `UTC`, UTF-8,
  SCRAM-SHA-256 authentication and data checksums enabled.
- Uses the existing Compose development role/password convention. This is a
  local-only development credential and must never be reused in production.
- Development database: `pocketflow_dev_windows`; test database:
  `pocketflow_test_7b4_windows`. No frontend LocalStorage or cloud database used.
- Startup on September 13 completed automatic recovery after the prior process
  was interrupted. Database readiness was confirmed afterward.

## Verification obtained

| Check | Result |
|---|---|
| `postgres --version` | PostgreSQL 16.15 |
| `pg_isready -h 127.0.0.1 -p 5432` | Accepting connections |
| SQL database/config checks | Dedicated test DB; loopback only; UTC; four migrations |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| `node dist/db/migrate.js` on development DB | Passed twice; repeat was idempotent |
| `npm run test:integration` with explicit local test URL | 178 passed, 15 suites, 0 failed/cancelled/skipped, ~89.4 seconds |
| Additional item replay/concurrency probes | Two defects reproduced below |
| CORS OPTIONS for PUT/PATCH/DELETE | 204; requested methods included in allow-methods |
| Live HTTP on temporary loopback listener | `/health` 200; unauthenticated `/v1/transactions` 401; listener closed afterward |

The baseline integration suite uses Fastify injection with live PostgreSQL.
Additional diagnostics used a temporary ignored harness, not application code.
No dependencies or production source were changed. No manual frontend/backend
integration or production deployment verification is claimed.

## Review findings

### P1 — Reused item mutation ID can create duplicate expenses across batches

Source: `backend/src/routes/transactions.ts`, batch item pre-check around line
877 and item insertion/idempotency write around lines 970–1014.

Reproduction: submit an expense item with mutation ID A in batch root B; then
submit exactly the same item A in a different batch root C. Both requests
returned 201 with different transaction IDs, creating two expenses. The
pre-check rejects only differing hashes; an identical item continues through
transaction insertion while `onConflictDoNothing()` suppresses the duplicate
idempotency-record insert. It does not suppress the duplicate financial write.

Required outcome: item-level idempotency must prevent a second financial effect
across batch roots or single/batch routes. Follow the approved replay contract;
do not silently redesign request semantics. Add regression tests for identical
and changed payloads, single-to-batch reuse, and concurrent submission, retaining
batch atomicity and balance integrity (DEC-030.1; contract section 4.2).

### P2 — Concurrent identical single POST returns 500 instead of replay

Source: `backend/src/routes/transactions.ts`, pre-lock idempotency check around
line 485 and unconditional record insert around line 738.

Reproduction: issue two identical POST requests concurrently using the same
mutation ID. Results: 201 and 500 (`error.code = 23505`). Only one transaction
was stored, so the database uniqueness constraint prevented duplication, but
the API failed to return the contracted replay. The losing request checked for
the record before the winning request committed and never rechecked after
serialization; its idempotency insert failed.

Required outcome: atomic request claim/recheck or equivalent safe coordination,
with same-payload retries returning the original result and changed payloads
returning 409 IDEMPOTENCY_CONFLICT, never a raw database error. Extend regression
coverage to other transaction mutations as appropriate (contract section 4.1).

## Next gate recorded at original review (superseded by follow-up above)

Antigravity Backend should address these two findings in a bounded Phase 7B.4
remediation task. Codex reviews the diff, baseline tests and new regression
evidence afterward. Do not start Reports API, sync, Supabase migration or
deployment as part of this remediation. No acceptance or commit/push is implied
by this verification report.

## Local start / stop reference

In PowerShell (installation is specific to this laptop):

```powershell
$pgRoot = 'C:\Users\mylaptop\AppData\Local\PocketFlow\PostgreSQL16'
& "$pgRoot\runtime\pgsql\bin\pg_ctl.exe" -D "$pgRoot\data" -l "$pgRoot\server.log" -w start
& "$pgRoot\runtime\pgsql\bin\pg_isready.exe" -h 127.0.0.1 -p 5432
# Before shutdown/restart, stop cleanly; this does not delete database files.
& "$pgRoot\runtime\pgsql\bin\pg_ctl.exe" -D "$pgRoot\data" -m fast -w stop
```

Set `TEST_DATABASE_URL` explicitly to the local `pocketflow_test_7b4_windows`
database before running tests from `backend`. Never point this runner at the
development database or a cloud/production URL: it truncates test tables.
No owner account has been provisioned in the development database.
