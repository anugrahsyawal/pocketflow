# Phase 7D — One-shot purge CLI

Date: 2026-11-05
Baseline: `9ad932b`; clean tree verified before this authorized continuation
Scope: CLI boundary/deadline from NON_HTTP_PURGE_WORKER_PLAN.md, no deployment

## Implemented

- Import-safe CLI and worker modules; explicit single `--execute` argument required
  before config/connection. No listener, purge route or new dependency.
- Separate mandatory `PURGE_DATABASE_URL`; no fallback to API URL or automatic
  dotenv loading. Direct/session only; production uses existing verified TLS
  configuration. Worker needs no API session secret/CORS credentials.
- One dedicated connection and one bounded atomic core invocation, retaining
  DEC-027/030.2 retention/audit semantics. Core returns busy or capped outcomes.
- Fixed 30-second deadline plus connection cleanup; timeout and AbortSignal
  terminate the dedicated connection, not just stop waiting. CLI handles
  SIGINT/SIGTERM; internal timeout override exists only for tests, not CLI flags.
- One redacted JSON summary and exits 0/2/1 for completed-or-busy/limit/failure.
  Failure count is null: a commit/connection race must not be labelled zero writes.
  Safe retry relies on the already verified core and retained replay records.

## Verification

- `npm run typecheck` and `npm run build`: passed on final rerun.
- `node dist/cli/purge.js` without execution consent: emitted one redacted
  `INVALID_ARGUMENTS` summary and exited 1 as expected (compiled entrypoint guard).
- Targeted integration run of `purgeWorker.test.ts`, `purgeAtomic.test.ts` and
  `frontendTransactionDelete.test.ts`: **34/34 passed**, 3 suites, no skips,
  approximately 44 seconds. Worker-only rerun also passed **9/9** beforehand.
- Targeted tests cover imports without effects, argument/config guards, actual
  CLI subprocess execution/output/exit, real DB success, batch limit/retry, lock
  busy, DB error redaction, stalled TCP cleanup, AbortSignal and deadline during
  an actual blocked transaction followed by a safe explicit retry.
- Run includes atomic-core rollback/retention/concurrency and connected delete
  replay regressions. Tests target `pocketflow_test_7b4_windows` only; fixtures
  physically removed by tests are reproducible. No personal/hosted data touched.
- First attempt hit an inactive local PostgreSQL and a missing test brace. The
  test syntax was corrected and installed PostgreSQL started before rerunning.
- An intermediate targeted run had 33/34 passing with `CONNECTION_DESTROYED`
  during deadline cleanup. The worker now drains transaction settlement after
  forced connection closure; the final test also observes PostgreSQL's actual
  lock wait before asserting timeout and retry. Final targeted rerun passed.
- No frontend changes or manual browser QA. OS-level signal delivery is not
  claimed from AbortSignal tests. No process-crash-after-COMMIT guarantee.

## Limits and next review

No provider workflow, production secret/grant, alert destination or schedule was
created. The persistent timer retains its prior reporting; the new CLI does not
automatically replace it. Do not enable duplicate schedules inadvertently.
Before activation choose one non-HTTP runner, verify actual TLS/credentials,
monitor skipped/missed/failed/limit runs and verify the separate backup baseline.

This task does not claim a hard real-time deadline during OS suspension or event-
loop blocking, or immediate server-side rollback after a lost COMMIT. Closing the
connection plus SQL bounds stops further client work; uncertainty is reported.
Full regression from preceding core checkpoint (455/455) is historical evidence,
not a new full-suite run. Review this bounded CLI checkpoint before hosted work.
No commit/push/deployment performed in this continuation.
