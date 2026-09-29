# Phase 7C.2 — Connected category label editing

Date: 2026-09-25. Category name/emoji PATCH form delivered for PO review.
This is a continuation of the existing uncommitted phase, not its completion.

## Scope and requirements

Backlog 3.2, PR-004/007, DEC-026/027, accepted master-data PATCH contract and
frontend integration plan. Existing local CategoryManagementPage and shared
Input/Button patterns were inspected alongside the retained Iteration 2 design
guidance. The existing cream/blue cards and inline category area are reused.
No raw Stitch HTML, new dependency, backend endpoint or schema change.

- `CategoryEditForm.tsx`: edit an existing category's name and emoji from its
  pocket's category section. One editor at a time across pocket/category forms.
- `SessionClient.editCategory`: allowlisted fields, UUID/revision validation,
  trimmed labels, Unicode code-point limits (100 name, 32 emoji), validated
  acknowledgement and one retry only for explicit CSRF rejection.
- Stable immutable attempt until acknowledgement or explicit reload. Pending
  fields/general refresh are disabled. Network failure is not reported as saved.
- Conflict uses Reload-only; no silent overwrite, merge, revision bump or new ID.
  Invalid server references also require reloading. Local validation preserves
  editable input and clears the obsolete error when the user edits again.
- Cancel discards only unsent input. Logout/401 clears mounted editor state.
- Reload after an uncertain result reads canonical data and never automatically
  resubmits. Pending attempts warn before unload. Revision-controlled property
  assignment prevents competing stale writes from overwriting newer revisions.
  This is not a persistent offline/create-operation recovery mechanism.
- Category identity, parent pocket, default flag and ledger references are not
  editable here. Historical transactions and balances are not rewritten.

## Files

- `frontend/src/lib/api/sessionClient.ts`
- `frontend/src/features/connected/CategoryEditForm.tsx`
- `frontend/src/features/connected/ConnectedPockets.tsx`
- `frontend/src/features/connected/ConnectedApp.tsx`
- `backend/tests/integration/frontendCategoryEdit.test.ts`
- `backend/tests/browser/categoryEdit.cjs`
- Current delivery documents and this walkthrough.

## Verification

- `npm run test:integration`: **271 tests passed, 0 failed, 28 suites**, 209.8s.
  Five new cases cover trimming/Unicode limits, same-ID replay, parent/default
  and transaction preservation, revision conflicts, owner isolation, response
  loss after commit, CSRF rotation, malformed response and unsafe path rejection.
- Frontend app/root `npx tsc --noEmit`, connected and ordinary builds passed;
  repeated after the validation-message polish. Default/local build last.
- Backend `npm run typecheck` and `npm run build`: passed.
- Existing connected Vite dev server used at 127.0.0.1:5174; fixture backend
  `sessionPreview.ts --with-pockets` at loopback 3000.
- Separate databases: integration `pocketflow_test_7b4_windows`, browser fixture
  `pocketflow_test_7c1_preview`. Fresh headless Edge context via bundled Playwright;
  no owner development data/browser profile used or dependency installed.
- Browser script verifies: blank validation; stale error cleared on editing;
  unchanged-save disabled; session check retains draft; cancel restores server
  value; lost committed response retries identical payload; canonical trimmed
  label; real competing update causes 409 and Reload-only; reload after another
  lost response reads the committed label without another PATCH; logout clears
  editor. NFC remains Rp82000. No LocalStorage writes.
- Screenshot/overflow checks at 375/390/430px, saved to ignored
  `backend/dist/qa-category-edit`. Direct screenshot inspection checked the
  375px card, field labels, buttons and spacing. Screenshot review identified
  obsolete validation text and led to its cleanup/retest.
- No uncaught JS errors or console warnings. Expected console resources: initial
  anonymous 401, intentionally aborted request, intentional 409, and externally
  blocked Google Fonts (fallback fonts used). Unexpected errors fail the harness.
- Source review and `git diff --check` passed (line-ending warnings only).
- One repeat browser run timed out because the harness expanded the old card
  before refresh completed. The harness now waits for the canonical updated
  label to be attached before opening its disclosure; the final full browser
  rerun passed. This timing failure is not counted as a successful run.
- Disposable preview backend stopped after QA; frontend dev server remains.
  Backend must be restarted for another connected-mode preview.

## Remaining work

Review this edit-label slice; adding categories, archive/restore and other pocket
property/lifecycle forms remain pending. Those operations are not exposed here.
No migration, sync queue, deployment, transaction phase, commit or push.
Working tree is modified/untracked with this and earlier 7C.2 checkpoints.
