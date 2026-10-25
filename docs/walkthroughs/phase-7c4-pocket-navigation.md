# Phase 7C.4 — Connected pocket URL navigation

## 2026-10-24 — Consolidated navigation review

Reviewed history subscription/cleanup, direct-entry close fallback, dialog
selection by active server ID, parent session/draft lifetime, and local-store
isolation. No new source change was required by this review. Earlier uncertainty
tests cover create, amount edit and archive, not every possible transaction path.

Final regression commands: `node tests/browser/pocketNavigation.cjs`,
`node tests/browser/homeSnapshot.cjs`, `node tests/browser/pocketDetail.cjs`,
`PREVIEW_MUTATIONS=1 node tests/browser/homeMutationReconciliation.cjs`,
`npx tsc --noEmit`, `npm run build`, `npx vite build --mode connected`,
`git diff --check`. Existing disposable preview services used. Mutation script
archives its own rows and must restore active fixture totals; no personal data.

Results: all four browser scripts passed including console/page-error checks;
type-check and both builds passed (152 modules); diff check passed. Active totals
restored, three additional recoverable archived QA rows retained. No full backend
suite, new visual design review or PO acceptance claimed in this continuation.

Review checklist for PO:

1. Open NFC and Transportation separately; verify their independent saldo/budget.
2. Open a warning card, then use Back/Forward and close; verify the URL changes.
3. Hide Home amounts before opening detail; verify amounts remain hidden.
4. Leave an unsaved expense draft, open/close detail, verify the draft is retained.
5. Reload a detail URL; expect server reauthentication/check and data loading.
   Unsaved in-memory drafts/privacy are not promised across a document reload.

This completes the scoped URL-overlay review, not Phase 7C.4 or full MVP delivery.
Do not extend tests indefinitely as a substitute for the remaining UI integration.
Next implementation boundary: connected app navigation between Home, pocket list,
history and Reports while retaining the existing session and recovery coordinator;
first inspect shared form locks and preserve the local-mode isolation boundary.
Use the approved design references and existing components, not new product
behavior. Do not silently migrate data or switch production mode.

This review updates documentation only and preserves the uncommitted URL work.
No commit/push this turn. Recommend reviewing and committing this bounded slice
before beginning the wider connected app navigation implementation.

## 2026-10-24 — Archive recovery continuation

Expanded pocketNavigationRecovery.cjs to drop the successful archive response
for its own test expense. The durable archive record remains identical across
detail open/back/forward/reload, with exactly one request before explicit retry.
Retry uses the same payload/clientMutationId/expectedRevision, clears the journal,
and increments revision only once. Server search including archives returns one
archived row; active Home total returns to 1532000. This fulfills the scoped
backlog 4.5 archive navigation verification, not restore/delete/batch variants.

Commands: `PREVIEW_MUTATIONS=1 node tests/browser/pocketNavigationRecovery.cjs`,
`node --check tests/browser/pocketNavigationRecovery.cjs`, `git diff --check`.
All passed. Existing disposable API/Vite used; no reset required. One additional
recoverable archived QA row remains. No personal data or permanent deletion.
Browser page/console assertions passed, allowing only deliberately aborted
create/edit/archive URLs plus pre-login 401 and external font failures.

Only test/docs changed this turn; no build/type-check rerun or new visual/PO
acceptance claimed. Files: recovery script, this walkthrough, CURRENT_STATE,
CURRENT_SPRINT and HANDOFF. Earlier uncommitted implementation preserved.
No commit/push. The URL navigation slice now has create/edit/archive uncertainty
evidence and is ready for review, without declaring full Phase 7C.4 complete.

## 2026-10-24 — Edit recovery continuation

Extended pocketNavigationRecovery.cjs within the same approved phase using
backlog 4.4 and immutable expectedRevision/idempotency contracts. After creating
the disposable expense, the script edits 1000 to 2000 through the UI and drops the
successful PATCH response. Actual edit journal remains identical across detail
open/back/forward and reload. No automatic PATCH occurs. Explicit recovery sends
the identical body/clientMutationId/expectedRevision, clears the journal, keeps
one matching transaction, and increments revision exactly once. Detail NFC saldo
is 80000 before final archive restores total money to 1532000.

`PREVIEW_MUTATIONS=1 node tests/browser/pocketNavigationRecovery.cjs` passed with
existing loopback preview/API and disposable database. Test left one additional
recoverable archived QA row; no production data. Page/console assertions passed.
`node --check tests/browser/pocketNavigationRecovery.cjs` and `git diff --check`
passed. No app-source change, build/type-check not rerun; previous navigation
build evidence remains valid. No new visual/manual acceptance claimed.

Files: recovery browser test, this walkthrough, CURRENT_STATE, CURRENT_SPRINT and
HANDOFF. Earlier local navigation/review changes preserved. This verifies amount
edit recovery, not every changed-field, lifecycle or batch recovery variant.
No commit/push this turn.

## 2026-10-24 — Real lost-response recovery verification

Added `backend/tests/browser/pocketNavigationRecovery.cjs` with explicit
PREVIEW_MUTATIONS=1 opt-in and loopback/known-fixture checks. Backend commits a
1000 NFC expense, then the browser interceptor drops the response. The actual
IndexedDB recovery record is compared before/after detail open, browser back/
forward, and document reload with the detail URL. No automatic POST replay occurs.
Explicit continue sends an identical payload/clientMutationId; server query and
history contain exactly one matching row, journal clears, and detail shows 81000.
Finally the test archives that row through existing UI and verifies total money
returns to 1532000. One recoverable archived QA row remains, no pending journal.

Commands: `node --check tests/browser/pocketNavigationRecovery.cjs`, then
`PREVIEW_MUTATIONS=1 node tests/browser/pocketNavigationRecovery.cjs` with existing
Playwright runtime; both passed. Runtime page/console assertions passed (only
deliberately aborted POST, pre-login 401 and external-font failures excluded).
First attempt could not connect to stopped frontend and sent no transaction.
Restarted PostgreSQL/Vite/API; helper reseeded only pocketflow_test_7c1_preview,
replacing earlier disposable rows, not personal or production data.

This closes the specifically named create-expense lost-response navigation gap,
not every lifecycle/edit/batch recovery permutation. No application code changed;
build/type-check not rerun (preceding navigation build passed). No new visual
review or PO acceptance claimed. `git diff --check` passed. Changed files this
turn: new test, this walkthrough, CURRENT_STATE, CURRENT_SPRINT and HANDOFF.
Earlier uncommitted navigation/review work preserved; no commit/push.

2026-10-23. PO approved continuation of the navigation boundary. Existing dirty
review docs preserved; same phase, no commit/push or production cutover.

## Implementation

Connected-only `#/pockets/<server-id>` routes use browser history, leaving
ConnectedApp/session and ConnectedPockets/draft/recovery owners mounted.
usePocketNavigation owns hash/popstate subscription and cleanup. Opening from
Home pushes an entry; close returns through history. Direct-link close replaces
the hash without sending the user to an external previous page. Detail remounts
by pocket ID; inactive/archived/unknown IDs show an unavailable dialog without
financial metrics. No legacy router or local financial store is imported.

Backlog 2.1 and 7C.4 navigation boundary fulfilled for read-only dialog URLs, not
full standalone page layout. Existing approved modal visuals retained. No new
dependency, financial calculation, schema or write API. Browser back/forward
preserves in-memory Home privacy and an open unsaved expense draft. Full browser
reload is intentionally not draft/privacy persistence; existing behavior remains.
Authentication still gates rendering and expired-session callback unmounts detail.

## Verification

- `npx tsc --noEmit`, `npm run build`, `npx vite build --mode connected`: passed,
  152 modules each. Existing dev server localhost:5175 reused.
- `node tests/browser/pocketNavigation.cjs`: passed URL/back/forward, unsaved
  amount retention, Home privacy, direct refresh, invalid ID, archived response
  fixture, no write requests after login and no local-store resources loaded.
- `node tests/browser/pocketDetail.cjs` and `node tests/browser/homeSnapshot.cjs`:
  passed existing mobile/console/privacy/session/error/stale-response regressions.
- Navigation script console assertions reject unexpected errors. Agent inspected
  .env.pocket-navigation.png at 375px: existing dialog layout retained after reload.
- `git diff --check`: passed. No full backend suite or PO manual acceptance claim.

Archive fixture initially timed out: first interception omitted includeArchived
query; corrected URL then still required document reload because hash navigation
correctly does not refetch master data. Corrected test reload passed. No database
archive or financial mutation was made; fixture is browser-response-only.

## Limits and handoff

Read-only URL-backed overlay, not a complete connected app shell. Existing
history/settings forms remain in the parent preview. Pending recovery controls
are structurally retained, but navigation during a real lost-response recovery
has not been newly exercised; that is the next verification gap. Do not claim
all draft/recovery permutations or persistent privacy on refresh.

Files: ConnectedHomeSnapshot.tsx, new usePocketNavigation.ts, new
browser/pocketNavigation.cjs; docs index/state/sprint/handoff and this walkthrough.
Review browser back/forward, reload and invalid link before closing this slice.
