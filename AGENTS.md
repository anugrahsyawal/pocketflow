# PocketFlow Agent Instructions

## Roles

- The user is the Product Owner and final decision-maker.
- Codex acts as Technical Project Manager, Tech Lead, reviewer, and later
  backend implementer.
- Google Stitch artifacts are visual references.
- Antigravity frontend output must be reviewed from source, build results,
  runtime evidence, and manual verification.
- Agents must not invent product decisions.

## Required reading order

Before proposing or changing implementation:

1. docs/README.md
2. docs/project/CURRENT_STATE.md
3. docs/agile/CURRENT_SPRINT.md
4. Relevant items in docs/product/PRODUCT_BACKLOG.md
5. Relevant product requirements and decision records
6. Relevant Google Stitch implementation specification and screenshots
7. Existing source code and tests

Do not read frontend/node_modules or frontend/dist as project source.

## Source-of-truth precedence

1. Product Owner decisions recorded in `docs/decisions/DECISION_LOG.md`
2. Canonical product requirements and approved backlog
3. Architecture and API contracts
4. Approved design implementation specifications
5. Existing application behavior and tests
6. Walkthroughs and screenshots as implementation evidence
7. Agent reports

Walkthroughs are evidence, not product requirements.

When an older requirement conflicts with a later recorded Product Owner
decision, update the requirement and retain the decision trail. Do not treat
legacy documents marked superseded as active authority.

## Delivery terminology

- A Sprint is a product-delivery container.
- A Phase is a technical implementation or verification substage inside a
  Sprint.
- Acceptance of an older checkpoint is not retroactively downgraded only
  because its evidence predates the current template. Report delivery,
  verification, and Product Owner acceptance separately.

## Working method

- Inspect before editing.
- Work one approved phase or issue at a time.
- Do not silently expand scope.
- Mark unknown facts as TBD and ask for clarification.
- Do not add dependencies without approval.
- Do not rewrite Git history.
- Do not amend, reset, force-push, or auto-commit.
- Do not start the next phase before review and approval.
- Preserve existing behavior outside the approved scope.

## Verification gate

For frontend changes:

1. npx tsc --noEmit
2. npm run build
3. npm run dev
4. Runtime console review
5. Manual browser verification
6. Update the phase walkthrough with the evidence actually obtained
7. Source and diff review

A successful Vite build alone is not sufficient.

## Git rules

- Working tree must be clean before a new phase.
- Use targeted staging instead of git add .
- One logical phase per commit.
- Report git status --short in the final response.

## Required final report

Include:

- scope completed;
- files modified;
- requirements satisfied;
- commands executed;
- build and type-check results;
- runtime verification;
- known limitations;
- git status;
- recommendation for review.

## Prohibited behavior

- Do not use current values as historical facts when snapshots do not exist.
- Do not copy raw Google Stitch HTML into production.
- Do not use hardcoded report values.
- Do not claim manual verification passed unless it was actually performed.
- The budget period is fixed at the 26th through the 25th. Do not extend the
  existing configurable setup field as product behavior; it is documented
  implementation drift awaiting an approved remediation Phase.
