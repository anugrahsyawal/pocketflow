# PocketFlow Product Backlog

Version: 1.0
Status: Canonical planning and delivery backlog
Owner: Product Owner (Kyune)
Last updated: 2026-07-21
Supersedes as active backlog authority: `docs/sprint-1-backlog.md` and the
previous pasted Product Backlog v0.1

## How to read this backlog

The pasted Product Backlog v0.1 is an approved planning baseline, not an
immutable final-MVP contract. This canonical version preserves its intent while
reconciling later decisions, accepted checkpoints, current source, and deferred
scope.

Inclusion here does not authorize implementation. `CURRENT_SPRINT.md` defines
committed work, and the Product Owner approves the next Phase.

## Status models

Overall backlog status:

- Done
- Partially Done
- In Progress
- Ready
- Refinement Needed
- Deferred
- Not Started
- Obsolete or Superseded

Supporting dimensions:

| Dimension | Values |
|---|---|
| Delivery | Not Started, In Progress, Implemented |
| Verification | Not Verified, Partially Verified, Verified, Legacy Evidence Incomplete |
| Product Owner acceptance | Not Reviewed, Changes Requested, Accepted, Deferred |

`Done` may be supported by accepted historical checkpoints even when those
checkpoints predate the current evidence template. `Partially Done` means an
acceptance boundary is genuinely unavailable or unimplemented, not merely that
this documentation audit did not rerun the feature.

## Priority values

- Must Have
- Should Have
- Could Have
- Won't Have for MVP
- MVP — ordering TBD

## Epic 0 — Project foundation and repository

| ID | Story | Priority | Overall | Delivery / verification / acceptance | Acceptance and evidence |
|---|---|---|---|---|---|
| 0.1 | Initialize repository | Must Have | Done | Implemented / Legacy Evidence Incomplete / Accepted | Repository, README, docs, frontend, backend placeholder, and traceable Git history exist. Checkpoint: `0f44515`. |
| 0.2 | Canonical documentation spine | Must Have | In Progress | In Progress / Not Verified / Not Reviewed | One active authority per role; factual state, sprint, decisions, backlog, traceability, risks, and handoff contain no placeholders or contradictory Done claims. Current documentation revision awaits review and commit. |

## Epic 1 — Authentication and initial setup

| ID | Story | Priority | Overall | Delivery / verification / acceptance | Acceptance and evidence |
|---|---|---|---|---|---|
| 1.1 | Development mock login and frontend guards | Must Have | Done | Implemented / Legacy Evidence Incomplete / Accepted | Valid mock credential logs in, invalid input shows an error, persisted mock session survives refresh, and private frontend routes redirect unauthenticated users. Source: `useAuthStore.ts`, `ProtectedRoute.tsx`; commit `5243596`. Development-only. |
| 1.2 | Initial setup wizard | Must Have | Partially Done | Implemented / Legacy Evidence Incomplete / Accepted with limitation | Welcome, period, pocket selection, initial balance, review, and Home redirect exist. The approved period is fixed 26–25, but legacy UI/state still permits 1–28. Remediation belongs to Phase 6E or later. Commits `b84176b`–`1993128`. |
| 1.3 | Default pocket template | Must Have | Partially Done | Implemented / Legacy Evidence Incomplete / Accepted with limitation | Required pockets and Rp5,800,000 allocation exist and can be selected; Cash/NFC initial balances are editable. Pre-save editing of every name/allocation/balance is not implemented. |
| 1.4 | Production authentication | Must Have before production | Refinement Needed | Not Started / Not Verified / Deferred | Real authentication and backend enforcement are required before deployment. Provider, session, recovery, and implementation remain TBD before backend work. |

## Epic 2 — Pocket and wallet management

| ID | Story | Priority | Overall | Delivery / verification / acceptance | Acceptance and evidence |
|---|---|---|---|---|---|
| 2.1 | View pocket list and detail | Must Have | Done | Implemented / Legacy Evidence Incomplete / Accepted | Active pockets show name, transaction-derived balance, allocation/wallet state, usage, and status; detail shows metrics, categories, and recent activity. Commits `c966343`, `3b66125`, `335bd3b`, `f052ebc`. |
| 2.2 | Create, edit, and archive pocket | Must Have | Not Started | Not Started / Not Verified / Not Reviewed | User can create a pocket, edit its properties, and archive rather than break transaction history. Archived pockets must be excluded from new-entry defaults. No pocket CRUD actions currently exist. |
| 2.3 | Monthly allocation per pocket | Must Have | Partially Done | Implemented in template/calculations / Legacy Evidence Incomplete / Accepted with limitation | Allocations drive current-period calculations and zero-allocation wallets remain valid. User editing and historical allocation snapshots are not implemented. |

## Epic 3 — Category management

| ID | Story | Priority | Overall | Delivery / verification / acceptance | Acceptance and evidence |
|---|---|---|---|---|---|
| 3.1 | Default categories | Must Have | Done | Implemented / Legacy Evidence Incomplete / Accepted | Defaults initialize for selected pockets, entry forms suggest pocket-scoped categories, and an omitted category is displayed as Tanpa kategori. Commits `b1c6de2`, `118a068`. |
| 3.2 | Create, edit, and archive category | Must Have | Done | Implemented / Legacy Evidence Incomplete / Accepted | Local add/edit/archive behavior exists, historical transaction IDs remain linked, and archived categories leave active choices. Source: `CategoryManagementPage.tsx`, `useCategoryStore.ts`. |

## Epic 4 — Transaction management

| ID | Story | Priority | Overall | Delivery / verification / acceptance | Acceptance and evidence |
|---|---|---|---|---|---|
| 4.1 | Create Expense | Must Have | Done | Implemented / Legacy Evidence Incomplete / Accepted | Amount, pocket, optional category/note, editable date/time, validation, quick amounts, and effective-balance reduction exist. Commits `30c10a6`, `f052ebc`. |
| 4.2 | Create Income | Must Have | Done | Implemented / Legacy Evidence Incomplete / Accepted | Pocket, source, amount, date/time, note, effective-balance increase, and report inclusion exist. Commit `30c10a6`. |
| 4.3 | Create Transfer | Must Have | Done | Implemented / Legacy Evidence Incomplete / Accepted | Distinct source/destination, sufficient-balance validation, transfer type, editable date/time, neutral reporting, and both balance effects exist. Commit `3160ef5`; decision `DL-007`. |
| 4.3a | Budget Reallocation Transfer | Must Have | Implemented | Implemented / Verified / Ready for Review | Neutral transfer type `Pindah Alokasi Budget` (`budget-reallocation`) moving balance and active-period budget allocation simultaneously between Pockets. Current worktree; decision `DEC-023`; [walkthrough](../walkthroughs/budget-reallocation-transfer.md). |
| 4.4 | Edit transaction | Must Have | Done | Implemented / Legacy Evidence Incomplete / Accepted | Expense, Income, and Transfer can be edited; transaction-derived balance automatically reverses the prior effect and applies the new effect. Preserves stored `budgetPocketId` on expense edit unless payment pocket changes. Commit `d6bba74`; current worktree. |
| 4.5 | Archive, restore, and permanently delete | Must Have | Done | Implemented / Legacy Evidence Incomplete / Accepted | Archive is reversible, Restore re-applies impact, and permanent delete is a separately confirmed destructive action. Commit `7979d66`; decision `DEC-022`. Backend tombstone/retention behavior remains future work. |
| 4.6 | Transaction history, search, and filters | Must Have | Partially Done | Implemented in part / Legacy Evidence Incomplete / Accepted with limitation | Grouped active/archive history and type filters exist. Text search plus period, pocket, and category filters from the planning baseline are not implemented. Commit `cf6190c`. |
| 4.7 | Multi-entry Expense capture | Should Have | Done | Implemented / Legacy Evidence Incomplete / Accepted | Multiple Expense drafts validate as one batch, prevent combined overspend, and save atomically to the local store. Commit `4b086c2`. |
| 4.8 | Payment Pocket Budget Attribution & Config | Must Have | Implemented | Implemented / Verified / Ready for Review | Cash and NFC Card budget owner configuration on Pocket Detail page (default Cash → Food & Groceries, default NFC → Transportation). New expenses store attribution in `t.budgetPocketId`. Current worktree; decision `DEC-024`; [walkthrough](../walkthroughs/pocket-cash-nfc-budget-owner-config.md). |

## Epic 5 — Recurring transaction preview

| ID | Story | Priority | Overall | Delivery / verification / acceptance | Acceptance and evidence |
|---|---|---|---|---|---|
| 5.1 | Salary allocation preview | Should Have | Deferred | Not Started / Not Verified / Deferred | Later preview/confirm flow must prevent duplicate application for a period. Sprint 2 or later; decision `DL-010`. |
| 5.2 | MRT daily preview | Should Have | Deferred | Not Started / Not Verified / Deferred | Later workday preview supports confirm/skip and prevents duplicate daily posting. Sprint 2 or later. |

## Epic 6 — JSON receipt import

| ID | Story | Priority | Overall | Delivery / verification / acceptance | Acceptance and evidence |
|---|---|---|---|---|---|
| 6.1 | Copy external-AI prompt | Must Have in later scope | Deferred | Not Started / Not Verified / Deferred | Disabled placeholder exists; operational prompt/schema work is Sprint 2 or later. |
| 6.2 | Paste, validate, and map receipt JSON | Must Have in later scope | Deferred | Not Started / Not Verified / Deferred | Future validation covers structure, amounts, pockets, categories, and mapping. No internal OCR/AI API. Decision `DL-011`. |
| 6.3 | Preview and save receipt group | Must Have in later scope | Deferred | Not Started / Not Verified / Deferred | Future preview covers merchant, totals, items, differences, adjustments, and grouped save. Receipt-group model is not implemented. |

## Epic 7 — Home dashboard

| ID | Story | Priority | Overall | Delivery / verification / acceptance | Acceptance and evidence |
|---|---|---|---|---|---|
| 7.1 | Financial snapshot & Stitch Iteration 5 | Must Have | Implemented | Implemented / Verified / Ready for Review | Total balance, spendable balance, dynamic safe per day, Home privacy toggle, budget progress, and 3 latest transactions aligned with Stitch Iteration 5. Current worktree; [walkthrough](../walkthroughs/home-dashboard-stitch-iteration-5.md). |
| 7.2 | Pocket alert cards ("Butuh perhatian") | Must Have | Implemented | Implemented / Verified / Ready for Review | Horizontal carousel showing max 2 Waspada/Bahaya/Overbudget pockets with direct CTA and positive empty state. Current worktree; [walkthrough](../walkthroughs/home-dashboard-stitch-iteration-5.md). |
| 7.3 | Ringkasan Pocket horizontal carousel | Should Have | Implemented | Implemented / Verified / Ready for Review | Horizontal carousel combining Transportation+NFC, Food+Cash, and all other active non-archived pockets. Current worktree; [walkthrough](../walkthroughs/home-dashboard-stitch-iteration-5.md). |

## Epic 8 — Reports and insights

| ID | Story | Priority | Overall | Delivery / verification / acceptance | Acceptance and evidence |
|---|---|---|---|---|---|
| 8.1 | Period report 26–25 | Must Have | Done | Implemented / Verified / Accepted | Current/historical navigation, inclusive date filtering, totals, transfer neutrality, invalid-date exclusion, and empty states exist. Commit `cc39670`; Product Owner final Reports verification 2026-07-21. |
| 8.2 | Budget vs Actual per pocket | Must Have | Partially Done | Implemented for current period / Verified / Accepted with limitation | Current allocation, expense, status, remaining/overbudget, transfer context, and current balance exist. Historical analysis is unavailable without allocation snapshots. Commit `cfb1b53`. |
| 8.3 | Top spending category and pocket | Must Have | Done | Implemented / Verified / Accepted | Category distribution preserves Tanpa kategori, shows top five plus Lainnya, and ranks top spending pockets. Commit `5b478e9`. |
| 8.4 | Aggregate Weekly Usage | Should Have | Done | Implemented / Verified / Accepted | `total current allocation / 4` with 7–7–7–remainder buckets, temporal state, and financial status. Per-pocket weekly matrix is not required. Commit `cfb1b53`; decision `DEC-019`. |
| 8.5 | Sinking Fund recommendation | Should Have | Partially Done | Implemented for current near-end period / Verified / Accepted with limitation | Spendable candidates, persistent exclusions, positive effective balances, five-day window, and informational amount exist. Already-ended historical recommendation is unavailable without balance snapshots. Commit `9297f37`; decision `DEC-020`. |
| 8.6 | Rule-based insights | Should Have | Done | Implemented / Verified / Accepted | Up to three deterministic insights cover overbudget, current-week warning, category concentration, and cash flow with low-data/historical behavior. Commit `9297f37`; Product Owner accepted 2026-07-21. |

## Epic 9 — Offline input and synchronization

| ID | Story | Priority | Overall | Delivery / verification / acceptance | Acceptance and evidence |
|---|---|---|---|---|---|
| 9.1 | Local/offline transaction input | Must Have | Partially Done | Implemented in part / Partially Verified / Accepted direction | Transactions persist in localStorage, but offline app-shell availability and Pending Sync state are absent. Local/offline input remains an MVP direction. |
| 9.2 | Remote sync queue | Must Have in later integration | Deferred | Not Started / Not Verified / Deferred | Requires backend API, client IDs, idempotency, retry, conflict, deletion propagation, and migration contracts. |
| 9.3 | Sync status indicator | Must Have with remote sync | Deferred | Not Started / Not Verified / Deferred | Synced, Pending, Failed, and Retry behavior waits for the approved sync model. |

## Epic 10 — Export, backup, and restore

| ID | Story | Priority | Overall | Delivery / verification / acceptance | Acceptance and evidence |
|---|---|---|---|---|---|
| 10.1 | Selected-period CSV export | Must Have | Done | Implemented / Verified / Accepted | UTF-8 BOM, formula-injection protection, selected-period filename, resolved labels, and archived exclusion exist. Commit `cc39670`; Reports verification 2026-07-21. |
| 10.2 | Full JSON backup | MVP priority TBD | Refinement Needed | Not Started / Not Verified / Not Reviewed | Release priority, schema/version, included modules, encryption, and storage remain TBD. Not a Phase 6E blocker. |
| 10.3 | JSON restore | MVP priority TBD | Refinement Needed | Not Started / Not Verified / Not Reviewed | Preview, compatibility, validation, overwrite/merge behavior, rollback, and confirmation require refinement. |
| 10.4 | Server database backup | Must Have before production | Refinement Needed | Not Started / Not Verified / Not Reviewed | Platform, retention, encryption, storage, logging, and restore-test frequency are TBD before backend backup implementation. No VM/provider is assumed. |

## Epic 11 — PWA and mobile-first experience

| ID | Story | Priority | Overall | Delivery / verification / acceptance | Acceptance and evidence |
|---|---|---|---|---|---|
| 11.1 | Mobile-first layout | Must Have | In Progress | Implemented in part / Partially Verified / Accepted direction | Mobile shell and screens exist; Phase 6E must complete cross-page checks at 375px, 390px, and 430px, accessibility basics, and overflow review. |
| 11.2 | Installable PWA | Must Have | Partially Done | Implemented in part / Not Verified / Accepted direction | Manifest and standalone metadata exist. Referenced icons are missing, installability is unverified, and warnings remain. Phase 6E gap. |
| 11.3 | Offline app shell | Must Have | Not Started | Not Started / Not Verified / Not Reviewed | Service worker/cache strategy, offline reopening, and helpful unavailable-data states are not implemented. External runtime font/icon dependencies should be minimized. |

## Epic 12 — Security and deployment readiness

| ID | Story | Priority | Overall | Delivery / verification / acceptance | Acceptance and evidence |
|---|---|---|---|---|---|
| 12.1 | Protect private routes | Must Have | Partially Done | Frontend implemented / Legacy Evidence Incomplete / Accepted with limitation | Mock frontend guards exist. Production session expiry and backend endpoint enforcement wait for production authentication. |
| 12.2 | Secure production configuration | Must Have before production | Refinement Needed | Not Started / Not Verified / Not Reviewed | HTTPS, secret management, password/provider security, sensitive logging, headers, and operations controls require backend/deployment decisions. |

## Epic 13 — Goals

| ID | Story | Priority | Overall | Delivery / verification / acceptance | Acceptance and evidence |
|---|---|---|---|---|---|
| 13.1 | Create and manage Goals | MVP — ordering TBD | Refinement Needed | Not Started / Not Verified / Accepted direction | Goals are part of the MVP direction, but fields, lifecycle, targets, dates, completion, and acceptance criteria require Product Owner refinement. Decision `DL-009`. |
| 13.2 | Optional pocket-linked Goal progress | MVP — ordering TBD | Refinement Needed | Not Started / Not Verified / Accepted direction | Define manual vs pocket-derived progress and behavior when linked pockets are archived or transferred. |

## Cross-cutting supporting work

| ID | Story | Priority | Overall | Delivery / verification / acceptance | Acceptance and evidence |
|---|---|---|---|---|---|
| SUP-1 | Settings and preferences hub | MVP — ordering TBD | Refinement Needed | Placeholder only / Not Verified / Accepted direction | Supporting scope includes privacy, app configuration, authentication, backup/sync entry points, and appearance where applicable. It should not imply unimplemented capabilities are active. |

## Legacy-ID mapping

The original pasted backlog already used the canonical Epic 0–12 IDs above.
The older tracked `docs/sprint-1-backlog.md` used a different numbering scheme:

| Legacy Sprint 1 ID | Canonical story |
|---|---|
| 0.1 | 0.1 |
| 0.2 | 0.2 |
| 1.1 Mock Login | 1.1 and future 1.4 |
| 1.2 Protected Routes | 12.1 |
| 1.3 Setup Wizard | 1.2 |
| 1.4 Default Pocket Template | 1.3 |
| 2.1 Pocket List | 2.1 |
| 2.2 Pocket Detail | 2.1 |
| 2.3 Pocket CRUD | 2.2 |
| 3.1 Categories by Pocket | 3.1 |
| 3.2 Category CRUD | 3.2 |
| 4.1 Expense | 4.1 |
| 4.2 Income | 4.2 |
| 4.3 Transfer | 4.3 |
| 4.4 Transaction History | 4.6 |
| 4.5 Transaction Detail/Edit | 4.4 and 4.5 |
| 5.1 Financial Snapshot | 7.1 |
| 5.2 Pocket Alerts/Transport | 7.2 and 7.3 |
| 6.1 Basic Reports | 8.1–8.6 and 10.1 |
| 7.1 Settings | SUP-1 |
| 7.2 Sprint 2 Placeholders | 5.*, 6.*, 9.*, and 10.* as applicable |
| 8.1 Mobile-first Layout | 11.1 |
| 8.2 Basic PWA Manifest | 11.2 |

## Definition of Ready summary

Before a story enters committed sprint scope it must have:

- approved purpose and scope;
- acceptance criteria;
- dependencies and explicit out-of-scope boundaries;
- allowed code/document areas;
- verification instructions using commands that actually exist;
- applicable Definition of Done;
- resolved blocking product decisions.

Refinement Needed and Deferred items are not ready for implementation merely
because they appear in this backlog.
