# Connected shell refinement — proposed next scope

Date: 2026-10-26
Status: Implementation authorized by Product Owner on 2026-10-26; result acceptance pending
Baseline: `63c342f` pushed on `codex/audit-pocketflow-documentation`

## Why this next

The PO replied "lanjut" to the explicit implementation approval question.
This authorizes this bounded scope only (DEC-038), not a normal-mode cutover.

Mounted-screen navigation, durable create/edit/archive recovery, and bounded
Home/detail/Reports/CSV reconciliation have passed. Do not repeat those gates
indefinitely or treat delivery authorization as full MVP/phase acceptance.

Source inspection of ConnectedApp.tsx shows a development login/session shell
above authenticated content: a large brand header, email, session controls and
status copy claiming Home/detail integration is still being worked on. The
ConnectedPeriodExport footer also says Home/detail integration is forthcoming.
These descriptions lag the delivered checkpoint. main.tsx still defaults to
local mode and dynamically isolates connected mode from local persisted stores.

## Proposed implementation boundary

1. Retain the current unauthenticated login and session bootstrap behavior.
2. Give authenticated connected content a compact mobile-first shell using
   existing tokens/components and approved visual references. Keep an explicit
   development-preview indicator; do not imply production readiness.
3. Keep session check and logout accessible in a compact session area. Do not
   invent account/profile editing, upload, settings persistence or new endpoints.
4. Update stale scope copy in session, report and empty-state descriptions.
5. Preserve mounted screen owners, navigation locks, visible recovery notices,
   explicit retry/confirmation, owner isolation and error/session-expiry handling.
6. Keep local mode, its storage and the default VITE_DATA_MODE behavior unchanged.

This is a UI shell refinement, not an API rewrite or an instruction to copy
Google Stitch HTML. Before implementation read DESIGN.md, the relevant approved
Stitch specifications/screenshots, and existing layout/session components.

## Explicit exclusions

- Normal-mode cutover or removal of the existing local app.
- Supabase/Vercel/provider selection, deployment, account creation or billing.
- Legacy-data migration, offline queue/sync, backup/restore or new product rules.
- Full URL routing, browser-history semantics for all screens, or lazy loading.
- New dependencies, changes to financial calculations, API/auth contracts.
- Automatic commit/push, new-phase start or full Phase 7C.4 acceptance.

## Verification and acceptance

- Type-check, local and connected production builds, source/diff review.
- Browser checks for login, failed/expired session, logout/relogin and preserved
  owner-scoped pending recovery; no silent local fallback.
- Mounted-screen focus/locks, privacy and global recovery notices remain usable.
- Mobile 375/390/430px and desktop: no horizontal page overflow, keyboard access
  to session controls, no bottom navigation overlap with final actionable content.
- Review console and screenshots; PO manual acceptance recorded separately.
- No need to add another financial feature to satisfy this proposal.

## Current closure distinction

`63c342f` is delivered. Its documented checks passed; full backend-suite rerun,
every legacy specialized browser script, production readiness and complete MVP
acceptance are not claimed. The mounted-screen checkpoint is ready for manual
PO review. Approving this proposal authorizes only the bounded refinement above.
