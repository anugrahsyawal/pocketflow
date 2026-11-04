# Release-readiness transition plan

Date: 2026-11-01
Baseline: 8ad9dbb (pushed, clean tree at entry)
Status: Local assessment completed; hosting proposal ready for review; deployment/implementation decisions pending

2026-11-04 continuation: interrupted regression was rerun with a retained
local log and exposed a date-dependent test fixture; a bounded test-only repair
uses the actual funded fixture period. See [evidence](../walkthroughs/release-readiness-assessment.md).
The [free-first topology proposal](FREE_FIRST_HOSTING_PROPOSAL.md)
now evaluates current official provider documentation. It is a review artifact,
not approval to provision services or begin the next implementation phase.

## Answer to the phase transition question

The bounded 7C.4 connected-preview work is delivered: mounted screens, compact
session shell, recovery and Home/detail/Reports/CSV verification. Further UI
polish is not a prerequisite for starting readiness assessment. Do not label the
entire MVP complete or infer PO manual acceptance from commit/push authorization.

Recommended next phase label: **7D — Release readiness**, beginning with
**7D.1 — Assessment and deployment design**. The PO's 2026-11-01 request authorizes
continuing work; the current work is local inspection, tests and planning only.
No provider selection, spending, external write or production deployment follows
from this label. Later implementation stages require an explicit bounded plan.

## Initial evidence and gaps

| Gate | Evidence at entry | Remaining work |
|---|---|---|
| Financial integration | 63c342f reconciliation and real recovery browser evidence | Preserve existing behavior during release work |
| Connected shell | 8ad9dbb; type-check/build rerun 2026-11-01, browser evidence 2026-10-26 | PO manual review remains distinct |
| Backend regression | 2026-11-04: 423/423 tests pass after calendar-fixture repair; backend type-check/build pass | Preserve evidence; hosted pooling/proxy verification remains separate |
| Frontend/API hosting | Vite development proxy forwards /v1 to local Fastify | Define production API routing, HTTPS, cookie/CORS and runtime topology |
| Production config | env.ts validates presence, port and CORS format | Audit secret strength, production-only restrictions and proxy assumptions |
| Health | /health returns service status only | Define separate liveness/readiness; verify DB outage behavior |
| Authentication | HttpOnly, SameSite=Lax, Secure in production; custom owner auth | Review rate limits, session rotation, error/log redaction, account recovery |
| Backup | DEC-028 accepted baseline | Provider-compatible encrypted backup, retention and actual restore drill |
| PWA/offline | Manifest/icons present; connected mode requires backend | Separate cache/queue/sync design; no offline-ready claim |
| Data cutover | main.tsx defaults local; connected isolates stores | Keep separation; migration/cutover needs independent scope and safeguards |

Source locations: frontend/vite.config.ts, frontend/src/main.tsx,
backend/src/config/env.ts, backend/src/routes/auth.ts,
backend/src/routes/health.ts, backend/tests/helpers/testDb.ts.
This is a targeted readiness inventory, not a complete security audit.

## Recommended work order

1. Finish baseline regression and record blockers, if any.
2. Evaluate free-first hosting against the actual Fastify + PostgreSQL + cookie
   contract. A hosted database alone does not host the existing API or replace
   its auth/recovery semantics. Compare current official limits when choosing
   providers; do not assume old pricing or that any free tier meets DEC-028.
3. Present one recommended topology, limitations and rollback/data-ownership
   consequences for PO approval before creating services or changing auth.
4. Implement bounded local hardening and deployment configuration under that
   approved design, then test failure/recovery paths in an isolated staging setup.
5. Verify backups/restores, secrets, HTTPS and operational checks before go-live.

## Scope exclusions for this assessment

No normal-mode cutover, migration, service worker, offline queue, auth replacement,
new dependency, deployment account, hosting change, paid resource, automatic
commit/push or production data access. Goals/JSON receipts/recurrence remain
separately refined backlog work, not silently included in this transition.

## Review checkpoint

Assess readiness with a concrete test result and an explicit provider/design
decision list. Do not reopen completed financial tests indefinitely, but do not
equate a passing local suite to a secure deployable system. Manual acceptance,
technical verification and Git delivery must remain separate in status reports.
