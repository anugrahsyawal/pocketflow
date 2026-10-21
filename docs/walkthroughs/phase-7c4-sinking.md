# Phase 7C.4 — Connected Sinking Fund and local exclusions

Date: 2026-10-21 (resumed from 2026-10-20)
Status: bounded implementation; review pending, no full-phase acceptance

## Scope and authority

PO requested continuation, then completion after usage interruption. Previous
weekly/insight changes preserved without automatic commit. Last pushed checkpoint
remains `7dc729e`. Same Phase 7C.4, not a new phase.

Reviewed documentation order, backlog 8.5, PR-014, DEC-020/031, Reports API
candidate/status/query contract and Iteration-3 Sinking specification. Canonical
reference screenshot had been inspected earlier in this delivery session.

## Files / behavior

- `ConnectedSinkingFund.tsx`: presentation-only server amount, days remaining and
  five availability states. Historical values unavailable, not zero. Final day is
  labeled explicitly. Excluded candidates stay visible; Cash/NFC are independent.
  Checkboxes configure inclusion, never execute a transfer. Disabled during export.
- `sinkingPreferences.ts` / `useSinkingPreferences.ts`: browser-local UUID list,
  max 100 entries, deduplication and owner-specific connected key. Separate from
  demo/local-ledger preferences to avoid mixing IDs/accounts. No server settings
  endpoint or sync. Failed write retains previous selection with an alert; damaged
  read uses all candidates with an explicit warning. Storage events refresh the
  local view. Account changes remount via existing keyed ConnectedPockets.
- `useConnectedReport.ts`: exclusions included in request and render-generation
  key. Hide old report on selection change; ignore late replies after navigation.
- ConnectedPockets passes owner identity; ConnectedPeriodExport wires preferences,
  errors and export lock; ConnectedReportSummary places recommendation after insight.
- New `frontendSinkingPreferences.test.ts`, `reportSinking.cjs`; index/state/sprint/
  handoff updated. Existing weekly/insight code preserved.

No new dependency, schema, API, financial mutation, local ledger migration or
production cutover. Display totals come from the server, not checkbox arithmetic.
Local preferences are origin/account specific and do not sync to other devices.

## Verification

On resumption the preview processes were offline. Restarted installed PostgreSQL
using pg_ctl (workspace ignored log), Vite via `npm run dev -- --mode connected
--host 127.0.0.1 --port 5175 --strictPort`, and API via `npx tsx
tests/helpers/sessionPreview.ts --with-pockets`. Only the dedicated disposable
`pocketflow_test_7c1_preview` fixture was reset; no user financial database touched.

- Unit command: `npx tsx --test` with frontendSinkingPreferences,
  frontendReportInsights, frontendWeeklyDisplay and frontendReportDistribution
  tests: 8 passed. Covers owner isolation, invalid/legacy/corrupt IDs, max length,
  normalization and existing adapter regressions.
- Sinking browser test covers real exclusion GET and server amount reconciliation,
  persistence after reload, delayed response across historical navigation, failed
  local write preserving selection, and corrupted storage with an explicit warning.
  Presentation-only intercepted responses cover before-window, no candidates,
  no positive balance, all excluded and final-day labels. No backend eligibility
  claim from synthetic fixtures. Request audit requires zero non-GET API requests
  after login. Initial check/uncheck test interaction timed out when the report
  unmounted during reload; test now clicks then asserts the returned state.
- Full backend suite is not rerun: backend calculation code is unchanged.
- Fresh 2026-10-21 verification: `npx tsc --noEmit`, `npm run build` and
  `npm run build -- --mode connected` all passed (146 modules each build).
  All six browser scripts passed: reportSinking, reportInsights, reportWeekly,
  reportPeriod, reportDistribution and periodExport. Includes corrupted storage
  on reload and actual CSV download regression. No unexpected application console/
  page errors; expected 401, injected regression failures and external font load
  failures are classified separately.
- Widths 375/390/430 passed overflow checks. Fresh ignored screenshot
  `.env.report-sinking.png` visually inspected: four independent pocket candidates,
  Rp1,532,000 fixture recommendation and four days remaining on Oct 21; no clipping.
- Source/diff review and `git diff --check` passed. Git status at completion:
  8 modified tracked files and 16 untracked files, including prior weekly/insight
  slices. No commit or push performed during this continuation.

## Review / limitations

Review at http://127.0.0.1:5175 with the disposable preview account. Toggle
Transportation inclusion and inspect recomputed amount; reload to confirm the
choice persists; navigate to an old period to see unavailable recommendation.
This is browser QA, not PO manual acceptance.

Next: consolidated report review, remaining presentation details and reconciliation,
then Home/pocket-detail integration. No deployment or automatic midnight rollover.
Weekly, insights and Sinking remain local/uncommitted for review.
