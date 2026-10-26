# Phase 7C.4 — Mounted connected screens

Date: 2026-10-25
Status: local implementation; review pending, not production cutover

## Scope and requirements

Connected preview now shows one of Home, Pocket, Add, History and Reports instead
of the long combined surface. Existing components remain mounted inside hidden
containers: navigation alone does not destroy privacy, filters or recovery owners.
No local financial stores/router, new dependency, API or product rule introduced.
PR-003/004 pocket/category behavior and PR-009/010 Home/report semantics retained.

Navigation exposes aria-current and an underline, focuses the selected section,
and remains blocked during existing form locks. A locked lifecycle recovery
reveals History after reload; active entry/management locks reveal their owner.
Create/category recovery or unavailable storage is surfaced by global inspection
buttons. Inspection only navigates, never submits. Home's History link uses an
explicit callback, so repeated visits work without depending on hash changes.
Report empty-state entry callback selects Add before opening the existing form.

## Files

- ConnectedPockets.tsx: screen coordinator, mounted boundaries, recovery notice.
- ConnectedNavigation.tsx: controlled selection and active indication.
- ConnectedHomeSnapshot.tsx / ConnectedHomeRecent.tsx: History callback and copy.
- TransactionCreateForm.tsx / CategoryCreateForm.tsx: optional recovery visibility
  callback, without changes to storage, request or acknowledgement logic.
- ConnectedPocketManagement.tsx: forwards category recovery visibility; previous
  extraction and corrected Pocket target remain part of the local checkpoint.
- connectedNavigation.cjs / pocketNavigation.cjs: screen-aware browser assertions.
- Docs index, state, sprint, handoff and walkthroughs.

## Verification

- `npx tsc --noEmit`, `npm run build`, `npx vite build --mode connected`.
- `node tests/browser/connectedNavigation.cjs`: five exclusive visible targets,
  active indicator/focus, repeated History shortcut, retained privacy, category,
  wallet, archive, opening/classification draft locks and cancellation, mobile
  widths. Synthetic create/category journals in an isolated browser survive
  reload unchanged and are reachable through global notices. Synthetic archive
  journal reveals History and disables navigation. No financial writes submitted.
- `node tests/browser/pocketNavigation.cjs`: draft navigation lock, Home privacy,
  detail URL/back/forward/reload, unknown/archived detail, no local store imports.
  Draft now must be cancelled before Home navigation; the old simultaneous
  long-page draft/detail workflow is intentionally no longer reachable.
- Both scripts assert no unexpected console/page errors or post-login writes.
  Existing local Vite/API used; no server restart or personal database mutation.
- Agent inspected `.env.connected-screens.png`: single Home content, privacy
  masked, bottom navigation at mobile width. This is not PO manual acceptance.
- `git diff --check` and source/diff review.

## Limits / next review

Screen selection is in-memory, not full URL page routing; document reload starts
at Home unless recovery requires History or a pocket-detail hash opens a dialog.
Hidden sections still load their read data; this is not lazy loading. Home privacy
does not hide values in Pocket/Reports. Existing complete-detail dialog remains.

Full backend suite and the full older browser suite were not rerun. Recovery and
Home/report/CSV scripts have now been adapted and executed (follow-ups below).
Empty-report Add navigation is covered by an explicit browser response fixture,
not an empty production database. Review the bounded checkpoint before marking
Phase 7C.4 complete; automated evidence is separate from PO acceptance.
No commit or push in this continuation.

## Real recovery follow-up — 2026-10-26

Updated `backend/tests/browser/pocketNavigationRecovery.cjs` for five screens.
Create uncertainty can navigate to Home/detail/back/forward; after reload the
global inspection button opens the preserved create request. Edit/archive
uncertainty locks navigation and keeps History visible, including after reload.
The obsolete long-page access to hidden Home during these locks was removed.
Waits after acknowledgement require all five navigation buttons to exist and
unlock before moving to another screen (not a vacuous empty-node assertion).

Runtime setup: started the installed local PostgreSQL and Vite connected mode on
127.0.0.1:5175; started sessionPreview.ts --with-pockets on 127.0.0.1:3000. Its
guard restricts resetting/seeding to pocketflow_test_7c1_preview. Only disposable
QA data was reset; no development/personal database was touched.

With PREVIEW_MUTATIONS=1, the browser test passed real server create, edit and
archive, each with its successful response intentionally dropped. Explicit
retries sent identical payloads; one created row, one revision increment per
edit/archive, unchanged durable journals through reload, and journal cleanup
only after acknowledgement. NFC balance checked at Rp81.000 then Rp80.000;
after archive the active total returned to Rp1.532.000. One QA transaction remains
archived (recoverable) in the disposable database. No permanent delete used.
No unexpected browser console/page errors; intentional ERR_FAILED responses are
filtered only for tested mutation URLs. This is automated runtime evidence, not
manual PO acceptance or a claim that the entire phase is finished.

Final follow-up checks: `npx tsc --noEmit`, `npm run build`, and
`npx vite build --mode connected` passed (154 modules). Both
connectedNavigation.cjs and pocketNavigation.cjs reran successfully after the
real mutation cycle. Source review and `git diff --check` passed. This turn
modified the recovery script and four status/evidence documents only; earlier
local application changes remain intact and uncommitted.

## Cross-screen reconciliation follow-up — 2026-10-26

Adapted homeMutationReconciliation.cjs and reportReconciliation.cjs to explicitly
select the relevant screen before interacting with Home, detail, History, Reports
or Add. No application code changed in this follow-up. Used the already-running
guarded disposable sessionPreview API; did not reset it again.

`PREVIEW_MUTATIONS=1 node tests/browser/homeMutationReconciliation.cjs` passed:
expense create/edit/revert/archive/restore and Cash income/NFC top-up lifecycle
cycles reconcile Home total, independent pocket balances, stored expense budget
attribution, report cash flow and downloaded CSV row identity/amount/inclusion.
Transfer remains income/expense-neutral. All active fixture balances restored;
three additional recoverable QA rows remain archived, no permanent deletion.

`node tests/browser/reportReconciliation.cjs` passed full CSV parsing/BOM,
transaction uniqueness/date bounds, category/payment/budget/daily/weekly totals,
neutral transfers, independent NFC balance, rendered figures, nine report
sections and empty historical-period rendering. No writes in this script.

New `node tests/browser/connectedEmptyReport.cjs` passed the current empty-report
action twice: it opens Expense on Add, marks Add active, locks navigation during
the form and allows cancellation. Historical empty action returns to the current
report without opening Expense. No transaction submitted. This isolated browser
fixture replaces report response collections/totals only to exercise navigation;
it is not financial-calculation evidence. Session and master pockets remain real.
Removing pocket report rows also makes payment balance display unknown in this
fixture, not a real missing-balance regression.

Agent inspected Home top-up screenshot (Rp97.000 Transportation + Rp85.000 NFC,
unchanged Rp1.532.000 total) and empty-report entry screenshot (form visible,
navigation disabled). Browser console/page assertions pass where instrumented;
full manual PO review still pending. Final `npx tsc --noEmit`, `npm run build`
and `npx vite build --mode connected` passed (154 modules); source/diff review
and `git diff --check` passed. No new dependency or application-source edit.

Next: PO review/authorized checkpoint commit, not another implementation phase.
Known limits remain in-memory navigation, eager hidden reads, preview-only shell,
no full backend-suite rerun or production cutover. Older specialized browser
scripts outside this verified subset may still assume the combined page.
