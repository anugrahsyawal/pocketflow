# Phase 7C.3 — Batch frontend transport checkpoint

Date: 2026-10-17. Authority: DEC-036. Same approved phase; no new phase or Git delivery.

## Scope completed

- `frontend/src/lib/api/transactionBatch.ts`: typed expense-only batch requests,
  deep snapshots before awaits, 1–50 item validation, case-insensitive unique
  root/item IDs, safe amounts, valid dates/times, exact optional-null/omission and
  whitespace preservation. No budget-owner override or automatic ID generation.
- `frontend/src/lib/api/sessionClient.ts`: batch create and terminal resolution
  transport use existing owner preflight, credentialed requests, CSRF handling and
  bounded CSRF-only retry. No automatic retries for uncertain/business failures.
- Strict ordered acknowledgement validation checks count, identity, type, financial
  fields, original revision, timestamps, nullable topology, duplicate transaction
  IDs and unexpected fields. Accepts documented single/batch note semantics only.
- Stopped outcomes remain per-item committed/cancelled results, never a blanket
  cancellation. Acknowledgements are historical, not a replacement for canonical
  history or balances. This satisfies the transport portion of DEC-036/backlog 4.7.
- Added `backend/tests/integration/frontendTransactionBatch.test.ts` and
  `backend/tests/browser/transactionBatch.cjs`; status/index documentation updated.

## Verification actually obtained

- `npx tsc --noEmit` passed. Initial app build identified possibly undefined indexed
  items; explicit guards added, then both full builds passed.
- `npm run build` and `npm run build -- --mode connected`: passed.
- Five new integration tests / one suite passed against real loopback backend and
  disposable `pocketflow_test_7b4_windows` PostgreSQL database.
- Combined `npx tsx --test --test-concurrency=1` for frontendTransactionBatch,
  frontendTransactionCreate, frontendTransactionEdit, transactionBatchResolution:
  26 tests / 4 suites passed; zero failures, cancellations or skips (25236 ms).
- First integration attempt found PostgreSQL unavailable. Started the existing local
  installation, waited for readiness, and reran successfully. No application ledger reset.
- Preview: `npx tsx tests/helpers/sessionPreview.ts --with-pockets` with the dedicated
  `pocketflow_test_7c1_preview` fixture; backend on loopback port 3000.
- `npm run dev -- --mode connected --host 127.0.0.1 --port 5174 --strictPort` started
  but HTTP/browser access timed out. A host-level retry reported port in use. No
  existing process was killed. Separate host preview on port 5175 returned HTTP 200.
- `PREVIEW_URL=http://127.0.0.1:5175 node tests/browser/transactionBatch.cjs`, using
  bundled Playwright and headless Edge 375x844: passed. Lost response required
  explicit identical retry; ordered committed acknowledgement and stopped fences
  verified; reload displayed Rp1,000/Rp2,000 expenses and NFC Rp79,000. No page errors,
  unexpected console errors or LocalStorage writes. Expected 401/409 messages excluded.
- `git diff --check`: passed, line-ending notices only. Reviewed shared transport
  call sites: no existing UI invokes batch methods; legacy behavior is unchanged.
- Full 383-test backend regression was passed at the preceding backend checkpoint,
  not rerun here. Current result above is the targeted 26-test regression.

## Remaining scope and limitations

This is transport-only. Despite the initial broader continuation intent, the shared
journal is deliberately unchanged until all discriminated consumers and recovery
controls can be updated together. No batch request is dispatched from user-facing
UI, no second queue is introduced, and no storage migration occurs.

Next: extend the existing owner-scoped durable slot, validate batch records, update
all consumers, explicitly display mixed outcomes, and test reload/logout/storage
failure before enabling multi-entry capture. Browser evidence here is automated
transport QA, not manual acceptance of a batch form. No visual design changed, so
Stitch UI comparison is not applicable to this slice. Manual/mobile acceptance is
still pending. No commit/push; preserve earlier uncommitted Phase 7C.3 work.
