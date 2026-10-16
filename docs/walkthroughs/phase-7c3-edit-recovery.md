# Phase 7C.3 — Shared edit recovery

Date: 2026-10-16. DEC-035 continuation; not full feature/phase acceptance.

## Scope and files

- `frontend/src/lib/api/transactionAttempt.ts`: strict edit variant in existing
  version-one owner IndexedDB slot. Original type, transaction ID, revision,
  mutation ID and exact flattened PATCH fields retained; existing records unchanged.
- `frontend/src/features/connected/useTransactionLifecycle.ts`: explicit edit
  retry and terminal resolution dispatch; validated result before matching cleanup
  and canonical reload. Existing create/archive/restore/delete branches preserved.
- `frontend/src/features/connected/ConnectedHistory.tsx` and
  `TransactionCreateForm.tsx`: correct edit recovery labels and stop explanation;
  competing creates remain blocked. No new edit entry form/button.
- `backend/tests/integration/frontendEditRecovery.test.ts`: four parser tests.
- `backend/tests/browser/editRecovery.cjs`: disposable IndexedDB/UI recovery tests.
- Documentation index/state/sprint/handoff updated.

Fulfills approved immutable recovery and owner isolation requirements without new
dependencies, schema migration, local-store import, offline queue or deployment.
Original whitespace/nulls/omissions survive; no automatic resend, revision merge,
replacement mutation ID or current-state reconstruction of historical intent.

## Verification

- `npx tsx --test tests/integration/frontendEditRecovery.test.ts tests/integration/frontendTransactionRecovery.test.ts`:
  11 tests / 3 suites passed, no failures.
- `npx tsc --noEmit`, `npm run build`, `npm run build -- --mode connected`: passed.
- `npm run dev -- --mode connected --host 127.0.0.1 --port 5174 --strictPort`:
  running. Initial sandbox loopback access failed; restarted own preview with
  approved loopback access. Existing PostgreSQL restarted, not reinstalled.
- Preview uses only `pocketflow_test_7c1_preview`; integration suite uses separate
  `pocketflow_test_7b4_windows`. No personal/production database touched.
- `node tests/browser/editRecovery.cjs`: passed in Edge 375x844, twice. Tests real
  IndexedDB collision with create/archive/restore/delete, stale cleanup rejection,
  reload/logout retention without automatic PATCH, explicit UI retry and canonical
  refresh, confirmed stop then delayed PATCH returning MUTATION_CANCELLED. No page
  errors or LocalStorage writes; no unexpected console errors on final run.
- `node tests/browser/transactionRecovery.cjs`: passed. Existing two-tab atomic
  prepare, owner isolation, legacy records, stale/wrong-operation cleanup and
  corrupt/unavailable storage regressions remain intact; zero API writes.
- `npm run test:integration`: 370 tests / 43 suites passed, zero failures/skips
  (222487 ms).
- `git diff --check`: passed (line-ending notices only).
- Source review: every existing non-create consumer dispatches edit explicitly;
  exact body is validated through the transport snapshot validator. No DB upgrade.
- No manual browser or Product Owner acceptance claimed; edit form remains absent.

## Next and Git

Implement edit form from canonical transaction, fixed type and server-owned budget
attribution; durable prepare before dispatch, confirmation, conflict handling and
UI regressions remain required. Review this as a recovery checkpoint, not a complete
edit capability. Working tree retains M/?? ongoing 7C.3 work; no staging/commit/push.
