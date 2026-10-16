# Delete attempt recovery — bounded extension proposal

Date: 2026-10-01
Status: Accepted on 2026-10-04 (DEC-034). Canonical contract: TRANSACTIONS_API_CONTRACT.md
section 4.0.2. Proposal-time wording below is retained as decision history.
Scope: Permanent-delete attempt recovery inside existing Phase 7C.3 only.

## Findings and existing authority

PR-008, backlog 4.5 and DEC-022/030 authorize a separately confirmed permanent
delete. DEC-032/033 terminal resolution does not authorize delete. The existing
DELETE transport is verified but not wired to a button or durable recovery record.

The integration test demonstrates a non-terminal business rejection: transfer 30k
allocation from Food to Transportation (allocation 230k), supply test income so
bank funds suffice, spend 210k from Transportation, then attempt to delete the
reallocation. Deletion is rejected by the allocation floor. Archive that expense;
the original DELETE ID/body now succeeds, although its target revision never
changed. Therefore a 422 response is not a durable cancellation.

The purge audit also checks that a committed DELETE replays its original
acknowledgement after its tombstone has been purged. Idempotency records reference
the owner, not the transaction row; the current purge worker does not delete them.
The 30-day tombstone period is NOT a user recovery window for permanent deletion.
Neither absence from a filtered list nor a new-ID 404 proves an old attempt's result.

## Recommended bounded contract extension

Extend existing `POST /v1/transactions/:id/resolve-attempt` with a strict delete
variant, retaining archive/restore behavior unchanged:

```json
{
  "operation": "delete",
  "clientMutationId": "<original UUID v4>",
  "expectedRevision": 1,
  "confirmPermanentDelete": true
}
```

Authentication and CSRF remain required. Owner comes only from the session.
Path/mutation IDs must be UUID v4; revision must be a positive safe integer.
Require literal true for delete and reject extra fields. Archive/restore variants
must still reject confirmPermanentDelete. Never infer or insert confirmation into
a missing/invalid original request.

Hash the ORIGINAL `DELETE /v1/transactions/:id` and its original body containing
clientMutationId, expectedRevision and confirmPermanentDelete; do not hash the
resolution wrapper. Acquire the same owner/mutation lock used by DELETE.

- Matching committed DELETE: 200 `{status:'committed', clientMutationId,
  acknowledgement:{success:true, deletedTransactionId, deletedAt}}`, returning the
  original stored acknowledgement even after purge. Never recreate the transaction.
- No execution record: persist a permanent non-financial MUTATION_CANCELLED fence,
  then 200 `{status:'cancelled', clientMutationId}`. This means THIS request cannot
  execute later; it does not assert that the transaction still exists or is active.
- Matching cancellation fence: return the same cancelled result.
- Different method/path/body hash: 409 IDEMPOTENCY_CONFLICT, never cancellation success.
- Invalid stored acknowledgement: fail closed; do not clear client recovery.

No transaction existence/business checks are needed to stop an unexecuted attempt;
no foreign transaction information is disclosed. Cancellation changes no financial
data, allocation, revision, tombstone or audit metadata. Use existing idempotency
table with no expiry for fences; no dependency/migration is planned. A race has one
terminal winner: committed result preserved, or delayed DELETE prevented. No undo.

## Durable client record and UX

Use the existing owner-scoped shared IndexedDB slot, not a second delete queue.
Proposed version-one discriminated record:

```text
{version:1, ownerId, operation:'delete', transactionId,
 body:{clientMutationId, expectedRevision, confirmPermanentDelete:true}}
```

Strictly validate/copy it; preserve existing create/archive/restore records. Update
ALL consumers to distinguish delete explicitly before accepting this record:
current non-create branches must not mislabel it as restore or pass it to lifecycle
transport. An older client must fail closed, not erase an unknown operation.

1. Present separate destructive confirmation identifying the transaction and that
   permanent deletion cannot be restored. Archive remains the usual removal action.
2. Persist exact confirmed attempt before DELETE. Concurrent prepare cannot
   overwrite another operation or dispatch an unconfirmed existing attempt.
3. On lost response/reload/logout, retain record without automatic sending.
   Explicit retry uses the same ID, revision and confirmation.
4. Offer an explicitly confirmed “Hentikan permintaan hapus”, clearly distinct from
   undo: already-deleted data stays deleted; unexecuted attempt is fenced.
5. Validate terminal ID/status and full matching delete acknowledgement, then
   compare-and-clear only the same record. Refresh canonical data; do not calculate
   balance changes locally or equate historical replay with current state.
6. On storage/auth/network/conflict/invalid acknowledgement, retain recovery.
   Never auto-increment revision, generate replacement ID or clear site data.

## Required verification before UI enablement

- Concurrent DELETE/resolution, repeated calls and same-key cross-operation conflicts.
- Rejected reallocation DELETE then allocation changes: a fence still blocks it.
- Committed resolution after tombstone purge; replay never recreates data.
- Missing/foreign target, wrong owner, CSRF, missing/false confirmation, bad IDs,
  unsafe revisions, extra fields and wrong acknowledgement shape.
- Unchanged balances, allocations, revision and audit data on cancellation.
- Real IndexedDB cross-tab create/archive/restore/delete collision, legacy record
  compatibility, corrupt storage, reload, logout and compare-and-clear failures.
- Browser confirmation/retry/stop, canonical refresh, mobile layout/console and
  regression of existing create/archive/restore workflows.

## Approval boundary

Approval would authorize finalizing the delete variant contract and implementing
server resolution, durable client recovery and explicit UI within 7C.3, with the
above verification gates. It does not authorize edit/batch resolution, offline
sync, restoring deleted records, retention changes, production deployment, actual
personal-data deletion, a new phase, commit or push. Delivered acceptance remains
separate. Until approved, only tests/docs change and no delete UI is enabled.

## Audit evidence

`npx tsx --test --test-concurrency=1 tests/integration/frontendTransactionDelete.test.ts`:
9 tests / 1 suite passed, zero failures/skips (10450 ms), dedicated local PostgreSQL
test database. The new purge test deletes only a disposable fixture record and
simulates time 31 days after its deletion; identical retry returns its original
acknowledgement, fresh ID returns NOT_FOUND, balance remains unchanged. Fixture
data is regenerable; no personal data was removed. Existing business-rejection
reproduction also passed again.

Modified this continuation: frontendTransactionDelete.test.ts, this proposal,
documentation index, current state/sprint/handoff, decision-log pending list and
integration-plan pointer. `git diff --check` passed (line-ending warnings only).
No production source edits; build/type-check/browser not rerun for this test/docs
audit. Earlier transport/UI verification remains checkpoint evidence, not a new
manual verification claim. Git remains M/?? ongoing 7C.3 work, no commit/push.
