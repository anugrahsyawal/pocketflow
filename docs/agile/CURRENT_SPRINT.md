# Current Sprint

Sprint: Frontend MVP Completion
Status: In Progress
Current checkpoint: Phase 7B entry preparation -- Backend Foundation

## Terminology

A Sprint is the product-delivery container. A Phase is a technical
implementation or verification substage inside the Sprint.

## Sprint goal

Finish integrated frontend quality work and produce a truthful, traceable
handoff before backend planning begins.

## Completed phases & polish

- Phase 6D - Rule-Based Insights and Sinking Fund Recommendation (Done, commit `9297f37`).
- Phase 6E - Integrated Reports QA, PWA Asset Verification, and Frontend Polish (Done in current worktree).
- MVP Pindah Alokasi Budget (`budget-reallocation`) transfer type (Done in current worktree).
- Payment Pocket Budget Owner Configuration for Cash & NFC Card (Done in current worktree).
- Income Source & Transfer Type flex-wrap pill selector UI refinement (Done in current worktree).
- Reports UI alignment: full-width period selector, Google Stitch Iteration 3 Anggaran Periode card, and Export CSV button refinement (Done in current worktree).

## Completed checkpoint

Documentation-only normalization:

- establish one canonical active document per authority;
- reconcile approved decisions, requirements, backlog, and actual source state;
- correct stale Phase 6D evidence and broken Stitch references;
- record traceability, risks, acceptance gates, and handoff;
- preserve legacy material until the Product Owner reviews the diff.

The documentation checkpoint was accepted, committed as `e35756b`, pushed, and
followed by clean worktree confirmations.

## Active status

Frontend MVP work is committed through `b3d7f99`. Phase 7A decisions are
approved. Phase 7B may begin with a bounded backend foundation task for
Antigravity; production deployment remains a separate approved phase.

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
