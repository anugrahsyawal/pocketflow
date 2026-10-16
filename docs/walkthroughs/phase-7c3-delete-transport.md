# Phase 7C.3 — Permanent-delete transport

Date: 2026-10-01
Status: Transport checkpoint; durable delete recovery and UI remain gated.

## Scope and authority

PO requested continuation after archive/restore UI. This bounded slice implements
the already approved DELETE contract section 7.2.7, PR-008, backlog 4.5 and
DEC-022/030. No new destructive UI, backend route/schema, dependency, migration,
production operation or phase. Existing dirty 7C.3 work is preserved.

## Files and behavior

- `frontend/src/lib/api/sessionClient.ts`: explicit TransactionDeleteRequest and
  validated acknowledgement. Required literal confirmation, owner/transaction/
  mutation UUIDs, positive safe revision and strict field allowlist. Request copied
  before awaiting session preflight; owner is not sent as a body field. Shared
  owner/CSRF request helper now supports DELETE while preserving POST defaults.
- `backend/tests/integration/frontendTransactionDelete.test.ts`: eight cases for
  active/archived deletion, idempotent replay, lost response/CSRF rotation, immutable
  snapshot, invalid confirmation/input, foreign owner, conflicts, malformed response
  and reallocation rejection becoming executable later with the same ID.
- `backend/tests/browser/transactionDelete.cjs`: isolated browser transport test
  on disposable preview data; no production UI dispatch.
- Index, current state/sprint/handoff, integration plan and this walkthrough.

Success requires success=true, the exact target ID, canonical valid deletedAt and
no unexpected fields. Missing list row/404 is never interpreted as acknowledgement.
No retry on network/business/conflict errors; only existing explicit CSRF rejection
refresh can retry automatically after rechecking owner. Caller must refetch current
state because replay is an original acknowledgement, not a new financial event.

## Verification

- Frontend `npx tsc --noEmit`, `npx tsc -p tsconfig.app.json --noEmit`,
  `npm run build`, `npm run build -- --mode connected`: passed.
- Targeted integration command:
  `npx tsx --test --test-concurrency=1 tests/integration/frontendTransactionDelete.test.ts tests/integration/frontendTransactionLifecycle.test.ts`.
  **22 tests / 2 suites passed**, zero failures/skips (31468 ms), on the dedicated
  PostgreSQL test database, not user data. The added reallocation fixture initially
  hit insufficient bank funds, then sat exactly at the allocation floor. Supplied
  test income without changing allocation and raised the test expense above the
  floor; rerun now proves the intended rejection and later same-ID success.
  No production fix was required for these fixture corrections.
- `node tests/browser/transactionDelete.cjs`: passed against disposable live API
  and running connected Vite server on 5174. Real DELETE commits then test transport
  loses response; explicit identical retry receives acknowledgement. New-ID delete
  gets 404. Reload shows NFC balance 100k and removes expense even from archived
  listing. No delete button, financial LocalStorage writes, unexpected page errors
  or console errors. Auth401, deliberate404 and denied external fonts are filtered.
- Existing development server reused. Automated headless Edge QA, not manual PO
  acceptance; no visual change needing a new Stitch redesign or screenshot.
- Source/diff reviewed; `git diff --check` passed (line-ending warnings only).
- Full suite and backend build/typecheck not rerun; backend production source is
  unchanged in this continuation. Previous 336-test result remains historical.

## Required next gate

Do not enable a delete button yet. The shared durable journal supports only create,
archive and restore. DEC-032/033 terminal resolution explicitly excludes delete.
An allocation-rejected delete can execute later after financial conditions change,
so a rejected attempt cannot simply be discarded, revised or replaced. Review a
bounded delete recovery/terminal-exit design before extending contract or UI.
Keep Archive the normal reversible action. User-facing permanent deletion must
remain a separate explicit confirmation and cannot be presented as recoverable.

Git: ongoing M/?? source/tests/docs, unstaged; no commit/push or history changes.
Only disposable fixture transactions were deleted for tests; they are regenerable
with the test fixture helper. No personal transactions were touched.
