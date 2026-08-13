# Requirement Traceability Matrix

Last updated: 2026-08-13

This matrix highlights delivered MVP behavior and important gaps. The canonical
[Product Backlog](../product/PRODUCT_BACKLOG.md) contains the complete story
inventory.

| Story | Requirement | Design / decision | Implementation evidence | Verification / acceptance | Status |
|---|---|---|---|---|---|
| 1.1 | Development login and protected routes | `DL-003`; production auth TBD | `frontend/src/features/auth/`, `5243596` | Legacy evidence incomplete; accepted with dev-only limitation | Done (dev only) |
| 1.2 | Fixed period 26-25 setup | `PR-002`, `DL-004`, `SETUP_MASTER_DATA_API_CONTRACT.md` | Frontend setup flow; Backend setup endpoints `GET /v1/setup` & `PUT /v1/setup` delivered in Phase 7B.3 (`6cff955891bc4e09db4a4a08a3a3cf1ecfb17926`) | Setup API verified in [phase-7b3-setup-master-data.md](../walkthroughs/phase-7b3-setup-master-data.md); frontend configurable field remains documented drift | Partially Done |
| 1.3 | Initial pocket template | `PR-003` | Frontend setup/data; `b84176b`-`1993128` | Legacy evidence incomplete; accepted | Done |
| 2.1 | Pocket list and detail | `PR-004`; Stitch Iteration 2 | Pocket feature; `c966343`-`f052ebc` | Legacy evidence incomplete; accepted | Done |
| 2.2 | Pocket read, update, and archive | `SETUP_MASTER_DATA_API_CONTRACT.md` (`GET /v1/pockets`, `GET /v1/pockets/:id`, `PATCH /v1/pockets/:id`) | Phase 7B.3 backend endpoint implementation delivered in commit `6cff955891bc4e09db4a4a08a3a3cf1ecfb17926`; 106 integration tests pass. `POST /v1/pockets` remains absent from approved route list | Verified in [phase-7b3-setup-master-data.md](../walkthroughs/phase-7b3-setup-master-data.md); PO Accepted (current delivery session) | Done |
| 3.1-3.2 | Category view and CRUD | `PR-004`, `SETUP_MASTER_DATA_API_CONTRACT.md` | Frontend category UI; Backend `GET /v1/categories`, `POST /v1/categories`, `PATCH /v1/categories/:id` delivered in Phase 7B.3 (`6cff955891bc4e09db4a4a08a3a3cf1ecfb17926`) | Verified in [phase-7b3-setup-master-data.md](../walkthroughs/phase-7b3-setup-master-data.md); PO Accepted (current delivery session) | Done |
| 4.1-4.5 | Expense, income, transfer, edit, archive/delete | `PR-005`-`PR-008`, `DEC-022` | Transaction features; `52cd67a`-`4b086c2` | Legacy evidence incomplete; accepted | Done |
| 4.6 | Search and filters | `PR-005` | Grouped history exists; full search/pocket/category/period filters absent | Gap confirmed by source audit | Partially Done |
| 4.7 | Multi-entry expense | `PR-005` | Multi-entry frontend flow | Legacy evidence incomplete; accepted | Done |
| 7.1-7.3 | Home Dashboard Iteration 5 (Hero, Ringkasan Carousel, Butuh Perhatian, Privacy) | `PR-009`, Stitch Iteration 5 | `HomePage.tsx`, `balanceCalculations.ts` | [home-dashboard-stitch-iteration-5.md](../walkthroughs/home-dashboard-stitch-iteration-5.md) | Implemented / Ready for Review |
| 8.1 | Period report 26-25 | `PR-010`, `PR-011`; Reports spec | `ReportsPage`, report helpers; `cc39670` | Reports accepted 2026-07-21 | Done |
| 8.2 | Budget vs Actual per pocket | `PR-011`, `PR-013`; Reports spec | `BudgetVsActualPocketChart`; `cfb1b53` | [Phase 6C](../walkthroughs/phase-6c-budget-vs-actual-and-weekly-usage.md); historical limitation accepted | Partially Done |
| 8.3 | Category and pocket spending analytics | `PR-011`; Reports spec | visual analytics components; `5b478e9` | [Phase 6B](../walkthroughs/phase-6b-reports-visual-analytics.md) | Done |
| 8.4 | Aggregate Weekly Usage | `PR-012`, `PR-013`, `DEC-019` | `WeeklyBudgetUsageChart`; `cfb1b53` | [Phase 6C](../walkthroughs/phase-6c-budget-vs-actual-and-weekly-usage.md) | Done |
| 8.5 | Informational Sinking recommendation | `PR-014`, `DEC-020` | `SinkingFundRecommendationCard`; `9297f37` | [Phase 6D](../walkthroughs/phase-6d-rule-based-insights-and-sinking-fund.md); historical limitation accepted | Partially Done |
| 8.6 | Deterministic rule insights | `PR-011` | `RuleBasedInsightsCard`; `9297f37` | PO manual verification/acceptance 2026-07-21 | Done |
| 4.3a | Budget Reallocation Transfer | `DEC-023` | `AddTransferPage.tsx`, `balanceCalculations.ts`, `reportCalculations.ts` | [budget-reallocation-transfer.md](../walkthroughs/budget-reallocation-transfer.md) | Implemented / Ready for Review |
| 4.8 | Payment Pocket Budget Attribution & Config | `DEC-024` | `PocketDetailPage.tsx`, `usePocketStore.ts`, `balanceCalculations.ts`, `AddExpensePage.tsx`, `TransactionEditPage.tsx` | [payment-pocket-budget-attribution.md](../walkthroughs/payment-pocket-budget-attribution.md), [pocket-cash-nfc-budget-owner-config.md](../walkthroughs/pocket-cash-nfc-budget-owner-config.md) | Implemented / Ready for Review |
| 4.1/4.3/8.1/8.2 | UI Refinements (Selector Pills, Reports Period/Card/Export) | `DL-013`, `DL-015` | `AddIncomePage.tsx`, `AddTransferPage.tsx`, `ReportsPage.tsx` | [income-transfer-selector-ui-refinement.md](../walkthroughs/income-transfer-selector-ui-refinement.md), [reports-full-width-period-selector.md](../walkthroughs/reports-full-width-period-selector.md), [reports-anggaran-periode-card-stitch-alignment.md](../walkthroughs/reports-anggaran-periode-card-stitch-alignment.md), [reports-export-csv-button-refinement.md](../walkthroughs/reports-export-csv-button-refinement.md) | Implemented / Ready for Review |
| 9.1 | Local/offline input | `PR-017` | Zustand/localStorage persistence | Local persistence exists; offline app shell unverified/absent | Partially Done |
| 9.2-9.3 | Remote sync/status | `PR-021` | No backend or sync queue | Contracts TBD | Deferred |
| 10.1 | Selected-period CSV | `PR-015` | `frontend/src/lib/reportCsv.ts`; `cc39670` | Reports accepted 2026-07-21 | Done |
| 10.2-10.4 | JSON/server backup and restore | `PR-022` | No implementation | Refinement Needed; not Phase 6E blocker | Refinement Needed |
| 11.1 | Mobile-first UI | `PR-001` | AppShell and feature screens | Cross-page 375/390/430 manual verification passed | Implemented / Ready for Review |
| 11.2-11.3 | Installable/offline PWA | `PR-017` | Manifest & icons exist in `frontend/public/`; service worker absent | Manifest & icons verified; installability & offline shell pending | Partially Done |
| 1.4/12.1 | Production owner authentication & session | `PR-018`, `DEC-026`, `DEC-029` | `backend/src/routes/auth.ts`, `backend/src/cli/provision-owner.ts`, `e346d8f`, `7e6c6b5` | Verified on VM (Docker Postgres, live migrations, CLI owner provisioning, 13-point HTTP auth matrix) in [phase-7b21-local-postgres-auth-integration.md](../walkthroughs/phase-7b21-local-postgres-auth-integration.md) | Implemented / Ready for Review |
| 13.1-13.2 | Goals | `PR-016`, `DL-009` | No implementation | MVP direction accepted; details TBD | Refinement Needed |
| SUP-1 | Settings capability hub | Product direction | Placeholder/supporting UI | Incomplete | Refinement Needed |
