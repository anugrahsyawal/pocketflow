# Phase 7D — Persistent runtime boundary

Date: 2026-11-04
Baseline: `da6275f`, committed with PO authorization, not pushed; clean tree at entry

## Scope and authority

PO authorized commit and continuation toward runtime/scheduler readiness.
This slice separates construction of the HTTP app from the persistent Node
runtime. DEC-030.2 explicitly prohibits public/administrative purge APIs;
therefore an authenticated HTTP cron handler is NOT added by this work.
No frontend/design change, dependency, migration or hosted resource.

## Implementation

- `buildApp` registers routes/plugins only: no listener or purge timer.
- `startPersistentServer` owns the listener, database-client shutdown and existing
  24-hour timer. Maintenance starts only after a successful listen. It does not
  run immediately, and retains the existing 30-day purge policy/audit logic.
- Closing the runtime stops its timer and closes the DB client; failed startup
  cleans up. Closing an independently constructed app no longer stops the runtime
  timer. One persistent runtime per process remains the supported model.
- `server.ts` handles SIGINT/SIGTERM with one shutdown attempt. App factory and
  runtime-module imports do not start a server. Existing local start command stays.

## Verification

- Backend type-check/build passed after implementation.
- Targeted `npx tsx --test --test-concurrency=1` lifecycle, readiness, health/auth
  and delete/purge replay tests: **25/25 passed across 4 suites**, exit 0; no
  skipped/cancelled/todo. Log: ignored `.env.runtime-lifecycle.log`.
  Runtime tests cover no factory timer/listener, real HTTP liveness,
  timer ownership/close and recovery after EADDRINUSE. No purge HTTP route exists.
- Initial fixture lacked environment needed by the auth plugin; corrected. A
  subsequent run encountered local PostgreSQL ECONNREFUSED. Installed PostgreSQL
  was started, completed automatic recovery, and became ready. No data directory
  reset, manual recovery or installation change was performed.
- DB regressions target only `pocketflow_test_7b4_windows`. New runtime tests use
  an unused loopback DB URL and perform no database writes.
- Full 442-test regression passed at the preceding database-profile checkpoint;
  not rerun/claimed for this slice. No frontend build or manual browser claim.
- Source/diff review and relative Markdown links passed. Signal handlers are
  implemented; tests exercise app.close lifecycle, not OS signal delivery.

## Remaining gates

This is not a deployed serverless entry. Do not deploy server.ts as a function:
it intentionally starts persistent maintenance. The timerless app factory is
only a preparation boundary, not authorization to disable production purge.

Before enabling hosted functions, specify an owner-controlled non-HTTP worker
invocation compatible with DEC-030.2, bounded batches, cross-process overlap
protection and failure reporting. Existing purge selection precedes its atomic
audit/delete transaction, so concurrency needs explicit review before multiple
workers. No scheduler/provider has been selected or activated.

An HTTP-triggered purge design would require a separate PO decision that
explicitly revises DEC-030.2; generic continuation does not grant that change.
Backups, TLS/provider proof, runtime packaging and staging remain open gates.

Review this local slice before next implementation. No automatic commit/push.
