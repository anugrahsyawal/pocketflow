# PocketFlow Current State

Last updated: 2026-07-21
Branch: `main`
Verified application checkpoint: `9297f37`

## Executive state

PocketFlow is a single-user, mobile-first personal finance frontend. Reports
Phase 6D is Done: the Product Owner manually verified and accepted the
application on 2026-07-21, and commit `9297f37` is pushed to `origin/main`.
Detailed browser/version evidence was not captured for that acceptance.

The current worktree contains the intentional documentation-spine draft and
this normalization work. Phase 6E is approved next but has not started.

Local `frontend/node_modules/` and `frontend/dist/` directories exist as
ignored generated/dependency output. They are not tracked and must not be read
as project source.

## Implemented and accepted

- Mock frontend authentication and protected routes for development.
- Setup wizard and initial pocket template.
- Pocket list/detail and category management.
- Expense, income, transfer, edit, archive, restore, permanent delete, and
  multi-entry expense flows.
- Transaction history and detail.
- Home financial summary and recent activity.
- Reports period navigation, cash-flow analytics, category/pocket breakdowns,
  Budget vs Actual, aggregate weekly usage, deterministic insights,
  informational Sinking Fund recommendation, and selected-period CSV export.

Accepted legacy checkpoints remain accepted. Where older walkthroughs lack the
current evidence detail, their verification dimension is recorded as Legacy
Evidence Incomplete rather than retroactively changing Product Owner acceptance.

## Partially implemented or drifted

- Home does not yet provide all approved safe-daily, privacy, pocket-alert, and
  combined Transportation/NFC behavior.
- Transaction history lacks the full approved search and pocket/category/period
  filter set.
- Pocket create/edit/archive management is not implemented.
- Reports cannot reconstruct historical allocations or balances because no
  historical snapshot model exists.
- LocalStorage provides local persistence, but the installable/offline PWA shell
  is incomplete.
- The setup flow exposes `budgetPeriodStartDay` even though the approved product
  period is fixed at 26-25. This is implementation drift for Phase 6E or a later
  approved remediation; no data migration or code removal is authorized now.
- Settings is a supporting placeholder rather than a complete capability hub.

## Not implemented

- Backend, database, and API.
- Production authentication.
- Remote synchronization and conflict/deletion propagation.
- Production backup/restore and deployment.
- Goals.
- JSON receipt import and other Sprint 2/later capabilities.

## Backend readiness

Backend work is not ready to implement. Framework, database, production
authentication provider/session model, sync identity/idempotency/conflict
rules, archive/delete propagation, backup/restore policy, security operations,
and deployment platform remain TBD or Refinement Needed. The future data model
must not preclude historical allocation/balance snapshots.

## Approved next phase

Phase 6E - Integrated Reports QA and frontend polish.

Entry conditions:

1. This documentation checkpoint is reviewed by the Product Owner.
2. The docs-only changes are recorded in one targeted commit and pushed.
3. The worktree is clean.
4. Phase 6E acceptance scope is reconfirmed from the backlog and checklist.

## Known quality gaps for Phase 6E

- Manifest references missing 192px and 512px icons.
- No service worker/offline app-shell implementation.
- Installability has not been verified.
- `mobile-web-app-capable` and React Router future-flag warnings need review.
- External runtime fonts/icons should be minimized or removed for offline PWA
  reliability.
- Cross-page browser verification at 375px, 390px, and 430px is pending.

## Current blockers

No implementation blocker is recorded. Phase 6E is intentionally gated by the
documentation review/commit/clean-worktree sequence above.

## Do not start

- Backend or production infrastructure.
- Historical snapshot implementation.
- Automatic Sinking Fund transfer.
- Unrefined Sprint 2/later features.
- Any application-source change as part of this documentation checkpoint.
