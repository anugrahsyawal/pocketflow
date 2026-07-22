# PocketFlow Current State

Last updated: 2026-07-22
Branch: `main`
Verified application checkpoint: `9297f37` + working tree changes

## Executive state

PocketFlow is a single-user, mobile-first personal finance frontend. The implementation in the current worktree is ready for review: it has passed `npx tsc --noEmit`, `npm run build`, and the recorded manual mobile regression at 375px, 390px, and 430px. This does not imply that every MVP capability is complete; remaining gaps are listed below.

Recent implemented features:
1. `Pindah Alokasi Budget` (`budget-reallocation`) transfer type.
2. Payment Pocket budget owner configuration on Cash & NFC Card detail pages.
3. Income Source and Transfer Type flex-wrap pill selector UI matching Category entry style.
4. Reports UI enhancements: full-width period selector, Google Stitch Iteration 3 "Anggaran Periode" card, and compact Export CSV utility button.
5. Legacy transaction budget attribution preservation on expense edit.

Local `frontend/node_modules/` and `frontend/dist/` directories exist as ignored generated/dependency output. They are not tracked and must not be read as project source.

## Implemented and accepted

- Mock frontend authentication and protected routes for development.
- Setup wizard and initial pocket template.
- Pocket list/detail and category management.
- Expense, income, transfer, edit, archive, restore, permanent delete, and multi-entry expense flows.
- `Pindah Alokasi Budget` transfer type for active period allocation and balance reallocation.
- Pocket budget owner configuration on Cash & NFC Card detail pages with fallback to payment pocket.
- Transaction history and detail with budget attribution subtext.
- Home financial summary and recent activity.
- Reports period navigation, full-width period selector, Google Stitch Iteration 3 Anggaran Periode card, cash-flow analytics, category/pocket breakdowns, Budget vs Actual, aggregate weekly usage, deterministic insights, informational Sinking Fund recommendation, and selected-period CSV export.

Accepted legacy checkpoints remain accepted. Where older walkthroughs lack the current evidence detail, their verification dimension is recorded as Legacy Evidence Incomplete rather than retroactively changing Product Owner acceptance.

## Partially implemented or drifted

- Home does not yet provide all approved safe-daily, privacy, pocket-alert, and combined Transportation/NFC behavior.
- Transaction history lacks the full approved search and pocket/category/period filter set.
- Pocket create/edit/archive management is not implemented.
- Reports cannot reconstruct historical allocations or balances because no historical snapshot model exists.
- LocalStorage provides local persistence. Manifest and icon assets exist in `frontend/public/`, but no service worker app shell exists (application is not offline-ready; browser installability remains pending).
- The setup flow exposes `budgetPeriodStartDay` even though the approved product period is fixed at 26-25. This is implementation drift; no data migration or code removal is authorized now.
- Settings is a supporting placeholder rather than a complete capability hub.

## Not implemented

- Backend, database, and API.
- Production authentication.
- Remote synchronization and conflict/deletion propagation.
- Production backup/restore and deployment.
- Goals.
- JSON receipt import and other Sprint 2/later capabilities.

## Backend readiness

Backend work is not ready to implement. Framework, database, production authentication provider/session model, sync identity/idempotency/conflict rules, archive/delete propagation, backup/restore policy, security operations, and deployment platform remain TBD or Refinement Needed. The future data model must not preclude historical allocation/balance snapshots.

## Final frontend readiness state

Frontend implementation is ready for review; automated checks and recorded manual regression passed, with PWA installability and offline shell remaining pending:
- `npx tsc --noEmit` passes with 0 errors.
- `npm run build` passes cleanly (*artifact hash may differ on subsequent combined revisions*).
- Dev server runs cleanly without application runtime errors.
- Cross-viewport testing (375px, 390px, 430px) verified.
- Manual test matrix (Reports, Transfers, Budget Reallocation, Cash/NFC Config, Edit Preservation, Archive/Restore/Delete) verified.

## Known quality gaps

- No service worker/offline app-shell implementation (not offline-ready).
- PWA manifest & icon assets exist, but browser installability / install prompt remains unverified/pending.
- React Router `v7_startTransition` and `v7_relativeSplatPath` warnings present in browser console (known non-blocking library notice).
- External Google Fonts/Material Symbols icons rely on network access.

## Current blockers

No implementation blocker is recorded. Working tree is prepared for PM review and commit.

## Do not start

- Backend or production infrastructure.
- Historical snapshot implementation.
- Automatic Sinking Fund transfer.
- Unrefined Sprint 2/later features.
