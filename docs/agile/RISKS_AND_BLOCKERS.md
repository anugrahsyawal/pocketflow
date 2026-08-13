# Risks and Blockers

Last updated: 2026-08-13

| ID | Risk or blocker | State | Impact | Mitigation / next decision |
|---|---|---|---|---|
| R-001 | Fixed 26-25 product period conflicts with configurable `budgetPeriodStartDay` setup state. | Open drift; not a current blocker | Future data/UX ambiguity | Document as drift; remediate only in Phase 6E or later approved scope. Backend strictly enforces 26–25 period rules and does not accept configurable start day. |
| R-002 | PWA installability is not yet browser-verified. | Mitigated in Phase 6E; verification pending | Installability/warnings | Local 192px, 512px, and Apple-touch icons plus standard metadata now exist. Verify install behavior in a supported browser. |
| R-003 | No service worker or offline app-shell strategy. | Open | MVP offline/PWA direction incomplete | Refine cache/update/offline behavior before implementation. Local transaction persistence alone is not full offline support. |
| R-004 | External runtime fonts/icons may fail offline. | Open | Visual degradation and network dependence | Minimize or remove external dependencies during approved PWA work. |
| R-005 | Historical allocation/balance snapshots do not exist. | Accepted limitation | Historical Reports cannot reconstruct allocation or Sinking recommendation | Keep honest placeholders; defer model design. Do not infer history from current values. |
| R-006 | Production authentication provider/session model for backend. | Implemented & Verified; PO Acceptance Pending | Single-owner CLI provisioning & 30-day session cookies implemented | Implemented & verified on VM in Phase 7B.2 & Phase 7B.2.1 on 2026-08-12 (DEC-026, DEC-029). PO Acceptance Pending. |
| R-007 | Remote sync contracts are undefined. | Partially resolved | Initial sync conflict policy defined as Reload-only (DEC-027) | Full sync queue & deletion propagation deferred to later phase. |
| R-008 | Backup baseline and retention policy. | Resolved baseline | Data recovery & retention baseline defined | Encrypted daily backup, 30-day retention, monthly restore test accepted (DEC-028). Deployment platform/topology selection pending. |
| R-009 | Deployment platform and topology is TBD. | Refinement Needed | Security/operations requirements cannot be finalized | Select managed app platform & PostgreSQL when pre-production deployment is approved. |
| R-010 | Automated backend test/spec runner script is absent. | Open quality gap | Backend integration verification relies on manual steps | Establish `npm run test:integration` runner as prerequisite for Phase 7B.3. |
| R-011 | Documentation normalization was previously uncommitted. | Resolved | Phase 6E entry gate | Committed and pushed as `e35756b`; worktree was clean before Phase 6E began. |
| R-012 | CLI owner provisioning check-then-insert is not concurrency atomic. | Known backend limitation | Concurrent CLI provisioning invocations could race | Accept limitation for single-owner CLI script; avoid concurrent execution. |
| R-013 | Session rotation revoke-then-insert is non-atomic. | Known backend limitation | Session revocation and new session creation happen in separate DB steps | Wrap session rotation in explicit DB transaction during future hardening. |
| R-014 | Backend `/health` endpoint checks service status only. | Known backend limitation | `/health` returns HTTP 200 even if database connection fails | Add explicit DB health check ping in future monitoring refinement. |

## Current blockers

There is no application code blocker. The base checkpoint `7e6c6b5910e23a31f419362b75ee371956a1b314` was clean before this task began. This documentation set constitutes the Product Owner-accepted docs-only checkpoint dated 2026-08-13 for Phase 7B.2.2 documentation reconciliation and Phase 7B.3 contract gate specification (`SETUP_MASTER_DATA_API_CONTRACT.md`). Phase 7B.3 endpoint implementation remains Not Started and awaits separate explicit authorization.
