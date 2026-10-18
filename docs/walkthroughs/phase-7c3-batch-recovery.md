# Phase 7C.3 — Shared batch recovery checkpoint

Date: 2026-10-17–18 (Asia/Jakarta). Authority: DEC-036, continuation after requested commit/push.

## Git delivery before continuation

Prior backend/transport and audit checkpoint committed as `48bc98c` (18 files),
pushed to `origin/codex/audit-pocketflow-documentation`. HEAD and upstream matched;
working tree was clean before this continuation. No history rewrite or unrelated
files staged. Earlier no-commit labels remain historical checkpoint descriptions.

## Delivered in this continuation

- `transactionAttempt.ts`: version-one `operation: batch` uses the SAME owner-keyed
  IndexedDB slot. Strict detached parsing preserves root/item IDs, ordered fields,
  explicit nulls and whitespace. No migration, automatic sender or second queue.
- `useTransactionLifecycle.ts`: existing recovery dispatcher handles explicit batch
  retry/confirmed stop. Validated terminal results precede guarded journal cleanup.
  Each committed/cancelled item is reported separately; no blanket cancellation.
- `ConnectedHistory.tsx`: read-only original items, bounded scroll, retry and stop
  confirmation controls using existing cards/colors/buttons; no new capture form.
- `TransactionCreateForm.tsx`: batch is recognized as a competing operation; no
  create dispatch or misleading transaction-revision field for a batch record.
- `ConnectedPockets.tsx`: multiline terminal notice wraps long IDs and survives a
  failed canonical refresh; historical results are explicitly distinguished from
  current transaction state.
- Parser tests and `backend/tests/browser/batchRecovery.cjs` added/extended.
  DEC-036/backlog 4.7 recovery requirements addressed without changing money rules.

## Verification

- `npx tsc --noEmit`, `npm run build`, `npm run build -- --mode connected`: passed.
- Targeted `npx tsx --test --test-concurrency=1` with frontendTransactionRecovery and
  frontendTransactionBatch: 14 tests / 4 suites passed, no failures/skips (9878 ms).
  Uses disposable `pocketflow_test_7b4_windows` for API tests.
- Existing Vite connected dev preview at 127.0.0.1:5175 and disposable backend on
  port 3000 verified HTTP 200. No application ledger reset.
- Edge headless browser recovery checks: shared slot refuses competing create,
  wrong/reordered cleanup is rejected, reload/logout retains exact payload, no
  automatic sends, response loss then identical explicit retry, confirmed mixed
  stop, storage failure blocks writes, widths 375/390/430 have no horizontal overflow.
- Initial browser run passed; extended refresh-failure simulation initially used
  the wrong intercepted URL (without includeArchived). Fixed test URL and reran;
  final extended result is recorded below. This was a test harness correction.
  The next run completed behavioral assertions but flagged external Google font
  timeouts. Console filtering now separately identifies those exact font-host
  timeout/access errors, without suppressing application resource errors.
- Screenshot of pending panel inspected at mobile width: item details and buttons
  readable, wrapped text, existing blue/white recovery tokens retained. Iteration-2
  history reference inspected; no raw HTML copied or redesign introduced.
- Runtime console: no page errors in initial passing run; expected injected network
  errors and 401 are separated from unexpected errors by the browser test.
- Final extended browser run passed, including guarded cleanup and terminal notice
  retained across failed canonical refresh then successful reload. No page errors
  or unexpected application console errors. External font timeout/access errors
  are an environment limitation, not claimed as successful font loading.
- `git diff --check` passed, Windows line-ending notices only. Source review checked
  every consumer of the recovery discriminant; batch is not treated as lifecycle ID.

## Remaining gate

Next: connected multi-entry capture/form and confirmation, then full flow review.
This checkpoint only recovers already prepared batch records (test fixtures supply
them); no user-facing new-batch form is enabled yet. No automatic migration, offline
queue, export, deployment or new phase. Automated browser and screenshot review do
not replace Product Owner manual acceptance. Full backend suite not rerun for this
frontend slice; prior 383-test result remains historical.

Changes in this continuation are uncommitted; only the preceding checkpoint was
committed/pushed under the user's request.
