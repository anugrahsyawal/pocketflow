# Phase 7C.4 — Connected section navigation

## 2026-10-25 — Recovery integration check

Extended pocketNavigationRecovery.cjs to assert all bottom-nav buttons remain
disabled during uncertain edit/archive and re-enable after explicit successful
retry. Existing create/edit/archive lost-response journal/back/forward/reload
assertions ran with the new fixed nav present. Test passed, with one persisted
row, one revision per change, and final archive restoring active total 1532000.
One additional recoverable QA archive remains. No application change this turn.

Initial run failed at page.goto because services were stopped; no transaction
sent. Restarted local PG, connected Vite, and sessionPreview --with-pockets;
reseed replaced only previous disposable pocketflow_test_7c1_preview data.
No personal data touched. `PREVIEW_MUTATIONS=1 node
tests/browser/pocketNavigationRecovery.cjs`, `node --check` for that script,
and `git diff --check` passed. Unexpected browser console/page errors rejected.
Build/type-check not rerun for test/docs only; preceding results below retained.

Files changed this turn: recovery browser script, this walkthrough, CURRENT_STATE,
CURRENT_SPRINT and HANDOFF. Previous uncommitted app/navigation work preserved.
No new visual verification or PO acceptance claimed. This checkpoint is ready
for review and authorized commit; broader separate-screen refactor not started.

2026-10-24. PO requested continuation after URL navigation review. Same-phase
increment; previous uncommitted work retained, no automatic commit/push.

## Scope

Add connected-only fixed bottom navigation: Beranda, Pocket, Tambah transaksi,
Riwayat, Laporan. Iteration-5 screenshot and existing BottomNav informed layout,
colors, central add and labels. Inline SVG avoids external icon-font dependency.
This is section navigation within the connected preview, not full screen routing.
All shared session/master-data/form/recovery owners remain mounted.

Buttons scroll and focus explicit section IDs. Add focuses the existing chooser,
does not submit or default to a new financial operation. Navigation disables
while existing editing/create/expense/lifecycle locks are active. All forms remain
accessible by ordinary scrolling; no draft discard, recovery bypass or hidden
financial data source is introduced. Parent bottom padding reserves nav space.
Pocket detail hash/back behavior remains separate. No local router/stores added.

Files: new ConnectedNavigation.tsx; ConnectedPockets.tsx, ConnectedHomeSnapshot.tsx,
ConnectedPeriodExport.tsx and TransactionCreateForm.tsx for targets/padding;
new browser/connectedNavigation.cjs; pocketNavigation.cjs test determinism fix;
docs index/state/sprint/handoff and this walkthrough.

## Verification

`node tests/browser/connectedNavigation.cjs` passed five focus destinations,
privacy retained across section navigation, disabled navigation during expense
draft and pocket label edit, 375/390/430px width checks, no post-login writes and
console/page errors. Existing API/Vite on localhost:5175 used. Agent inspected
.env.connected-navigation.png: five labeled/central controls fit mobile width.

First pocketNavigation regression failed on an external Google-font CORS error.
The navigation test now explicitly blocks fonts.googleapis.com/fonts.gstatic.com
and retains expected-network-failure filtering, rather than accepting arbitrary
console errors. URL/back/forward/draft/reload/archived test rerun passed.
Home regression runs with BLOCK_EXTERNAL_FONTS=1. No database mutation in these
browser runs. PO manual acceptance and full backend suite not claimed.

Build commands: `npx tsc --noEmit`, `npm run build`,
`npx vite build --mode connected`. Diff verification: `git diff --check`.

Final results: type-check and both builds passed (153 modules), connected
navigation/URL navigation/Home browser regressions passed, diff check passed.

## Limits / review

Not separate pages: all sections still exist on the long preview surface and
scrolling can expose them. No active-page indicator is claimed. Draft protection
blocks navigation buttons but does not prohibit manually scrolling. Shared modal
close icon/other typography may still rely on external fonts. Existing native
dialog overlays make background nav inert. Full shell/routing remains pending.
Review scrolling/focus and form locks before replacing the long preview with
separate screens; that larger structural change must retain recovery ownership.
