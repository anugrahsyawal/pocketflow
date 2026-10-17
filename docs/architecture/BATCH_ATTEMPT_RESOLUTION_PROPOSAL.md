# Phase 7C.3 — Batch recovery proposal

Date: 2026-10-17
Status: Accepted for implementation by Product Owner continuation (DEC-036).
Exact backend contract is recorded in TRANSACTIONS_API_CONTRACT.md; delivery
acceptance remains pending. Historical proposal rationale below is retained.

## Scope and authority

Backlog 4.7 and DEC-030 approve atomic multi-entry expenses (1–50 items).
DEC-032–035 do not authorize batch resolution. This proposal covers that missing
recovery capability within 7C.3, not export, offline sync, migration or deployment.
Existing local-mode behavior and accepted UI design remain unchanged.

## Existing behavior audited

Source: `backend/src/routes/transactions.ts`, batch handler, and
`backend/src/lib/idempotency.ts`. New integration characterization:
`backend/tests/integration/transactionBatchRecoveryAudit.test.ts`.

- New batch writes and their idempotency records are atomic. Insufficient funds
  rolls them back, but does not permanently prevent the same request executing
  later after funds arrive. A rejection alone is not a terminal cancellation.
- An item already committed through single-create can be adopted by a later batch.
  If that batch fails, the previously committed item remains. Therefore an absent
  root record does NOT prove that every item is uncommitted.
- Successful replay returns original ordered acknowledgements, not current rows.
  Later edits require a separate canonical history/pocket refresh.
- Source-only schema drift: batch validation accepts null categoryId/note although
  the published batch schema specifies optional UUID/string. PATCH null-clearing
  approval does not resolve this create/batch discrepancy.

## Recommended bounded contract

1. Add an explicitly confirmed batch-resolution operation accepting the complete
   original batch, including root ID, ordered item IDs and original optional fields.
   Never generate replacement IDs, reorder items or normalize a pending payload.
2. Authenticate owner and validate CSRF. Use the same owner-scoped, deterministically
   ordered root-and-item mutation locks as batch execution, in one SQL transaction.
3. A committed matching root returns the validated original ordered acknowledgement.
   Any mismatched identity/hash or malformed stored acknowledgement fails closed;
   do not clear the journal or expose another owner's records.
4. If the root is absent, preserve already committed matching items and permanently
   fence the root and all unexecuted items atomically. Existing matching fences are
   preserved. Do not delete, archive, reverse or re-create committed expenses.
5. Distinguish a fully committed batch from a stopped batch. A stopped response must
   explicitly identify each original item as committed or cancelled, with original
   acknowledgements for committed items. Never describe a mixed result as “nothing
   was saved”. Persist the terminal result so repeated resolution is stable.
6. Existing single-create and batch execution must respect these same fences.
   Resolution must not depend on today's balance, category activity or period.
7. Extend the existing single owner-scoped durable journal, not a second queue.
   Persist before dispatch; disable conflicting writes while unresolved; offer only
   explicit identical retry or confirmed stop. Clear only after validating the full
   matching terminal result. Refresh canonical data separately after resolution.
8. For new client requests, omit absent optional fields under the current schema.
   Before implementation, explicitly settle null compatibility for create/batch;
   recommendation: document existing null acceptance for these optional fields,
   without changing omission semantics or pending-request hashes. This is proposed,
   not an extension of DEC-035 by inference.

Exact endpoint schemas, error codes and journal version will be finalized under
the approval gate before production code changes. No new dependency is proposed.

## Verification required before enabling connected batch UI

- Concurrent submit/resolve and single-item reuse: exactly one terminal outcome;
  no new writes after cancellation, no duplicate deductions, no partial fencing.
- Root absent with all/some/no committed items; existing cancelled items; invalid
  stored response; cross-owner, CSRF and mismatched payload failures.
- Lost responses, reload, logout/login, storage failure and explicit identical retry.
- Original acknowledgement after later edit/archive/delete; refresh failure must
  not erase the terminal outcome or substitute stale acknowledgement as current data.
- Atomic balance checks, Cash/NFC budget ownership, 26–25 period rules unchanged.
- Frontend typecheck, both builds, runtime console, mobile/keyboard manual review
  and walkthrough evidence before delivery acceptance.

## Approval requested

Approve this bounded recovery design and optional-field reconciliation, then
implement and verify backend contract first, shared recovery second, connected
multi-entry UI last. Delivery acceptance remains a separate review.
