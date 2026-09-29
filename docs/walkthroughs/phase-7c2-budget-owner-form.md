# Phase 7C.2 — Connected Cash/NFC budget-owner form

Date: 2026-09-25. Bounded form integration delivered for PO review.
Full Phase 7C.2 remains partial; category and other pocket edit/lifecycle forms
are not implemented. Existing uncommitted work is preserved; no commit/push.

## Authority and scope

DEC-024/026/027, PR-003/007, backlog 2.2 and accepted setup/master-data contract.
Inspected DESIGN.md, Iteration 2 guidance and pocket screenshot, and the existing
local PocketDetail budget-owner picker. Cream/blue rounded-card design retained;
no raw Stitch HTML or local financial stores imported into connected mode.

- `BudgetOwnerForm.tsx`: active same-owner choices, excluding payment pocket;
  explicit "Pocket ini sendiri" maps to null, never a guessed default owner.
- Connected pocket cards expose the form only for Cash/NFC template roles.
  Only one form opens at a time; general refresh is disabled while editing.
- Submit freezes mutation ID, revision and selection. Concurrent submit is
  prevented synchronously; pending selection is disabled, network retry uses
  the same immutable request. No silent local writes or optimistic success.
- Conflict and validation/reference rejection require explicit Reload-only;
  no Keep Mine/merge/revision replacement. 401 expires the authenticated view.
- Confirmed success reloads canonical server data. If that GET fails, the
  error state does not show invented updated balances or successful reload.
- Historical transaction attribution and independent balances are unchanged.

## Reload and session behavior

Attempts live in component memory, not LocalStorage/sessionStorage. Pending
attempts register a beforeunload warning. Reload explicitly discards the form
and refetches server state; it never resends the abandoned attempt automatically.
The form text explains that reloading is a read, not cancellation or a new write.

Unlike category creation or additive transactions, this endpoint assigns a
property under atomic expectedRevision locking. If an old in-flight write and
a new edit after reload race on the same revision, at most one state-changing
write can succeed; the other conflicts. A no-op does not create financial
effects. This is not a durable offline mutation queue and must not be copied
as the recovery strategy for future create/transaction forms.

Session checks preserve the mounted form; confirmed expiry/logout unmounts it.
Late responses are ignored after unmount. On a network session-check error the
form is hidden/disabled until session revalidation, not re-created from defaults.

## Files

- `frontend/src/features/connected/BudgetOwnerForm.tsx`
- `frontend/src/features/connected/ConnectedPockets.tsx`
- `frontend/src/features/connected/ConnectedApp.tsx` (capability description)
- `backend/tests/browser/budgetOwner.cjs`
- Documentation index, state, sprint, handoff, integration plan and this evidence.

## Verification obtained

- Explicit frontend app/root `tsc --noEmit`, connected and ordinary `npm run build`
  passed. Default/local build produced last; no dependencies installed.
- `npm run dev:connected` starts on 127.0.0.1:5174.
- Native PostgreSQL readiness checked before tests. Browser fixture uses only
  `pocketflow_test_7c1_preview`; integration tests use a separate test database.
- `sessionPreview.ts --with-pockets` serves disposable preview data on loopback
  3000. `node tests/browser/budgetOwner.cjs` uses the bundled Playwright runtime
  (PLAYWRIGHT_MODULE_PATH) and a fresh headless Edge context, not a user profile.
- Browser checks passed: options/self exclusion, no-op save disabled, session
  check retains draft, mobile no horizontal overflow, lost committed response
  followed by exact-body retry, real revision conflict after a competing update,
  reload-only recovery preserving the competing value, explicit null mapping
  recovered after page reload without another PATCH, logout removes the form.
- NFC balance stays Rp82000 throughout mapping changes. No LocalStorage writes.
- No uncaught JS errors or console warnings. Expected resource errors: anonymous
  bootstrap 401, intentional aborted response, intentional 409 conflict, and
  externally blocked Google Fonts. Unexpected console errors fail the harness.
- Screenshots at 375/390/430px saved under ignored `backend/dist/qa-budget-owner`.
  The 375px screenshot was visually inspected: labels, select, amounts and
  buttons remain readable with fallback fonts. No PO manual acceptance claimed.
- Source/diff review completed; full-suite completion recorded below.

Full regression completed: `npm run test:integration` **266 passed, 0 failed,
26 suites**, 270.5 seconds. Backend `npm run typecheck` and `npm run build`
also passed. `git diff --check` passed with line-ending warnings only.
The disposable preview backend was stopped after QA; its database remains
available for repeated verification. No production service was stopped.

## Remaining scope

Review this Cash/NFC configuration checkpoint. Other pocket properties,
archive/restore and category create/edit/archive still remain in 7C.2.
No 7C.3 transaction integration, migration, hosting or sync started.
