# Phase 7D — Atomic bounded purge core

Date: 2026-11-04
Completion review: 2026-11-05 after interrupted session
Baseline: `61a854f`, committed locally with PO authorization; clean tree at entry
Scope: first implementation slice of NON_HTTP_PURGE_WORKER_PLAN.md

## Delivery and constraints

DEC-027 / DEC-030.2: 30-day retention, atomic audit and no purge HTTP API remain.
PR-007/008 financial balance, archive/restore and idempotent deletion semantics
are preserved. No CLI, new dependency, schema migration or cloud schedule added.

`purgeDeletedTransactions` now owns one root transaction for all of:

1. SET LOCAL statement timeout 10s and lock timeout 2s.
2. Dedicated transaction advisory try-lock, common to all purge callers. Busy
   returns without selecting or deleting rows; no process-only exclusion claim.
3. Database transaction time (unless internal test clock supplied), cutoff at
   least 30 days old, stable deletedAt/id ordering, row locks and max 500 rows.
4. Existing immutable audit payload insertion, followed by deletion of exactly
   the eligible locked IDs. A count mismatch throws and rolls back the audit.

Result adds `completed`, `busy` or `limit_reached`, retaining the prior count and
ID fields for internal callers. A full batch means more *may* remain, not an
exact remaining count. Existing persistent timer automatically calls this core;
the timer interval is unchanged and no catch-up loop has been introduced.
Audit records, idempotency records and resolution fences are never purged here.

Internal batch input rejects zero/fractional/over-cap values rather than silently
running unbounded. Internal retention/cutoff overrides cannot shorten 30 days;
future CLI will not expose clock, cutoff or retention overrides.

## Verification evidence

- Initial targeted atomic-core, connected delete/replay and runtime lifecycle:
  26/26 tests passed before the extra 501-row-cap and slow-statement tests.
- Backend `npm run typecheck` and `npm run build`: passed during implementation
  and both rerun successfully on 2026-11-05. `git diff --check` and relative links
  in all six changed/new Markdown files passed.
- Full `npm run test:integration` completed in the previous session: **455/455
  tests across 55 suites passed**, zero failures/skips/cancellations/todo,
  duration 513684 ms. Final summary recovered on 2026-11-05 from ignored
  `.env.purge-atomic-full.log`; suite not rerun solely because the session stopped.
- Completion review preserved application/test code, checked source/diff and
  documentation links, and obtained explicit PO authorization for this commit.
- New tests cover inclusive 30-day boundary, active/archive-only preservation,
  stable batching and 500-row default, DB time, invalid limits, independent-client
  try-lock and concurrent calls, one audit per deletion and safe retry.
- Real disposable-DB triggers exercise audit failure and suppressed deletion;
  both roll back. A separate connection holds a candidate row to exercise the
  two-second lock timeout. A slow audit trigger exercises actual query cancellation
  at ten seconds, with rollback and later success. Test triggers are removed in
  finally blocks. Tests affect only `pocketflow_test_7b4_windows`.
- No production/personal/preview data targeted. The tests physically remove
  disposable fixture rows; fixture setup recreates them. No personal-data recovery
  is needed or claimed. No frontend/browser verification claim.

## Remaining work and review boundary

This is the hardened core only. The one-shot CLI must still implement explicit
execution flags, whole-run deadline/connection cancellation, cleanup and redacted
status/exit codes. Per-statement timeout is NOT an end-to-end worker deadline:
pool acquisition/network stalls and process interruption need CLI-level testing.

The persistent scheduler still uses its existing reporting behavior. Delivery
does not claim reliable missed-run/backlog alerts. Before cloud activation,
implement owner-visible failure/limit follow-up, a designated non-HTTP runner,
scoped credentials and hosted TLS/connection verification. No purge route or
retention-policy change is authorized by this continuation.

PO requested completion and commit on 2026-11-05. No push or CLI implementation
is included in that instruction. Review the checkpoint before CLI work.
