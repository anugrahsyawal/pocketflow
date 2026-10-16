# Lifecycle attempt resolution — bounded extension proposal

Date: 2026-09-30
Status: Proposal accepted by PO on 2026-09-30 (DEC-033). Exact contract is now
TRANSACTIONS_API_CONTRACT.md section 4.0.1. Proposal-time text below is historical.
Scope: Explicit terminal resolution for archive/restore only, within Phase 7C.3.
Excludes edit, delete, batch, offline sync, deployment and automatic compensation.

## Verified problem

The existing resolve-attempt endpoint and DEC-032 cover single-create only.
Archive/restore business rejection rolls back without a durable terminal record.
Expected revision protects concurrent edits, but cannot fence a restore when only
the available balance or reference availability changes.

Reproduction added to `backend/tests/integration/frontendTransactionLifecycle.test.ts`:

1. Archive the fixture's 18000 expense; its revision becomes 2, balance 100000.
2. Create another 90000 expense; balance 10000.
3. Restore original with revision 2: INSUFFICIENT_FUNDS, no effect.
4. Create 20000 income; balance 30000. Original transaction still revision 2.
5. Resend the exact same restore ID/body: succeeds, revision 3, balance 12000.

This verifies that a rejected execution is not terminal; a delayed request from
another tab could still execute. Do not infer that revision conflicts and business
rejections have identical safety properties. This proposal uses one explicit
server-confirmed exit for unresolved lifecycle attempts instead of relying on
client timing or list absence.

## Proposed contract

Add `POST /v1/transactions/:id/resolve-attempt` with authenticated owner and CSRF.
Body: `{ operation: 'archive' | 'restore', clientMutationId, expectedRevision }`.
Reject unknown fields, invalid UUID/revision, or any other operation. This is a
proposal only; approval authorizes finalizing the contract and implementation.

- Compute the hash using the ORIGINAL POST archive/restore route and ORIGINAL
  body `{clientMutationId, expectedRevision}`, not the resolution wrapper.
- Acquire the same owner/mutation advisory lock as archive/restore before checking
  the idempotency record or writing a cancellation fence.
- Matching committed operation (including no-op): return HTTP 200 with
  `status: 'committed'`, the original mutation ID and original acknowledgement.
  Preserve its result; do not restore/archive/delete anything as compensation.
- No matching execution record: persist a permanent non-financial fence and
  return HTTP 200 with `status: 'cancelled'` and the original mutation ID.
- Matching fence: return the same cancelled result. Future same-ID dispatch cannot
  execute; other payloads/routes remain conflicts, never cancellation success.
- Conflicting hash/operation: 409 IDEMPOTENCY_CONFLICT; keep client recovery.
- Use existing idempotency storage if validated sufficient; no planned migration
  or dependency. Cancellation has no expiry while delayed requests can arrive.
- Do not require current business conditions to allow stopping an unexecuted
  attempt. Scope the key to the authenticated owner; expose no foreign entity data.
- Keep existing single-create resolution semantics unchanged.

## User flow

Pending details identify archive/restore, target and retained expected revision.
Explicit retry always uses the original operation/ID/revision. An explicit
"stop request" confirmation requests terminal resolution; it is not "undo archive"
or permanent deletion. After validated committed/cancelled acknowledgement,
compare-and-clear the matching journal and reload canonical history/balances.
Never auto-increment revision, merge changes, or dispatch a replacement action.

On response loss, authentication failure, malformed acknowledgement, storage
failure or payload conflict, retain the record. After refreshing current state,
the owner may explicitly choose a fresh action only after safe resolution.

## Required acceptance tests

- Archive/restore versus cancellation races: committed winner preserved or
  cancelled winner prevents delayed execution, with no double financial effect.
- Business-rejected restore later gains funds: cancellation still fences retry.
- Repeated resolution, lost response, reload, two tabs and stale journal cleanup.
- Wrong owner, CSRF, wrong route/operation/hash/revision and invalid response.
- Reallocation reversal/reapplication preserved; cancellation changes no balance,
  allocation, transaction revision or archive state.
- Current-state refresh after historical replay; existing create recovery unchanged.

## Current audit evidence / limitations

Command: `npx tsx --test --test-concurrency=1 tests/integration/frontendTransactionLifecycle.test.ts`.
Result: 7 tests passed, 7456 ms, dedicated local PostgreSQL test database only.
`git diff --check` passed. Build/type-check/browser not rerun for this test/docs-only
audit; prior evidence remains in `../walkthroughs/phase-7c3-lifecycle-recovery.md`.
No application API/UI behavior changed. Lifecycle actions remain disabled.
No commit/push. Approval is requested before implementing this contract extension.
