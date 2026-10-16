# Phase 7C.3 — Connected archive/restore UI

Date: 2026-10-01
Status: Local implementation and bounded QA complete; Product Owner review pending.

## Scope and requirements

Continuation of the existing dirty Phase 7C.3, authorized by PO's “lanjut” after
the lifecycle-resolution checkpoint. No new phase, commit, push, dependency,
schema change or backend behavior change in this slice.

PR-007/008, backlog 4.5 and DEC-033: history now exposes Archive and Restore with
explicit impact confirmation. Archive removes active financial impact; Restore
re-applies it under existing backend validation. No delete or edit UI is included.
Approved Stitch iteration-2 history screenshot and existing design tokens were
reviewed; controls reuse rounded surfaces, primary blue and existing buttons.

## Implementation / files

- `frontend/src/features/connected/useTransactionLifecycle.ts`: shared durable
  recovery orchestration. Prepare before dispatch, immutable revision/mutation ID,
  atomic cross-tab slot protection, matching acknowledgement before journal cleanup.
- `frontend/src/features/connected/ConnectedHistory.tsx`: per-row actions,
  confirmation including amount/date/pocket/time, focused recovery panel, explicit
  retry and server-confirmed terminal resolution. Filters still perform reads only.
- `frontend/src/features/connected/ConnectedPockets.tsx`: competing form locks and
  canonical master-data/history reload after success. No partial-page balance sums
  or optimistic financial updates. Reload resets filters to the existing defaults;
  enable “Sertakan transaksi diarsipkan” to locate archived records for Restore.
- `frontend/src/features/connected/TransactionCreateForm.tsx`: directs pending
  lifecycle recovery to History, while blocking new transactions.
- `frontend/src/features/connected/ConnectedApp.tsx`: capability footer updated.
- `backend/tests/browser/transactionLifecycleUi.cjs`: new UI regression scenarios.
- `backend/tests/browser/lifecycleRecovery.cjs`: old fixture assertion adapted to
  the now-disabled create recovery button while lifecycle is pending. This older
  transport-orchestrated script was not rerun in this slice; new UI QA covers it.
- Documentation index, current state/sprint/handoff, integration plan and this file.

Cross-tab prepare returning an existing attempt never dispatches it automatically.
Conflicts, business errors, missing responses and reload never change revision or
erase a pending request. Resolution preserves already-committed results; it does
not undo financial changes. Storage errors block writes and offer reinspection.

## Verification actually obtained

- Frontend `npx tsc --noEmit`, `npx tsc -p tsconfig.app.json --noEmit`: passed.
- `npm run build` and `npm run build -- --mode connected`: passed on final source.
- `npm run dev -- --mode connected --host 127.0.0.1 --port 5174`: started.
- PostgreSQL was initially stopped; existing local installation restarted normally
  with pg_ctl. Disposable preview and dedicated integration DB only were used.
- `npx tsx --test --test-concurrency=1 tests/integration/frontendTransactionLifecycle.test.ts tests/integration/frontendTransactionRecovery.test.ts`:
  **21 tests / 3 suites passed**, zero failures/skips (25599 ms).
- `node tests/browser/transactionLifecycleUi.cjs`: passed on isolated headless Edge
  against disposable live backend. Checks cancel-before-send; archive/restore
  canonical NFC balances (82k → 100k → 82k); archive response lost after real commit;
  reload without auto-send; identical-ID retry; injected revision/business rejection
  retained across reload; resolution response lost after real server fence; explicit
  resolution retry and cleanup; competing create-form lock; console and local storage.
  Backend integration tests provide real conflict/business-rule coverage; browser
  409/422 responses are deliberately injected to exercise UI recovery branches.
- `node tests/browser/expenseCreate.cjs`: passed, preserving expense creation,
  cancellation, committed acknowledgement and reload/retry regression behavior.
- Mobile widths 375/390/430: no horizontal document overflow. Confirmation screenshots
  saved in ignored `backend/dist/qa-lifecycle-ui/`; 375px screenshot visually inspected.
  Automated browser/console QA plus screenshot inspection, not manual PO acceptance.
- `git diff --check`: passed with line-ending warnings only. Source/diff reviewed.
- Full 336-test run remains the previous 2026-09-30 checkpoint; not rerun today.
  Backend build/typecheck not rerun because backend production source is unchanged.

## Limitations / recommended review

Review in connected development mode: archive a test expense and confirm balance
change; include archived transactions and restore it; cancel a confirmation and
verify no change. Existing normal/local mode is separate and unchanged. Uncertain
attempts must be retried/resolved in History, never cleared by deleting site data.

No permanent delete, edit, batch, offline queue, production deployment or data
migration added. Phase 7C.3 as a whole is not declared complete. Further transaction
integration needs a bounded follow-up after this review.

Git: `git status --short` shows M/?? for ongoing source/tests/docs, all unstaged.
No commit or push. Disposable preview is stopped after QA; local Vite/PostgreSQL
remain running for continued development.
