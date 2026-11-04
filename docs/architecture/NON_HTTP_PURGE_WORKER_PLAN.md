# Non-HTTP purge worker — implementation plan

Date: 2026-11-04
Baseline: `ad8c23d` (local commit; not pushed)
Status: proposed technical contract for review; no worker or scheduler enabled

## Product constraints

DEC-027 and DEC-030.2 retain permanent-delete tombstones for 30 days, then purge
them with immutable audit metadata. No public or administrative purge API exists
or may be added by this plan. PR-008 archive/restore behavior, transaction replay,
balance calculations and existing audit contents must remain unchanged.
Backups under DEC-028 are a separate obligation, not replaced by purge logs.

## Source findings

`backend/src/lib/purge.ts` currently selects candidate rows outside the transaction
that inserts audit rows and deletes transactions. `isPurgingActive` guards only
one process. `transaction_purge_logs.purged_transaction_id` is not unique.
Thus cross-process overlap could select the same candidates and generate duplicate
audit entries. This is a source-level risk, not a reproduced production incident.
`batchLimit` is optional and current persistent scheduling does not provide it.

`buildApp` is now timerless; `startPersistentServer` retains the existing timer.
The factory boundary does not itself supply maintenance for serverless hosting.

## Proposed local implementation contract

1. Add a one-shot CLI, provisionally `npm run maintenance:purge -- --execute`.
   Require the explicit execution flag; unknown/missing flags exit nonzero before
   connecting. No HTTP listener, owner login cookie, public route or new dependency.
   Importing the worker module must never execute a purge.
2. CLI uses a separately supplied DB connection/credential with verified TLS in
   production. Prefer direct/session connection for maintenance. Reject transaction
   mode in the CLI until that maintenance path is explicitly verified. Provider
   hostname/credentials stay outside Git, command arguments and output.
3. One invocation performs one bounded batch. Proposed initial cap: 500 rows;
   no CLI override for retention, cutoff, owner ID or unbounded execution. The
   worker derives cutoff from database transaction time minus 30 days. Testing
   may inject a clock in the internal core, never in the production CLI.
4. Begin one database transaction, acquire a dedicated transaction-scoped advisory
   try-lock before selecting any candidates. Every purge caller (including the
   persistent timer) uses this same core and lock key. No nested transaction or
   lock on a separate pooled connection. Busy means skip without writes, not
   a second worker waiting indefinitely or a claim that all work is complete.
5. Within that transaction, apply bounded lock/query timeouts, select eligible
   rows in stable `deletedAt, id` order with row locks and the batch cap, insert
   the existing audit payload, and delete precisely those eligible rows. Validate
   delete count before commit. Audit failure, delete failure or timeout rolls back
   the entire batch. Proposed initial query timeout: 10 seconds; lock timeout:
   2 seconds. Bound whole-run cancellation as well; a timeout must terminate the
   query/connection, not merely stop awaiting it.
6. Do not delete idempotency records, resolution fences or purge logs. Retrying
   after an uncertain outcome must not recreate transactions or duplicate the
   audit for rows already removed. Preserve the existing tombstone semantics;
   archived-only and active rows are never eligible.
7. Close DB resources on success, skip and failure. Keep stdout to one summary:
   status, purgedCount and duration, without financial notes, IDs, credentials or
   raw database exceptions. Suggested statuses: `completed`, `busy`,
   `limit_reached`, `failed`. A full batch means more work *may* remain; do not
   falsely report an exact remaining count. Final exit-code mapping belongs in
   CLI tests: success/busy 0, limit-reached 2 (operator follow-up), failure 1.

These are technical defaults proposed for the next local implementation, not a
new retention policy or authorization to run against real financial data.

## Scheduler and rollout boundary

Keep the current persistent runtime timer during local development, but route it
through the hardened core before enabling the new CLI elsewhere. Its interval
remains 24 hours. The CLI is an additional invocation path, not an automatically
enabled duplicate schedule. No cloud workflow, cron endpoint or DB scheduler is
created here.

Before serverless cutover, select an owner-controlled runner capable of invoking
the CLI directly without a public purge API. Exact provider, schedule timezone,
secret store, notification channel, network access and cost/limits remain TBD.
Do not promise a free provider or guaranteed daily execution without checking it.
Deployment must supply one designated schedule, owner-visible missed-run/failure
alerts and a limit-reached follow-up procedure. A laptop-only schedule is not a
reliable production solution when the laptop is off.

A managed runner would need scoped database access. Define the minimum grants
for candidate reads, transaction deletes and audit inserts before issuing a
production credential; migration credentials must not be reused by default.
An HTTP cron alternative requires explicit PO revision of DEC-030.2 and is not
silently substituted if the non-HTTP runner is inconvenient.

## Required acceptance tests before activation

- Retention: younger than 30 days stays; exact boundary/older rows follow the
  existing inclusive cutoff rule. Active and archived-only rows stay untouched.
- Stable capped selection; repeated batches eventually drain eligible fixtures.
- Two independent DB clients race: only one lock holder selects/deletes; one
  audit per deleted row. Subsequent invocation safely completes/skips.
- Audit insertion failure and delete-count mismatch roll back all effects.
- Commit then simulated lost result: next run does not repeat an audit; existing
  create/delete resolution acknowledgements still replay after physical purge.
- Query/lock timeout and process failure release locks and permit a later run.
- CLI argument guards, nonzero failures, redacted output and resource cleanup;
  persistent timer and CLI call the same bounded core.
- Verify no purge routes in the HTTP app, and no side effects from module imports.
- Run regression on isolated test DB; hosted runner/TLS verification is separate.

## Next delivery and review

Recommended next slice: hardened atomic purge core plus the above regression
tests, then one-shot CLI and invocation tests. Do not install dependencies or
activate a provider schedule merely because this plan exists. No destructive
operation has been executed in this planning checkpoint.

Review the technical defaults and CLI boundary before implementation. Provider
selection and production execution remain separately approved steps. No new
MVP features, offline queue, auth replacement or financial-rule changes.
