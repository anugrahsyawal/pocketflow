# Phase 7D — Local production configuration and readiness foundation

Date: 2026-11-04
Baseline: `8e1445b`; clean working tree verified before implementation
Authority: PO requested continuation after authorizing the assessment commit.
Scope: first local implementation slice from FREE_FIRST_HOSTING_PROPOSAL.md,
supporting backlog 12.2 and preserving PR-018 / DEC-029 authentication.

## Implemented boundary

- Environment names must be development/test/production, avoiding accidental
  insecure-cookie behavior from a misspelled production name. Ports must be whole
  decimal numbers in range. PostgreSQL URL validation never repeats credentials.
- Production requires explicit HTTPS CORS origin and a session secret of at least
  32 bytes, rejecting known example markers and repeated-character placeholders.
  This is a minimum guard, not an entropy test. Operators must generate random
  secrets and store them outside Git. Origins cannot contain credentials.
- Existing `/health` response is preserved as process liveness, independent of DB.
- New unauthenticated `GET /ready`: 200 `{status:"ready",service:"pocketflow-api"}`
  or 503 `{status:"unavailable",service:"pocketflow-api"}`. Both health routes
  return `Cache-Control: no-store`; failures never expose database details.
- Readiness performs only `SELECT 1`, using a separate maximum-one-connection
  probe. Concurrent calls share one in-flight operation per app. A two-second
  deadline ends stalled work and closes the connection, including failures.
  The business query pool is unchanged; no dependency or schema changes.

This is connectivity readiness, not schema/migration/capacity verification. A
reachable database with missing application tables can still return 200.
No frontend/design change; Stitch reference work is not applicable to this slice.

## Verification

- `npm run typecheck` and `npm run build` in backend: passed.
- Targeted `npx tsx --test --test-concurrency=1` over productionConfig, readiness,
  and health_auth_regression files: 15/15 passed (before adding the explicit
  socket-release assertion, which is included in the full-suite run).
- Actual loopback HTTP `/ready` returned 200 with the real disposable PostgreSQL
  database; tests cover 503/redaction, independent liveness, refused connection,
  silent TCP peer timeout, overlapping callers and later retries.
- Full `npm run test:integration`: **435/435 tests across 52 suites passed**,
  no failures/skips/cancellations/todo; exit 0, duration 350406 ms. Includes the
  explicit socket-release assertion. Log `.env.production-readiness-full.log`
  is local and ignored, not a distributable artifact.
- Source/diff review and `git diff --check` passed; relative links in all nine
  changed/new Markdown documents resolve.
- Tests target only `pocketflow_test_7b4_windows`; existing test reset safeguards
  apply. No production, personal or browser-preview database targeted.
- PostgreSQL startup attempt could not open the existing log file; the already
  available server subsequently supported the tests. No installation changes.
- No new frontend build/manual browser verification claimed for backend-only work.

## Limits and next gate

Not a production readiness certificate. Database TLS/pooler adaptation,
serverless packaging, purge scheduling, authenticated response caching policy,
abuse controls, proxy/cookie behavior, backups/restore and staging remain pending.
The separate probe has a bounded connection but is not a load test or rate limiter.
Production deployment must not rely on these guards alone. HTTP localhost remains
supported in development; public registration/auth replacement is not introduced.

Review this slice and its evidence before the next implementation checkpoint.
No automatic commit/push, external account/resource creation or deployment.
