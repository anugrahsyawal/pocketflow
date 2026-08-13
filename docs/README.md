# PocketFlow Documentation Index

Last updated: 2026-08-13

This index identifies the single active authority for each documentation role.
Relative links below are repository-valid and are checked as part of the docs
checkpoint.

## Product authority

- [Product vision](product/PRODUCT_VISION.md)
- [Product requirements](product/PRODUCT_REQUIREMENTS.md)
- [Product backlog](product/PRODUCT_BACKLOG.md)
- [Decision log](decisions/DECISION_LOG.md)

Product Owner decisions in the canonical decision log take precedence over
older text. The requirements and backlog must be reconciled when a new decision
changes them.

## Current delivery authority

- [Current state](project/CURRENT_STATE.md)
- [Current sprint](agile/CURRENT_SPRINT.md)
- [Progress ledger](agile/PROGRESS.md)
- [Definition of Done](agile/DEFINITION_OF_DONE.md)
- [Risks and blockers](agile/RISKS_AND_BLOCKERS.md)
- [Current handoff](project/HANDOFF.md)
- [Traceability matrix](project/TRACEABILITY_MATRIX.md)
- [Acceptance checklist](quality/ACCEPTANCE_CHECKLIST.md)

## Design authority and visual references

- Repository design system: [`../DESIGN.md`](../DESIGN.md)
- Stitch catalog and classification:
  [Iteration 2](design/google-stitch/iteration-2/README.md) and
  [Iteration 3 Reports](design/google-stitch/iteration-3/README.md)
- Canonical Reports implementation specification:
  [REPORTS_IMPLEMENTATION_SPEC.md](design/google-stitch/iteration-3/REPORTS_IMPLEMENTATION_SPEC.md)

Screenshots are supporting visual evidence. Raw Stitch HTML is a raw visual
reference only and must not be copied into production.

## Verification evidence

- [Phase 6B Reports visual analytics](walkthroughs/phase-6b-reports-visual-analytics.md)
- [Phase 6C Budget vs Actual and Weekly Usage](walkthroughs/phase-6c-budget-vs-actual-and-weekly-usage.md)
- [Phase 6D insights and Sinking Fund](walkthroughs/phase-6d-rule-based-insights-and-sinking-fund.md)
- [Phase 7B.1 Backend Service & Database Foundation](walkthroughs/phase-7b1-backend-foundation.md)
- [Phase 7B.2 Owner Authentication & Secure Session](walkthroughs/phase-7b2-auth-session.md)
- [Phase 7B.2.1 Local PostgreSQL & Auth Integration Verification](walkthroughs/phase-7b21-local-postgres-auth-integration.md)
- [Phase 7B.3 Setup & Master Data API Implementation](walkthroughs/phase-7b3-setup-master-data.md)

Walkthroughs record implementation and verification evidence. They cannot add
requirements or override Product Owner decisions.

## Execution tracking

Repository Markdown remains the canonical planning/execution system and Git
commits remain implementation checkpoints. GitHub Issues or Projects may be
introduced later, but are not required for this documentation bootstrap.

## Approved architecture decision records

- [Backend Architecture Decision Pack](architecture/BACKEND_ARCHITECTURE_DECISION_PACK.md)

## Approved API contracts and specifications

- [Setup & Master Data API Contract Specification](architecture/SETUP_MASTER_DATA_API_CONTRACT.md) (Product Owner Accepted 2026-08-13; Endpoint Implementation Delivered & PO Accepted in Current Delivery Session)

## Legacy documents

The following tracked documents are retained temporarily for review and are
marked superseded as active authority:

- [`product-requirements.md`](product-requirements.md)
- [`decision-log.md`](decision-log.md)
- [`sprint-1-backlog.md`](sprint-1-backlog.md)
- [`qa-checklist.md`](qa-checklist.md)

[`ui-ux-handoff.md`](ui-ux-handoff.md) remains a supporting Iteration 2 design
handoff; its Reports guidance is superseded by the Iteration 3 Reports spec.
No legacy document should be deleted or archived until the Product Owner has
reviewed the canonical replacement and its diff.

Proposed disposition after that review:

- archive `sprint-1-backlog.md` as a useful historical Sprint snapshot;
- remove `product-requirements.md`, `decision-log.md`, and `qa-checklist.md`
  from the working tree after confirming their useful content and mappings are
  preserved; Git history remains their archive;
- retain `ui-ux-handoff.md` as supporting Iteration 2 design evidence.
