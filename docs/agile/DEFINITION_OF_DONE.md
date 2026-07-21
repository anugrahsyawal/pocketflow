# Definition of Done

This Definition of Done applies prospectively to new work. It improves future
evidence without retroactively withdrawing Product Owner acceptance from older
checkpoints. For legacy work, explicitly record `Legacy Evidence Incomplete`
where applicable.

## Product

- Acceptance criteria are satisfied against the approved backlog.
- Scope matches the approved Sprint and Phase.
- Product decisions are recorded in the canonical decision log.
- Historical limitations and deferred behavior are stated truthfully.

## Source

- No hardcoded business/report values.
- No unapproved dependency.
- No unrelated refactor.
- Existing behavior outside scope remains intact.
- Source and final diff are reviewed.

## Automated verification

- `npx tsc --noEmit` passes for frontend implementation changes.
- `npm run build` passes for frontend implementation changes.
- Relevant tests pass when test commands exist.
- Missing test/lint scripts are reported; nonexistent commands are not claimed.

## Runtime verification

- `npm run dev` starts successfully.
- Target routes and relevant state variants open after a hard refresh.
- Runtime console is reviewed for uncaught errors and material warnings.
- Manual browser results identify performer/date and, where available,
  browser/version.

## UI and PWA

- Approved visual references are compared without copying raw Stitch HTML.
- Existing AppShell and BottomNav are preserved unless scope says otherwise.
- No page-level horizontal overflow at 375px, 390px, and 430px.
- Accessibility basics and keyboard/touch interactions are checked.
- Installability/offline claims are backed by actual verification.

## Documentation

- Walkthrough is updated after actual verification.
- Current state, backlog, progress, traceability, risks, and handoff agree.
- Known limitations and unresolved Product Owner decisions are marked TBD.
- Internal documentation links are valid.

## Git and acceptance

- Working tree contains only intended changes.
- Targeted files are staged; do not use `git add .`.
- One logical Phase or checkpoint per commit.
- Commit is pushed only after Product Owner review/approval.
- Product Owner acceptance is recorded separately from delivery and technical
  verification.
