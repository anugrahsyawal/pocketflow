# Current Sprint

Sprint: Frontend MVP Completion
Status: In Progress
Current checkpoint: Documentation normalization and Product Owner review

## Terminology

A Sprint is the product-delivery container. A Phase is a technical
implementation or verification substage inside the Sprint.

## Sprint goal

Finish integrated frontend quality work and produce a truthful, traceable
handoff before backend planning begins.

## Completed phase

Phase 6D - Rule-Based Insights and Sinking Fund Recommendation is Done.
Product Owner manual verification and acceptance: 2026-07-21.
Pushed commit: `9297f37`.

## Current committed checkpoint

Documentation-only normalization:

- establish one canonical active document per authority;
- reconcile approved decisions, requirements, backlog, and actual source state;
- correct stale Phase 6D evidence and broken Stitch references;
- record traceability, risks, acceptance gates, and handoff;
- preserve legacy material until the Product Owner reviews the diff.

No application-source changes, dependency additions, staging, commits, pushes,
or Phase 6E implementation are in scope for this checkpoint.

## Next approved phase - not started

Phase 6E - Integrated Reports QA and frontend polish:

- integrated Reports regression and state coverage;
- cross-page/mobile regression at 375px, 390px, and 430px;
- runtime console review and warning triage;
- PWA icon/metadata/installability quality work;
- frontend architecture/handoff accuracy;
- frontend-to-backend contract preparation only where explicitly approved.

Phase 6E may start only after the current docs are reviewed, committed in one
targeted commit, pushed, and the worktree is clean.

## Explicitly out of scope

- Backend implementation, database, and deployment.
- Production authentication implementation.
- Remote synchronization.
- Historical allocation/balance snapshots.
- Automatic Sinking Fund transfers.
- JSON receipt import, backup/restore implementation, Goals implementation,
  and other unrefined Sprint 2/later capabilities.

## Sprint success conditions

- Approved scope and acceptance criteria are traceable.
- TypeScript and production build pass for the implementation checkpoint.
- Runtime and browser evidence is recorded without overstating what was tested.
- Main flows have no uncaught browser errors.
- Mobile layouts are checked at 375px, 390px, and 430px.
- PWA gaps and warnings are either resolved or explicitly accepted/deferred.
- Current state, backlog, traceability, walkthrough, and handoff agree.
