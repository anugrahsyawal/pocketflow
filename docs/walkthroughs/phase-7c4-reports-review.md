# Phase 7C.4 — Consolidated Reports review and seeded reconciliation

Date: 2026-10-21
Status: financial review passed for tested scope; presentation gaps remain

Follow-up: findings 1/2 below are addressed by the subsequent
[presentation remediation](phase-7c4-report-empty-actions.md). The original audit
findings are retained as checkpoint evidence; full 7C.4 work remains open.

## Delivery / authority

PO requested commit, push and continuation. Weekly/insights/Sinking checkpoint
`cad4cfe` pushed to origin/codex/audit-pocketflow-documentation. Clean tree confirmed
before review. This is an audit within 7C.4, not full phase acceptance or production
cutover. Existing PO acceptance of older local-mode features is unchanged.

Reviewed active docs/backlog 8.1–8.6, PR-006/007/010–015, DEC-031, API integration
plan, Reports contract and approved Iteration-3 structure/empty-state requirements.

## Evidence

New `backend/tests/browser/reportReconciliation.cjs` logs into the disposable
preview, downloads an actual CSV and parses quoted fields (including a parser
self-check for commas, escaped quotes and embedded CRLF). It checks:

- BOM, transaction uniqueness/count and inclusive period dates;
- exact integer sums for income, expense, cash flow and transfer volume;
- expense reconciliation across category, payment pocket, daily, weekly, budget
  attribution and pocket payment aggregates;
- NFC balance Rp82,000, payment expense Rp18,000, budget expense Rp0;
- Transportation balance Rp100,000, budget expense Rp18,000, payment expense Rp0;
- actual rendered hero/category/payment amounts and ordered report headings;
- section retention and unavailable Sinking configuration in empty historical view;
- no non-GET API calls after login, no page errors.

The test passed on the existing dedicated preview. No synthetic financial response
is used in this new reconciliation test. This is a fixed read-only fixture check,
not proof of mutation-to-screen refresh or concurrent CSV/report snapshots.

Targeted run via `npx tsx --test --test-concurrency=1` on reports.test.ts,
frontendReportRead, frontendPeriodExport, frontendReportDistribution,
frontendReportInsights, frontendWeeklyDisplay and frontendSinkingPreferences:
**59 tests / 4 suites passed, 0 failures/skips** (25597 ms). Uses disposable
`pocketflow_test_7b4_windows`, separate from preview and user data. Includes actual
PostgreSQL route coverage of owner isolation, pagination-independent aggregates,
archived/deleted ledger neutrality, revised allocations and historical nulls.
Route lifecycle tests use test database state changes; not browser mutation flows.

Type-check and both frontend builds last passed earlier on 2026-10-21 (146 modules),
as did six section/browser regression scripts; see Sinking walkthrough. They are
not rerun in this audit-only continuation because application source is unchanged.
Source/diff review and `git diff --check` passed. No full backend suite claim.

## Open findings / next bounded work

1. **Empty-period CTA gap:** ConnectedReportSummary shows an empty message but
   lacks the specification's unified `Catat Pengeluaran` action (current) and
   `Kembali ke Periode Berjalan` (historical). Existing period arrows work, but
   that does not fulfill the explicit empty-state interaction. Wire to existing
   connected expense entry/current-period navigation without repeated CTAs.
2. **Stale introduction copy:** ConnectedApp still says batch/edit are unavailable
   and labels the surface 7C.3. Those functions now exist. Reconcile copy with
   delivered behavior without claiming migration/offline sync/production readiness.
3. **Remaining 7C.4 scope:** connected Home/pocket detail and authenticated
   mutation-to-report/CSV refresh reconciliation are not completed. Do not mix
   local ledger screens with server totals or claim full end-to-end completion.
4. **Known limits:** historical allocation/balance snapshots deferred; midnight
   rollover not automatic; local Sinking exclusions are not cloud preferences;
   independent GETs are not a shared cross-request snapshot during concurrent writes.

No application fix silently included in this review. Next task is presentation
remediation, followed by the remaining 7C.4 integration work.

## Review checklist for Product Owner

At http://127.0.0.1:5175 inspect Laporan against downloaded CSV. Verify top-up stays
transfer-only, NFC payment uses Transportation budget without merging balances,
and historical budget/weekly targets/Sinking stay unavailable. Check exclusion
reload and empty period behavior; the two presentation findings above are known.

Modified files: new reconciliation browser test plus documentation index,
CURRENT_STATE, CURRENT_SPRINT, HANDOFF and this review. Local/uncommitted review
changes only; implementation checkpoint `cad4cfe` is already pushed.
