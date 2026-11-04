# Free-first hosting proposal

Date: 2026-11-04
Status: Proposed for PO review; not an approved deployment decision
Scope: continuation of release-readiness assessment, not a new implementation phase

## Recommendation

Evaluate **Vercel Hobby for the frontend and existing Fastify API, plus Supabase
Free for PostgreSQL**, first as a disposable staging environment. Keep development
local. Do not replace the existing owner authentication with Supabase Auth or
move financial writes directly into the browser. No account, resource, dependency,
configuration or database has been changed by this proposal.

This is an engineering recommendation, not a claim that the repository is already
deployable. Vercel documents Fastify support as a Function, including authenticated
cron handlers; function lifecycle limits still apply. Its Hobby plan is for
personal, non-commercial use and usage limits can interrupt service.
[Fastify](https://vercel.com/docs/frameworks/backend/fastify),
[Hobby](https://vercel.com/docs/plans/hobby).

## Options considered

| Option | Fit | Decision proposed |
|---|---|---|
| Local Node + local PostgreSQL | Current verified development setup; no cloud cost | Keep for development and regression |
| Vercel frontend/API + Supabase database | Preserves Fastify/Drizzle/auth contracts but needs serverless adaptation | First staging candidate |
| Vercel frontend + Render Free API + Supabase | More similar Node server lifecycle, but extra proxy and sleeping service | Fallback for testing, not production recommendation |
| Browser + Supabase Data API/Auth replacement | Changes approved auth, transaction and recovery architecture | Excluded from this phase |

Render documents idle shutdown after 15 minutes and explicitly advises against
using free instances for production. It therefore does not remove the scheduling
or reliability work. [Render Free](https://render.com/docs/free).

## Proposed request boundary

Browser -> one HTTPS frontend origin -> `/v1/*` -> Fastify -> PostgreSQL.

Use a frontend project and API project with an explicit API rewrite if necessary;
verify the monorepo build roots before choosing final configuration. API rules
must precede the SPA fallback. Authenticated responses must never be CDN-cached.
Verify Set-Cookie, logout clearing, CSRF and same-origin browser requests through
the actual proxy. Keep strict CORS; do not weaken SameSite to compensate for a
cross-site design. Preview domains must not gain production DB/session access.
External rewrites are supported, but that is not proof of cookie correctness for
this app. [Vercel rewrites](https://vercel.com/docs/routing/rewrites).

## Repository compatibility gates

- `backend/src/server.ts` starts a persistent listener; confirm deployment entry
  detection, native Argon2 packaging, asynchronous app initialization and cold
  starts with the deployed runtime before claiming compatibility.
- `backend/src/app.ts` starts a 24-hour in-process purge timer. Serverless cannot
  rely on it. Design an authenticated scheduled invocation with database-backed
  overlap protection, bounded batches, retained audit and unchanged 30-day
  tombstone rule. Do not introduce a publicly callable deletion endpoint.
- `backend/src/db/client.ts` currently uses a pool of ten. Serverless pooling
  must be bounded per instance, encrypted, and compatible with the chosen
  connection mode. Transaction pooling requires disabling prepared statements;
  check driver pipelining as well. Migration/restore use a separate appropriate
  connection, never the disposable integration helper against a hosted DB.
  [Supabase connections](https://supabase.com/docs/guides/database/connecting-to-postgres).
- Existing idempotency uses transaction-scoped advisory locks. Preserve those
  transactions and replay semantics; test concurrent retries and lost responses
  on the selected pooler, not just localhost.
- Database access stays server-only. Review schema grants and disable unused
  public Data API exposure; prove financial/auth tables are inaccessible to
  anonymous clients. Keep application and migration credentials separate.
  [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api).
- Design production env validation, readiness failure behavior, login/recovery
  abuse controls, secret/log redaction, owner provisioning and recovery runbook.
  Existing custom sessions remain the contract; no public registration added.
- Connected build is explicit (`--mode connected` in current Vite configuration).
  No silent default-mode switch, local data import or cutover in this assessment.

## Free does not mean production-ready

Supabase Free may pause after low activity over seven days. Design a visible
unavailable/retry state without resubmitting financial mutations automatically.
[Pausing](https://supabase.com/docs/guides/platform/free-project-pausing).

Supabase recommends off-site exports for Free projects. This does not by itself
meet DEC-028: encrypted daily backups, 30-day retention and monthly restore tests.
CSV is not a full database backup. Before real financial data, specify an
owner-controlled scheduler, encrypted storage and separate key custody, retention,
failure alerts and an isolated restore drill. Budget backup egress/storage usage;
do not promise an unlimited or permanently zero-cost system. Provider/runner and
storage choices remain TBD, not an implicit weakening of DEC-028.
[Backups](https://supabase.com/docs/guides/platform/backups).

## Approval and bounded next work

PO decision requested: accept the above topology as a **staging target**, with
free-tier interruption limits, retaining Fastify and existing authentication.
Region, account ownership and backup destination remain explicit choices before
resource creation. No paid fallback or external creation is authorized here.

After review and an authorized documentation commit (clean-tree gate), the first
implementation slice should be local production configuration/readiness tests.
Then separately verify serverless entry, connection settings and scheduling;
only after that create approved staging resources with synthetic data. Release
requires proxy/auth/recovery tests, backup restore evidence and PO review.

Rollback initially means disabling staging and returning to local development;
do not delete databases or overwrite local data. Later real-data cutover needs its
own reconciliation and rollback plan. Goals, offline queue/PWA and settings
remain separately refined MVP work, not completed by hosting.

Official documentation reviewed on 2026-11-04. Recheck plan eligibility, limits,
regional availability and terms immediately before provisioning.
