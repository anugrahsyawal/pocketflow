# Phase 7B.5 — Reports API implementation

Date: 2026-09-14. Implementer/reviewer: Codex under explicit PO authorization.
Delivery: implemented locally. Contract accepted; implementation PO acceptance
pending. Contract commit: `0e2eb5e` (local, not pushed). Coding began only after
that commit and confirmation of a clean working tree. No implementation commit
or push was performed in this phase.

## Scope and source of truth

[Accepted contract](../architecture/REPORTS_API_CONTRACT.md), DEC-031, backlog
Epic 8 and the existing Reports design specification govern this implementation.

- `GET /v1/reports/current-period` and `GET /v1/reports/periods/:startDate`.
- Authenticated, owner-scoped, private/no-store responses; strict read query
  validation after session authentication.
- One injected clock, Asia/Jakarta business dates, fixed 26–25 periods.
- One read-only repeatable-read database transaction for the report snapshot.
- Exact BIGINT financial calculations with safe-integer checks before emitting
  JSON; ratios are analytics, not ledger money.
- Real transaction totals, daily series, budget attribution, payment breakdown,
  weekly fractions, deterministic insights and informational Sinking candidates.
- Stored Cash/NFC attribution remains unchanged by current owner configuration.
  Physical balances remain independent. Transfers are neutral; budget
  reallocation is not applied twice.
- Missing allocation and historical budget-dependent data remain unavailable,
  not fabricated zeros or current values substituted for historical facts.
- Exclusions affect this request only. GET does not initialize allocations,
  create periods, or persist financial/settings state. Existing session
  last-used auditing remains unchanged.

## Files

- `backend/src/app.ts`: register report routes and optional report clock.
- `backend/src/routes/reports.ts`: authenticated queries and snapshot transaction.
- `backend/src/lib/reports.ts`: pure calculations and request validation.
- `backend/src/lib/reportSchema.ts`: complete required-field response schema.
- `backend/tests/integration/reports.test.ts`: deterministic and live DB tests.
- Backend agent instructions and current delivery/index/backlog/traceability
  documents: authorization, verification and review state.

No new dependencies, migrations, frontend changes, or production configuration.

## Verification evidence

Environment: Windows, native PostgreSQL 16.15 at loopback `127.0.0.1:5432`.
Development: `pocketflow_dev_windows`; disposable tests:
`pocketflow_test_7b4_windows`. Only the disposable test database is reset by tests.

- `npm run typecheck`: passed, zero errors.
- `npm run build`: passed.
- `npm run db:migrate`: passed twice against development DB; existing migrations
  remain idempotent; no new migration.
- Initial focused Reports run: 37 tests passed. Subsequent coverage added strict
  schema validation, concurrent committed updates, owner-map preservation and
  Sinking boundary tests.
- A first full run caught a test-validator configuration issue: default request
  coercion changed nullable fields while validating a response. The standalone
  test validator now disables coercion, defaults and property removal. Current
  and historical responses validate without modification.
- Final `npm run test:integration`: **235 passed, 0 failed, 18 suites**,
  approximately 96.5 seconds. Includes all 193 baseline tests and 42 Reports
  tests. Explicit TEST_DATABASE_URL targeted only the disposable local test DB.
- `git diff --check`: passed (only Windows LF/CRLF normalization notices).
- Runtime: real authenticated HTTP GET via an ephemeral loopback listener
  returned 200, schemaVersion 1, and private/no-store. Fastify injection tests
  exercised auth, invalid requests, financial data, and errors against live PG.
- Concurrent snapshot evidence: 30 atomic pocket/expense updates overlapped 30
  report requests; every reported derived balance retained the invariant 100.
  This is bounded regression evidence, not an exhaustive concurrency proof.
- Source/diff review: all query roots and allocation joins are owner-scoped;
  active ledger filters both archive/delete timestamps; amounts are selected as
  text before BigInt conversion; report transactions explicitly request read-only
  repeatable read. Financial aggregates do not use list pagination.

## Contract matrix coverage

| Contract cases | Evidence in Reports tests |
|---|---|
| RP-01–09 | Both unauthenticated routes, expired sessions, owner isolation, exclusion privacy, invalid dates/query/size |
| RP-10–14 | Jakarta midnight, year rollover, leap days, year 0001, current alias equality, pre-setup GET without domain writes |
| RP-15–20 | Income/expense/transfer semantics, 61 expenses, daily zeros, archive/restore/delete filtering, archived metadata |
| RP-21–25 | Transportation/NFC fixture, persisted attribution after owner-map change, independent balances, reallocation once |
| RP-26–30 | Missing/zero/partial allocations, historical null despite stored allocation rows, read-only and concurrent snapshot |
| RP-31–35 | Four weekly buckets, exact fraction numerators, .7/.9/1 thresholds, zero denominator, overflow |
| RP-36–40 | Eight untruncated category groups, null category, tie order, deterministic/current/historical/empty insights |
| RP-41–46 | Sinking days 6/5/0, nonspendable/archived exclusions, no candidates, zero balances, all excluded, historical null |
| RP-47–49 | Strict current/historical response validation, cache headers, baseline regression suite |

Archive/restore/delete report tests change disposable fixture state directly;
the existing transaction lifecycle suites separately exercise mutation endpoints.
No manual frontend/browser verification is claimed: frontend/API integration is
outside this backend-only phase, and browser LocalStorage was not touched.

## Limitations and next review gate

- Historical allocation/balance snapshots remain deliberately absent (DEC-031).
- The existing frontend is not connected to these routes yet. It will not show
  a visible change from this backend implementation alone.
- The backend reads the owner's complete active ledger into memory for current
  balance consistency. Large-account production performance/load testing is not
  covered by this bounded MVP verification.
- No deployment, Supabase migration, remote sync, or automatic Sinking transfer.
- Existing earlier-phase limitations and acceptance records are unchanged.

Recommend PO review of this implementation evidence, then separate approval for
implementation commit/push and the next bounded integration phase.
