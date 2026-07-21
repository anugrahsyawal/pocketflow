# Acceptance Checklist

Last updated: 2026-07-21

## A. Documentation normalization checkpoint

- [x] Canonical vision, requirements, backlog, and decision log exist.
- [x] Phase 6D is recorded as Done and Product Owner-accepted on 2026-07-21.
- [x] Delivery, verification, and Product Owner acceptance are separated.
- [x] Fixed 26-25 period and configurable setup-field drift are explicit.
- [x] Weekly Usage uses aggregate allocation divided by four and 7-7-7-rest
  buckets; per-pocket analysis remains Budget vs Actual.
- [x] Goals remain in MVP direction; JSON receipt work is Sprint 2 or later.
- [x] Local/offline input remains MVP direction; remote sync is later work.
- [x] Legacy documents are marked superseded rather than deleted.
- [x] Internal Markdown links and literal repo references pass final validation.
- [x] `git diff --check` passes.
- [ ] Product Owner reviews and accepts the docs diff.
- [ ] One targeted docs-only commit is created and pushed after approval.
- [ ] Worktree is clean before Phase 6E begins.

## B. Phase 6E entry gate

- [ ] Section A is complete.
- [ ] Phase 6E story boundaries and allowed files are reconfirmed.
- [ ] No backend, production auth, remote sync, or unrelated feature work is
  included.

## C. Phase 6E implementation verification

- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run build` passes.
- [ ] `npm run dev` starts and hard-refresh routes load.
- [ ] Runtime console has no uncaught errors; material warnings are resolved or
  explicitly documented.
- [ ] Reports current populated, historical populated, empty, income-only, and
  transfer-only states are checked.
- [ ] Transaction archive/restore effects are checked.
- [ ] 375px, 390px, and 430px layouts have no page-level horizontal overflow.
- [ ] PWA manifest icons/metadata and installability are checked.
- [ ] Offline behavior is tested only after an offline app-shell strategy is
  approved and implemented.
- [ ] Walkthrough records performer, date, browser/version when available, and
  actual outcomes.
- [ ] Source and final diff are reviewed.
- [ ] Current state, backlog, progress, traceability, risks, and handoff agree.

## D. Pre-production gates (future)

- [ ] Real authentication and backend authorization are approved and verified.
- [ ] Remote sync/idempotency/conflict/delete propagation contracts are approved.
- [ ] Backup retention, encryption, storage, and restore-test policy are approved.
- [ ] Deployment platform and security/operations controls are approved.
- [ ] Historical snapshots are either implemented or retained as an explicit
  accepted limitation.
