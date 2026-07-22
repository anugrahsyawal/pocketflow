# Risks and Blockers

Last updated: 2026-07-21

| ID | Risk or blocker | State | Impact | Mitigation / next decision |
|---|---|---|---|---|
| R-001 | Fixed 26-25 product period conflicts with configurable `budgetPeriodStartDay` setup state. | Open drift; not a current blocker | Future data/UX ambiguity | Document as drift; remediate only in Phase 6E or later approved scope. Define compatibility/migration before removing persisted state. |
| R-002 | PWA installability is not yet browser-verified. | Mitigated in Phase 6E; verification pending | Installability/warnings | Local 192px, 512px, and Apple-touch icons plus standard metadata now exist. Verify install behavior in a supported browser. |
| R-003 | No service worker or offline app-shell strategy. | Open | MVP offline/PWA direction incomplete | Refine cache/update/offline behavior before implementation. Local transaction persistence alone is not full offline support. |
| R-004 | External runtime fonts/icons may fail offline. | Open | Visual degradation and network dependence | Minimize or remove external dependencies during approved PWA work. |
| R-005 | Historical allocation/balance snapshots do not exist. | Accepted limitation | Historical Reports cannot reconstruct allocation or Sinking recommendation | Keep honest placeholders; defer model design. Do not infer history from current values. |
| R-006 | Production authentication provider/session model is TBD. | Decision required before production | Private financial data cannot rely on mock auth | Refine provider, credentials/session lifecycle, recovery, and backend enforcement before production. |
| R-007 | Remote sync contracts are undefined. | Decision required before sync | Duplicate/conflicting data or deletion resurrection | Define client IDs, idempotency, retry, conflict policy, archive/delete propagation, and migration. |
| R-008 | Backup/restore platform, retention, encryption, storage, and restore testing are TBD. | Refinement Needed; not Phase 6E blocker | Recovery and privacy risk | Product/architecture refinement before implementation. |
| R-009 | Deployment platform is TBD. | Refinement Needed | Security/operations requirements cannot be finalized | Select only after backend/auth/data requirements are approved. |
| R-010 | Automated test/lint scripts are absent. | Open quality gap | Regression confidence relies heavily on manual checks | Propose a testing strategy and any dependencies as separately approved work. |
| R-011 | Documentation normalization was previously uncommitted. | Resolved | Phase 6E entry gate | Committed and pushed as `e35756b`; worktree was clean before Phase 6E began. |

## Current blockers

There is no application implementation blocker. Phase 6E is intentionally
blocked by entry gate R-011 until Product Owner review and the requested Git
checkpoint are complete.
