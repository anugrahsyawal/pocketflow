# Requirement Traceability Matrix

Last updated: 2026-07-21

This matrix highlights delivered MVP behavior and important gaps. The canonical
[Product Backlog](../product/PRODUCT_BACKLOG.md) contains the complete story
inventory.

| Story | Requirement | Design / decision | Implementation evidence | Verification / acceptance | Status |
|---|---|---|---|---|---|
| 1.1 | Development login and protected routes | `DL-003`; production auth TBD | `frontend/src/features/auth/`, `5243596` | Legacy evidence incomplete; accepted with dev-only limitation | Done (dev only) |
| 1.2 | Fixed period 26-25 setup | `PR-002`, `DL-004` | Setup flow and persisted `budgetPeriodStartDay` | Accepted checkpoint; configurable field is documented drift | Partially Done |
| 1.3 | Initial pocket template | `PR-003` | Frontend setup/data; `b84176b`-`1993128` | Legacy evidence incomplete; accepted | Done |
| 2.1 | Pocket list and detail | `PR-004`; Stitch Iteration 2 | Pocket feature; `c966343`-`f052ebc` | Legacy evidence incomplete; accepted | Done |
| 2.2 | Pocket CRUD | `PR-004` | No complete create/edit/archive implementation | Not verified/reviewed | Not Started |
| 3.1-3.2 | Category view and CRUD | `PR-004`; Stitch Iteration 2 | Category feature; `b1c6de2`, `118a068` | Legacy evidence incomplete; accepted | Done |
| 4.1-4.5 | Expense, income, transfer, edit, archive/delete | `PR-005`-`PR-008`, `DEC-022` | Transaction features; `52cd67a`-`4b086c2` | Legacy evidence incomplete; accepted | Done |
| 4.6 | Search and filters | `PR-005` | Grouped history exists; full search/pocket/category/period filters absent | Gap confirmed by source audit | Partially Done |
| 4.7 | Multi-entry expense | `PR-005` | Multi-entry frontend flow | Legacy evidence incomplete; accepted | Done |
| 7.1 | Home financial snapshot | `PR-009`; Iteration 2 handoff | Home feature; `21da5f6`, `61c6a7f` | Accepted with safe-daily/privacy limitations | Partially Done |
| 7.2-7.3 | Pocket alerts and Transportation/NFC summary | `PR-009` | Not implemented as approved | Not verified/reviewed | Not Started |
| 8.1 | Period report 26-25 | `PR-010`, `PR-011`; Reports spec | `ReportsPage`, report helpers; `cc39670` | Reports accepted 2026-07-21 | Done |
| 8.2 | Budget vs Actual per pocket | `PR-011`, `PR-013`; Reports spec | `BudgetVsActualPocketChart`; `cfb1b53` | [Phase 6C](../walkthroughs/phase-6c-budget-vs-actual-and-weekly-usage.md); historical limitation accepted | Partially Done |
| 8.3 | Category and pocket spending analytics | `PR-011`; Reports spec | visual analytics components; `5b478e9` | [Phase 6B](../walkthroughs/phase-6b-reports-visual-analytics.md) | Done |
| 8.4 | Aggregate Weekly Usage | `PR-012`, `PR-013`, `DEC-019` | `WeeklyBudgetUsageChart`; `cfb1b53` | [Phase 6C](../walkthroughs/phase-6c-budget-vs-actual-and-weekly-usage.md) | Done |
| 8.5 | Informational Sinking recommendation | `PR-014`, `DEC-020` | `SinkingFundRecommendationCard`; `9297f37` | [Phase 6D](../walkthroughs/phase-6d-rule-based-insights-and-sinking-fund.md); historical limitation accepted | Partially Done |
| 8.6 | Deterministic rule insights | `PR-011` | `RuleBasedInsightsCard`; `9297f37` | PO manual verification/acceptance 2026-07-21 | Done |
| 9.1 | Local/offline input | `PR-017` | Zustand/localStorage persistence | Local persistence exists; offline app shell unverified/absent | Partially Done |
| 9.2-9.3 | Remote sync/status | `PR-021` | No backend or sync queue | Contracts TBD | Deferred |
| 10.1 | Selected-period CSV | `PR-015` | `frontend/src/lib/reportCsv.ts`; `cc39670` | Reports accepted 2026-07-21 | Done |
| 10.2-10.4 | JSON/server backup and restore | `PR-022` | No implementation | Refinement Needed; not Phase 6E blocker | Refinement Needed |
| 11.1 | Mobile-first UI | `PR-001` | AppShell and feature screens | Full cross-page 375/390/430 verification pending Phase 6E | In Progress |
| 11.2-11.3 | Installable/offline PWA | `PR-017` | Manifest exists; icons/service worker missing | Installability not verified | Partially Done / Not Started |
| 12.1 | Production authentication | `PR-018` | Mock frontend auth only | Provider/session/backend enforcement TBD | Refinement Needed |
| 13.1-13.2 | Goals | `PR-016`, `DL-009` | No implementation | MVP direction accepted; details TBD | Refinement Needed |
| SUP-1 | Settings capability hub | Product direction | Placeholder/supporting UI | Incomplete | Refinement Needed |
