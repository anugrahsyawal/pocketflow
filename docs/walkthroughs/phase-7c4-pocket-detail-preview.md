# Phase 7C.4 — Connected pocket detail preview

## Latest continuation — 2026-10-23 attention navigation

Backlog 2.1 and existing Home attention scope: changed attention actions from
settings anchors to buttons opening the same read-only detail dialog as carousel.
Reuses selectedId/Modal and existing typography/colors/44px minimum target.
No new route, data request type, dependency, mutation or recovery-flow change.
Earlier walkthrough statements about attention anchors describe the old checkpoint.

Files: ConnectedHomeSnapshot.tsx, browser/homeSnapshot.cjs, CURRENT_STATE,
CURRENT_SPRINT, HANDOFF and this walkthrough. Earlier local changes preserved.
Expanded Home browser test verifies Food and Transportation open their matching
dialogs, Escape restores alert-button focus, and hidden Home nominal remains
hidden in detail including loaded recent rows. Existing mobile/console regression
passed. Uses presentation-only alert fixtures, not DB changes.

Verification: `npx tsc --noEmit`, `npm run build`, `npx vite build --mode connected`,
`node tests/browser/homeSnapshot.cjs`, `git diff --check`. Existing dev preview on
5175 reused. Agent inspected .env.home-attention.png: layout/colors retained and
action visible. Browser evidence is not Product Owner manual acceptance. No full
backend rerun needed for this UI action change; complete routing remains pending.
No commit/push in this continuation.

## Latest continuation — 2026-10-23 budget usage

Backlog 2.1 includes usage/status. Added server-provided status and period usage
to ConnectedPocketDetail using existing ProgressBar and semantic colors, guided
by iteration-2 detail screenshot/design (supporting reference only). No raw HTML,
new dependencies, locally recomputed thresholds, or weekly-progress claim.
Nominal privacy remains intact; percentages/status remain visible consistently
with connected Home. Unknown allocation renders unavailable; known zero shows
Tanpa alokasi and no bar. Overbudget percentage remains uncapped text while bar
is capped to 100%, using the shared component's existing behavior.

Changed application file: ConnectedPocketDetail.tsx. Expanded pocketDetail.cjs:
Transportation 9%/Aman, NFC zero/no bar, Cash missing/no bar, plus response-only
fixture 120%/Overbudget/-40000 and masked nominal checks. Fixture changes only
browser response, not DB. Existing keyboard/network/session/stale tests pass.

Commands/results: `npx tsc --noEmit`, `npm run build`, `npx vite build --mode
connected` all passed (151 modules); `node tests/browser/pocketDetail.cjs` passed;
`git diff --check` passed. Existing dev server on 5175 reused; console assertions
reject unexpected errors. Agent visually inspected ignored screenshot
backend/.env.pocket-budget-progress.png at 375px: content contained, red bar,
120% label and negative remaining visible. Not PO manual acceptance.

Documentation updated: CURRENT_STATE, CURRENT_SPRINT, HANDOFF and this file.
Earlier uncommitted test work preserved. No full backend suite or mutation test
rerun for this presentation-only addition. Full routed detail/phase completion
remain pending; review these states before accepting the local changes.

2026-10-22. Bounded continuation authorized by PO's “lanjut”. Previous Home
privacy icon changes remain uncommitted; this continues the same Phase 7C.4,
not a new phase or production cutover.

## Scope and authority

Backlog 2.1 pocket detail and DEC-024 budget attribution: independent balances,
current-period budget metrics, active categories, latest three transactions.
Iteration-2 detail reference informs content hierarchy; existing Modal/tokens
are reused, not raw Stitch HTML. Each member of a paired Home card opens its
own read-only dialog. Settings and transaction recovery stay in existing forms.

Files: ConnectedPocketDetail.tsx (new), ConnectedHomeSnapshot.tsx,
ConnectedHomeRecent.tsx, lib/api/masterData.ts; browser/pocketDetail.cjs (new),
integration/frontendMasterData.test.ts, documentation index/state/sprint/handoff.

Budget values come from validated server report rows, never from payment-pocket
transaction sums. Missing allocations remain unknown, not zero. Recent rows use
the server pocketId filter (payment/from/to), explicitly distinct from budget
attribution. Dialog inherits Home privacy; archived metadata may resolve labels,
but only active carousel pockets can open. No dependencies, API mutations,
local-storage migration, schema changes, or new product decisions.

## Verification

- `npx tsc --noEmit`, `npm run build`, `npx vite build --mode connected`.
- Existing Vite dev server on 127.0.0.1:5175 reused; launching another instance
  correctly refused the occupied port. Sandbox service checks were misleading;
  elevated read-only checks confirmed PostgreSQL/API/Vite were already running.
- `node tests/browser/pocketDetail.cjs`: real disposable preview API; Transportation
  balance 100000/budget expense 18000/remaining 182000, NFC balance 82000/budget
  expense 0; category MRT, filtered transfer/payment counts, privacy, Escape and
  return focus, error/retry, mobile 375/390/430px, no mutation requests.
- `node tests/browser/homeSnapshot.cjs`: existing Home regression. First run
  timed out waiting for carousel scroll reset; unchanged rerun passed. This is
  retained as an intermittent browser-scroll test limitation, not erased evidence.
- `npx tsx --test tests/integration/frontendMasterData.test.ts`: 10 tests against
  dedicated pocketflow_test_7b4_windows; includes per-pocket budget assertions.
- Browser pageerror/console review; expected pre-login 401 and external font
  network failures excluded, unexpected errors rejected.
- Agent inspected backend/.env.pocket-detail.png at 375px: layout contained,
  scrollable dialog, independent saldo/budget labels and category visible.
  Screenshot is ignored local evidence; not Product Owner manual acceptance.
- Source/diff review and `git diff --check`.

## Limits / review

Final results: type-check passed; both builds passed (151 modules); integration
10/10 passed; detail browser and Home rerun passed; diff whitespace check passed.
Git status: 9 modified tracked files and 4 untracked new files, including prior
icon work. Nothing staged, committed or pushed in this continuation.

Read-only dialog, not complete routed pocket detail. Recent rows span periods
and are limited to three; budget metrics are current-period only. Shared dialog
still uses existing external close-icon font. Other screens are not covered by
Home privacy. Full backend regression and production deployment not performed.
Review opening both members of Transportation/NFC and Food/Cash, scrolling the
dialog, closing it, and privacy. Full Phase 7C.4 remains in progress.

## Follow-up verification after commit/push

PO authorized commit/push/continue. Checkpoint `722f894` pushed to
origin/codex/audit-pocketflow-documentation; working tree verified clean before
this test-only extension. Earlier local/uncommitted descriptions are history.

Expanded `backend/tests/browser/pocketDetail.cjs` verifies:

- Cash balance 50000 and budget expense 0 remain known while missing allocation
  and remaining budget display unavailable, never zero. Budget owner is Food.
- Food balance/allocation/remaining 1300000, no active category or transaction;
  no synthetic NFC activity leaks into Food.
- Tab and Shift+Tab stay on the sole close control in an empty dialog; clicking
  close restores trigger focus and final closing restores body scrolling.
- Real NFC response is delayed while closing NFC/opening Food; releasing the
  old response leaves Food empty and its own financial metrics unchanged.
- Existing privacy, error/retry, mobile widths and console checks still pass;
  no POST/PATCH/PUT/DELETE after authentication.

Initial delayed-response test held one request only and timed out because
StrictMode can issue duplicate reads. Test corrected to hold all reads for the
captured NFC URL, while allowing Food through. Corrected browser run passed.
This was a test-harness correction; no application code changed.

Command: `node tests/browser/pocketDetail.cjs` with existing Playwright runtime,
existing localhost:5175 dev server and disposable preview API. `git diff --check`
passed. Build/type-check were not rerun for this test/docs-only continuation;
preceding implementation's successful results remain above. No full backend
suite or new Product Owner manual acceptance claimed.

Files changed this continuation: browser test, CURRENT_STATE, CURRENT_SPRINT,
HANDOFF and this walkthrough. No schema/data/dependency changes or new phase.

## 2026-10-23 — Network and session boundary verification

Continued the existing uncommitted verification slice, not a new phase. Backlog
2.1/12.1 and the integration plan require authenticated detail reads and distinct
network/401 handling. Reviewed ConnectedApp.expire and ConnectedHomeRecent's
error handling before extending the browser script; application code unchanged.

The script aborts filtered detail GETs, verifies retry appears without logout
or loss of known Cash balance, then removes interception and successfully retries.
Next it injects a 401 on detail reads: the expired-session message and login form
appear; dialog and Home unmount; NFC amount is absent; body scrolling is restored.
No financial writes were made. These are browser response fixtures, not evidence
of actual server session expiration or revocation. Console filtering allows the
deliberately aborted filtered request and expected 401, not arbitrary errors.

First run failed with connection refused because preview services were stopped.
Restarted local PostgreSQL, Vite (`npm run dev -- --mode connected --host
127.0.0.1 --port 5175 --strictPort`) and `npx tsx tests/helpers/sessionPreview.ts
--with-pockets`. The helper reset only pocketflow_test_7c1_preview and replaced
prior disposable QA rows; no personal/production database touched.

`node tests/browser/pocketDetail.cjs` then passed including existing balances,
Cash missing allocation, keyboard, stale response, retry/privacy/mobile cases.
`git diff --check` passed. Build/type-check not rerun: test/docs-only change;
prior implementation evidence remains above. No new visual design or manual PO
acceptance claimed. Modified files remain the same five listed above; no commit
or push this turn. Full navigation and complete Phase 7C.4 acceptance remain open.
