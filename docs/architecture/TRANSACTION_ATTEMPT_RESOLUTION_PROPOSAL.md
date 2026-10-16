# Transaction attempt resolution — proposal

Date: 2026-09-30
Status: Bounded proposal accepted by Product Owner on 2026-09-30 (DEC-032).
Exact contract is now specified in TRANSACTIONS_API_CONTRACT.md section 4.0;
the proposal-stage text below is retained as the decision trail.
Scope: Safe abandonment of a single-create attempt in connected development,
within Phase 7C.3. Not transaction deletion, offline sync, or deployment.

## Why the current client cannot safely discard an attempt

The transaction POST runs business checks and success-record insertion inside
`runIdempotentMutation`. A business rejection rolls back without a durable
terminal rejection record. Another request with the same mutation ID may succeed
later after server conditions change. A 422 from one execution therefore does
not fence another tab or a delayed request. Absence from paginated history is
also not proof that no request can commit.

Evidence: `backend/src/routes/transactions.ts` single-create and batch handlers;
`backend/src/lib/idempotency.ts` advisory locking and replay. This is a source
review finding, not a newly executed concurrency-test result.

## Proposed user-visible behavior

1. Keep the existing explicit retry using the unchanged ID and payload.
2. Add an explicitly confirmed action to stop an unresolved create attempt.
3. Ask the server to resolve it atomically. If already committed, acknowledge
   that original result and refresh canonical data; do not undo the transaction.
4. Otherwise record a terminal cancellation that prevents later execution of
   that mutation ID. Cancellation itself changes no balance or allocation.
5. Only after a validated terminal response may the client remove the matching
   journal record and allow a new entry. On timeout, retain the journal and allow
   explicit resolution retry. Never silently generate a replacement ID.

The UI must distinguish cancellation of a request from archive/delete of an
existing transaction. A hash conflict must remain blocked for investigation,
not be represented as a successful cancellation.

## Contract work required after approval

The approved seven transaction routes have no terminal attempt-resolution
operation. Specify a narrowly scoped authenticated, CSRF-protected operation
before implementing it; route and exact DTO are intentionally not finalized here.

- Bind resolution to the authenticated owner, original mutation ID, operation,
  and canonical original payload/hash.
- Serialize resolution and creation using the same owner/mutation advisory lock.
- Return an unambiguous committed or cancelled result; repeated resolution must
  be safe, including after response loss.
- Preserve existing success replay and payload-conflict semantics.
- Ensure all mutation-ID consumers, including batch per-item reuse, respect the
  cancellation fence. Do not permit bypass through another route or payload.
- Define durable cancellation storage and retention; do not expire the fence
  while a delayed request could still execute. Schema choice remains TBD.
- Validate original acknowledgements without treating replay as current ledger
  state; refresh canonical history and balances afterward.

## Required verification before delivery

- Create wins race: resolution reports committed; exactly one ledger entry.
- Resolution wins race: delayed create and batch reuse cannot create an entry.
- Repeated/concurrent resolution, lost response, reload and two-tab recovery.
- Wrong owner, missing/invalid CSRF, mismatched payload and malformed response.
- No balance/allocation effects for cancellation; no implicit archive/delete.
- Client journal only clears after matching validated terminal acknowledgement.
- Existing idempotency, transaction and browser regressions remain passing.

## Proposal-time checkpoint (historical)

No API, schema, frontend behavior, database or Git history changed by this review.
Existing expense UI remains development-only and can be blocked by a rejected
attempt. Build, type-check and runtime tests were not rerun for this proposal;
previous implementation evidence remains in
`../walkthroughs/phase-7c3-expense-ui.md`.

Approval requested: authorize this bounded contract extension and subsequent
implementation under the behavior and verification constraints above.
