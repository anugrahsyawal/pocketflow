# Phase 7C.4 — Empty report actions and preview copy

Date: 2026-10-21
Status: bounded remediation; Product Owner review pending

PO requested continuation of the two findings from the consolidated Reports
review. Prior uncommitted audit/test/docs preserved; last push remains `cad4cfe`.
Reviewed active docs/backlog 8.1, PR-010/011 and approved Iteration-3 empty-state
specification. No new phase, product behavior or write endpoint introduced.

## Files / behavior

- ConnectedPeriodExport: a single empty-report CTA above the summary. Historical
  action returns to offset zero even from several periods back. Current action
  routes to existing expense entry. No CTA during loading/error or populated
  report; export-busy disables navigation and the empty action.
- ConnectedPockets: explicit navigation request counter and existing editing/
  lifecycle/category/expense locks; no-pocket state also disables expense action.
- TransactionCreateForm: optional expenseRequest consumes each explicit navigation
  request once, scrolls/focuses the existing section, opens expense only when ready
  and with no pending recovery, draft or batch. Does not send, overwrite drafts,
  change an attempt ID, or auto-open later after recovery becomes ready.
- ConnectedApp: accurate batch/edit/report/CSV availability, 7C.4 label, retained
  migration/sync/production limitations.
- New browser test `reportEmptyActions.cjs`; docs index/state/sprint/handoff updated.

## Verification

- `npx tsc --noEmit`, `npm run build`, `npm run build -- --mode connected`: passed,
  146 modules each build. No dependency or backend source change.
- Used the existing connected Vite dev preview at 127.0.0.1:5175 and dedicated
  disposable API. No ledger writes from this test; current-empty response is an
  intercepted presentation fixture, not a fabricated production report.
- New browser test verifies actual historical empty navigation across two periods,
  a single current CTA, existing expense form/focus, disabled CTA during another
  draft, no populated CTA, updated copy, widths 375/390/430 and console.
- Screenshot `.env.report-empty-action.png` visually inspected: complete readable
  button label at 375px. Generated screenshot ignored. Automated browser evidence
  is not PO manual acceptance.
- No full backend suite rerun for UI-only remediation; previous review's 59 tests
  remain checkpoint evidence, not a new full-suite claim.
- Final browser rerun also seeds a recovery record only in the disposable browser
  journal: CTA preserves its identity, does not open a replacement form or issue
  any non-GET API request. Test passed. Regressions reportReconciliation,
  reportPeriod and periodExport all passed. No unexpected console/page errors;
  expected unauthenticated 401 and external font failures classified separately.
- Source/diff review and `git diff --check` passed. No Git commit/push this turn.

## Review / limitations

In the connected preview, navigate to an empty historical period and select
Kembali ke Periode Berjalan. On an actually empty current period, Catat Pengeluaran
opens the existing guarded expense entry. Pending recovery is never replaced.
The standard seeded current preview is populated, so it correctly has no empty CTA.

No production cutover or integrated Home/detail yet. Review plus remediation are
uncommitted for PO review; next scope remains Home/detail and mutation-to-screen/
CSV reconciliation, within Phase 7C.4.
