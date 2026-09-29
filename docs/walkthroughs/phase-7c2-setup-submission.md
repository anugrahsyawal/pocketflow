# Phase 7C.2 — Connected setup submission

Date: 2026-09-19. Implementation, HTTP integration and isolated browser QA delivered;
**PO review pending; full Phase 7C.2 remains incomplete**. This continues the
same uncommitted 7C.2 phase, not a new phase. No commit or push in this continuation.

## Scope and authority

Approved frontend integration plan, setup/master-data contract, DEC-024/027/031.
Connected development mode only; original local financial stores unchanged.
Shared cream/blue theme and UI primitives retained, without copying Stitch HTML.

- Explicit pocket selection, integer Cash/NFC opening balances, review before PUT.
- Period fixed 26–25; Cash requires Food & Groceries and NFC requires
  Transportation. Companions are never silently selected.
- Bank starting amounts are disclosed as template amounts, not bank-sync values.
- Stable UUID and frozen request retained for explicit retry while mounted.
  No automatic network/5xx retries; only one retry for explicit CSRF rejection.
- Uncertain outcome locks edits and exposes same-request retry/status check.
  Completed setup in another tab loads canonical server state, never overwrites.
- Reload loses unsent drafts. Pending writes trigger a beforeunload warning.
  After reload GET setup reconciles completion; backend's one-time setup lock
  prevents a second setup even when the in-memory mutation ID was lost.
- Canonical UUIDs, balances and mappings are refetched, not inferred from the
  mutation response. Session checks preserve mounted form state; logout/401
  clears it. Generic pocket/category mutation journaling is still future work.

## Files

- `frontend/src/features/connected/ConnectedSetup.tsx`: select/review/submit UI.
- `frontend/src/lib/api/setupDraft.ts`: strict draft validation.
- `frontend/src/lib/api/sessionClient.ts`: narrow setup PUT with CSRF handling.
- `ConnectedPockets.tsx`: pre-setup integration and canonical reload.
- `ConnectedApp.tsx`: retain mounted draft through transient session checks.
- `backend/tests/integration/frontendSetup.test.ts`: six new cases.
- Current state, sprint, handoff, integration plan and docs index updated.

## Initial evidence (superseded by follow-up QA below)

- Frontend `npx tsc --noEmit -p tsconfig.app.json`, `npx tsc --noEmit`: passed.
- Frontend `npm run build -- --mode connected` and `npm run build`: passed;
  default/local build produced last.
- `npm run test:integration`: **258 passed, 0 failed, 24 suites**, 182.6 seconds.
  Disposable `pocketflow_test_7b4_windows`, native PostgreSQL 16.
- Six new cases cover real setup balances/UUIDs/mappings, response lost after
  commit and explicit idempotent retry, CSRF rotation, companion requirements,
  whole rupiah validation, omitted fields and bounded/malformed transport results.
- First focused attempt failed because PostgreSQL was stopped; after starting
  the installed local server, the full suite above passed.
- `npm run dev:connected`: ready on 127.0.0.1:5174. Disposable preview backend
  starts on loopback 3000 with `sessionPreview.ts`, without `--with-pockets`.
- Browser login page rendered before continuation interrupted browser tooling.
  **Setup form interaction, focus preservation, responsive appearance and console
  inspection are not yet verified in a browser.** Previous read-only browser
  evidence is not evidence for this new form. The later available Windows
  computer-use skill restricts authentication automation; no workaround used.
- Source review and `git diff --check` passed (line-ending warnings only).

## Review gate and limits

Do not claim full 7C.2 completion or start 7C.3. Pocket/category edits remain
unimplemented. No dependencies, backend endpoints, migration or deployment added.

Before commit: PO review of the setup checkpoint. Follow-up browser checks below
cover the previously pending flows with automated browser interactions and direct
screenshot inspection, not a claim that the PO performed manual acceptance.

The original read-only checkpoint remains recorded separately. Current working
tree contains both that checkpoint and this setup continuation, uncommitted.

## Follow-up QA and bounded defect fix — 2026-09-19

The available bundled Playwright runtime was used with a new headless Edge
profile, not the owner's browser/session. No dependency was added. This replaces
the earlier tooling limitation for automated browser QA; it does not use Windows
authentication-dialog automation or a real user's credentials.

Browser QA found a backend defect: unchecking/rechecking Food & Groceries puts
it after Cash in the request. The backend inserted in request order, causing
foreign-key error 23503 because the budget owner had not been inserted yet.
The existing contract requires companion presence, not request ordering.

- Added regression to `backend/tests/integration/frontendSetup.test.ts`; it
  failed with HTTP 500/23503 before the fix.
- Fixed `backend/src/routes/setup.ts` to insert bank pockets before Cash/NFC
  within the same atomic transaction. Request hashing, selected keys, generated
  IDs and replay semantics remain unchanged. No schema/API/product change.
- Full integration rerun: **259 passed, 0 failed, 24 suites**, 94.6 seconds.
- Backend `npm run typecheck` and `npm run build`: passed.
- Frontend explicit app/root type-check, connected build and ordinary build rerun: passed.
- New `backend/tests/browser/connectedSetup.cjs` verifies companion validation,
  session-check draft preservation, review/back preservation, three viewport
  widths, real-server commit with deliberately lost browser response, identical
  retry payload and two HTTP 200 results, 12 pockets without duplication,
  Cash Rp30000/NFC Rp40000, reload without another PUT, no LocalStorage writes,
  and logout clearing financial cards.
- Browser had no uncaught JavaScript errors or console warnings. Expected console
  errors are anonymous bootstrap 401 and the intentionally aborted request.
  External Google Fonts/Material Symbols requests were also denied by the test
  environment (ERR_NETWORK_ACCESS_DENIED), an existing external-font dependency;
  screenshots therefore exercise fallback fonts. The harness permits only that
  network error on fonts.googleapis.com/fonts.gstatic.com, records it in JSON,
  and still fails on unexpected console errors. No claim of zero network errors.
- Screenshots saved to ignored `backend/dist/qa-7c2/review-{375,390,430}.png`;
  375px screenshot inspected directly: readable labels, amounts and buttons,
  cream/blue theme retained, no horizontal clipping. Overflow assertions pass
  at all three widths. Evidence JSON is `backend/dist/qa-7c2/result.json`.

Reproduce with the existing disposable `sessionPreview.ts` fixture (without
`--with-pockets`) on 3000 and `npm run dev:connected` on 5174. Set
`PLAYWRIGHT_MODULE_PATH` to the already installed Playwright package, then run
`node tests/browser/connectedSetup.cjs` from backend. Restart the fixture before
each run; the script intentionally completes its one-time setup. Do not point
this fixture at the owner's development database.

Checkpoint is ready for PO review. Pocket/category mutation forms remain future
work within 7C.2. No commit/push or automatic advancement to 7C.3 occurred.
