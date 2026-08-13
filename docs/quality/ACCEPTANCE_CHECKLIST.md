# Acceptance Checklist

Last updated: 2026-08-13

## A. Documentation normalization checkpoint

- [x] Canonical vision, requirements, backlog, and decision log exist.
- [x] Phase 6D is recorded as Done and Product Owner-accepted on 2026-07-21.
- [x] Delivery, verification, and Product Owner acceptance are separated.
- [x] Fixed 26-25 period and configurable setup-field drift are explicit.
- [x] Weekly Usage uses aggregate allocation divided by four and 7-7-7-rest buckets; per-pocket analysis remains Budget vs Actual.
- [x] Goals remain in MVP direction; JSON receipt work is Sprint 2 or later.
- [x] Local/offline input remains MVP direction; remote sync is later work.
- [x] Legacy documents are marked superseded rather than deleted.
- [x] Internal Markdown links and literal repo references pass final validation.
- [x] `git diff --check` passes.
- [x] Product Owner reviews and accepts the docs diff.
- [x] One targeted docs-only commit is created and pushed after approval.
- [x] Worktree is clean before Phase 6E begins.

## B. Phase 6E entry gate

- [x] Section A is complete.
- [x] Phase 6E story boundaries and allowed files are reconfirmed.
- [x] No backend, production auth, remote sync, or unrelated feature work is included.

## C. Phase 6E implementation & frontend polish verification

- [x] `npx tsc --noEmit` passes with 0 errors.
- [x] `npm run build` passes cleanly.
- [x] `npm run dev` starts and runs without application runtime errors.
- [x] Runtime console reviewed: 0 app errors; React Router v7 future-flag warnings documented as known non-blocking library notice.
- [x] Reports current populated, historical populated, empty, income-only, and transfer-only states are checked.
- [x] Transaction archive/restore/delete effects are checked.
- [x] 375px, 390px, and 430px layouts checked; no horizontal overflow.
- [ ] PWA browser installability (manifest & icon assets exist and match declared dimensions; browser installability remains pending).
- [ ] Offline capability (no service worker app shell is implemented; application is documented as not offline-ready).
- [x] Walkthroughs record performer, date, actual command outputs, and verified outcomes.
- [x] Source and final diff are reviewed.
- [x] Current state, backlog, progress, traceability, risks, and handoff agree.

## D. Phase 7B Backend Foundation & Auth Integration Gates

- [x] Phase 7B.1 Backend foundation implemented & verified (`4ac8790`); PO Acceptance Pending.
- [x] Phase 7B.2 Owner authentication & sessions implemented (`e346d8f`); PO Acceptance Pending.
- [x] Phase 7B.2.1 Local PostgreSQL & Auth matrix verified on VM on 2026-08-12 (`7e6c6b5910e23a31f419362b75ee371956a1b314`); PO Acceptance Pending.
- [x] Phase 7B.2.2 Backend canonical documentation reconciled (Reconciled and formally accepted by Product Owner on 2026-08-13).
- [x] Phase 7B.3 Setup & Master Data contract gate specification created (`SETUP_MASTER_DATA_API_CONTRACT.md`) (Approved specification formally accepted by Product Owner on 2026-08-13).
- [x] Phase 7B.3 Setup & Master Data API endpoints implementation (Delivered in commit `6cff955891bc4e09db4a4a08a3a3cf1ecfb17926`, Tech Lead independently verified with 106 integration tests, PO accepted in current delivery session, pushed to `origin/main`).

## E. Pre-production gates (future)

- [ ] Real authentication and backend authorization are approved and verified.
- [x] Backup policy baseline approved (DEC-028: daily encrypted, 30-day retention, monthly restore test).
- [ ] Production deployment platform, host storage, and restore verification executed.
- [ ] Remote sync/idempotency/conflict/delete propagation contracts are approved.
- [ ] Deployment platform and security/operations controls are approved.
- [ ] Historical snapshots are either implemented or retained as an explicit accepted limitation.
