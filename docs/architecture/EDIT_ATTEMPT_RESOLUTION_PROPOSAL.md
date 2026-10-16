# Edit transaction integration — bounded proposal

Date: 2026-10-04
Status: Accepted on 2026-10-04 (DEC-035). Canonical contract is
TRANSACTIONS_API_CONTRACT.md sections 4.0.3 and 7.2.4. Proposal-time wording below
is retained as decision history; delivery verification is separate.
Scope: Existing expense/income/transfer edits within Phase 7C.3, not batch or sync.

## Evidence and authority

Backlog 4.4 and DEC-024/030 approve transaction editing, retained expense budget
attribution unless payment pocket changes, and unchanged revision on no-op PATCH.
DEC-032/033/034 do not cover edit resolution. Existing API section 7.2.4 supports
PATCH but the frontend has no connected edit transport, durable journal or form.

Three tests in `backend/tests/integration/transactionEditRecoveryAudit.test.ts`
verify existing behavior without changing production code:

1. Fixture NFC expense 18k and total available NFC funds 100k. PATCH to 110k fails
   INSUFFICIENT_FUNDS; target/revision remain unchanged. After 20k income, the exact
   same PATCH ID/revision succeeds. A rejection is not durable cancellation.
2. No-op PATCH retains revision 1. After a different edit reaches revision 2,
   replay of the first PATCH returns its original revision-1 acknowledgement,
   not current state. Canonical refetch is mandatory after replay.
3. Omitted category is preserved; categoryId:null explicitly clears it. Note-only
   and category-only edits retain the stored budgetPocketId. IncomeSource:null
   clears the source. The implementation accepts these nullable optional fields,
   while the written PATCH schema only explicitly permits null for note.

## Decisions recommended for approval

### A. Reconcile optional-field clearing

Update ONLY the PATCH schema to allow categoryId as UUID or null and incomeSource
as an existing allowed label or null. Omission means preserve; null means explicitly
clear. Keep note's existing nullable semantics. This aligns the contract with
tested behavior and optional fields without adding a new product feature.

Do not permit null pocket/amount/date/time/transferType; do not extend create schema
by analogy. Keep expense category scoped to payment pocket. When changing payment
pocket, require a valid category for that pocket or explicit clearing, never silently
carry a mismatching old category. No editable budgetPocketId or transaction type.

### B. Extend terminal resolution to edit

Add a strict edit variant to existing
`POST /v1/transactions/:id/resolve-attempt`:

```text
{operation:'edit', clientMutationId, expectedRevision, changes:{...}}
```

`changes` contains at least one mutable field allowed by PATCH; rejects unknown
fields/type/budgetPocketId/IDs for mutation or revision. Use the same PATCH shape
validation (including omission/null distinction) without applying business writes.
Compute identity from ORIGINAL `PATCH /v1/transactions/:id` and flattened body
`{clientMutationId, expectedRevision, ...changes}`, not from the wrapper. No trimming
or dropping null values while reconstructing that hash. Auth/CSRF and existing
owner/mutation advisory lock apply; enforce positive safe revisions and UUID v4.

- Matching successful/no-op PATCH: return status committed and original complete
  `{transaction:...}` acknowledgement, with original mutation ID. Do not undo it.
- No execution record: write permanent MUTATION_CANCELLED fence and return cancelled.
  Subsequent matching PATCH cannot execute, even if funds/references later change.
- Matching fence: stable cancelled. Different hash/method/path: IDEMPOTENCY_CONFLICT.
- Invalid stored acknowledgement: fail closed. Preserve original result even if
  the transaction was subsequently edited/archived/deleted; do not recreate it.
- Cancellation does not require target existence/current business conditions and
  changes no financial data, revision, allocation or audit metadata. It stops only
  this attempt; it does not assert anything about current target state.

## Client and UI implementation after approval

1. Add narrow typed edit transport for existing mutable fields, immutable snapshot,
   ownership preflight, existing CSRF retry policy and strict DTO validation.
   Validate target/type, revision equal to original or original+1 for no-op/change,
   and supplied values using documented server normalization only. Treat replay as
   original acknowledgement; never overwrite canonical current state with it.
2. Extend the SAME owner IndexedDB slot with operation edit, original transaction
   type for client validation, target ID and exact PATCH body. Preserve legacy records;
   update every discriminated consumer before accepting edit records. No second queue.
3. Prefill from canonical server transaction. Keep type fixed. Allow existing fields
   appropriate to expense/income/transfer. Preserve immutable historical budget owner
   unless payment pocket actually changes; backend remains attribution authority.
   Reallocation amount/date/pocket changes remain subject to server allocation checks
   in their 26–25 periods; no local financial recomputation.
4. Unsaved form can be cancelled. After durable dispatch lock its body/ID/revision.
   Reload/logout retain it, with explicit same-ID retry or confirmed stop. A conflict
   never auto-increments revision or merges; resolve then refetch before a fresh edit.
5. Validate terminal result before matching compare-and-clear, then reload canonical
   history/balances. Bad response, storage/network/auth error or list absence retains
   recovery. No automatic resend or site-data deletion as an escape hatch.

Use existing approved Stitch/design tokens and form primitives, not a redesign.
Existing create/archive/restore/delete behavior remains unchanged. Reject unsupported
fields instead of inferring new product decisions from legacy frontend behavior.

## Verification gate

Transport/parser tests for all three types, forbidden fields, optional null/omission,
owner and CSRF isolation, unchanged budget attribution, pocket change validation,
note/time normalization, no-op and historical replay; lost response and strict
acknowledgement checks. Include reallocation date/amount/pocket transitions.

Resolution tests: PATCH versus fence race, business-rejected edit later gains funds,
committed/no-op preservation after later changes/deletion, wrong hashes/revisions,
malformed envelope and non-financial cancellation invariants.

Real IndexedDB/browser tests: all operation collisions, legacy/corrupt storage,
reload/logout, explicit retry/stop, stale cleanup, conflict, mobile accessibility,
canonical refresh and regressions for other forms. Full integration suite, frontend
type-check/builds, backend checks, source/diff review and walkthrough before acceptance.

## Approval boundary and audit evidence

Approval authorizes finalizing the two bounded contract changes and implementing
edit transport, resolution, durable recovery and UI under these gates. It does not
authorize batch resolution, offline sync, new editable fields, deployment, migration,
a new phase or commit/push. PO acceptance of delivery is a separate step.

Audit command: `npx tsx --test --test-concurrency=1 tests/integration/transactionEditRecoveryAudit.test.ts`.
Result: 3 tests / 1 suite passed, zero failures/skips (3365 ms), dedicated local test
database only. Test income/edits touch disposable fixtures, not personal records.
Production source unchanged this turn, so build/type-check/browser were not rerun.
Prior 351-test checkpoint remains historical evidence, not this audit's test count.
`git diff --check` passed. Changes are the audit test, this proposal and documentation
pointers/status; Git remains M/?? ongoing 7C.3 work, no commit/push.
