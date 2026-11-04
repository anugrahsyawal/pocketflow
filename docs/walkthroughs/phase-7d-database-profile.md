# Phase 7D — Database connection profile

Date: 2026-11-04
Baseline: `1d83de9`, committed and pushed with PO authorization; clean tree at entry
Scope: bounded continuation of runtime/database staging compatibility, backlog 12.2

## Delivery

Shared database options now configure the business client and readiness probe:

- `DB_CONNECTION_MODE=direct|session|transaction`, default direct. Local direct
  defaults unchanged. Transaction profile: max one connection, no prepared
  statements and `max_pipeline=1`. The pinned driver implements the latter but
  omits its TypeScript declaration; a narrow intersection type and runtime-option
  assertion cover this, without a dependency update.
- Production defaults to mandatory TLS certificate verification. Optional
  `DB_SSL_CA` supplies the trusted PEM; runtime trust roots apply otherwise.
  Reject weaker/duplicate-conflicting URL flags, unsupported certificate-path
  parameters, unknown modes and attempted production opt-out, without secrets
  in validation messages. Readiness shares this policy, not a plaintext bypass.
- Migration CLI refuses transaction mode. Operator must select direct/session
  and a matching URL explicitly. No migrations or account provisioning in cloud.
- Existing singleton business client, financial transactions, advisory xact locks,
  auth and replay rules remain unchanged. Readiness uses one separate connection;
  transaction mode therefore permits up to two connections per app instance.

## Source-backed compatibility review

Supabase recommends transaction pooling for serverless and identifies prepared
statement, pipelining and session-state limitations. Application transaction
locks use `pg_advisory_xact_lock`, and CSV timeout uses `SET LOCAL` inside its
transaction. These match the intended transaction boundaries, but hosted proof
is still needed. Verification is stronger than encryption-only TLS; the actual
provider trust root must be checked before staging.
[Official connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres).

Vercel recognizes several Fastify entry filenames. This repo has both app.ts
(factory) and server.ts (startup); do not assume detection selects the intended
entry. Packaging/entry selection, native Argon2 and the existing in-process purge
timer remain next-slice gates. No Vercel CLI, service or scheduler is added here.
[Official Fastify runtime guide](https://vercel.com/docs/frameworks/backend/fastify).

## Verification

- Backend `npm run typecheck` and `npm run build`: passed.
- Targeted config/profile/readiness: 19/19 passed.
- Explicit `DB_CONNECTION_MODE=transaction` on local PostgreSQL: create transport
  plus readiness, 10/10 passed, including replay and lost-response handling.
- Local driver tests cover concurrent reads, rollback and transaction-scoped lock;
  TLS refusal test verifies no plaintext startup/authentication fallback. Its
  initial eight-byte-only assertion failed because this driver attempts TLS
  ClientHello even after N; corrected to allow TLS handshake but forbid plaintext.
- Full `npm run test:integration`: **442/442 tests, 53 suites passed**, no failures,
  skipped/cancelled/todo; exit 0, duration 407668 ms. Evidence log
  `.env.connection-profile-full.log` is local and ignored.
- CLI migration guard smoke test used an unreachable loopback URL and transaction
  mode: expected exit 1 and explicit mode error occurred before connection.
- Source/diff review and relative links passed; no dependency changes.
- All DB tests use `pocketflow_test_7b4_windows`, not personal/production data.
  Actual HTTP readiness runs locally; no frontend changes or browser QA claimed.

## Limits / review gate

This is local client compatibility, not Supavisor integration or certificate
handshake success evidence. No hosted database or TLS server is configured.
Production DB certificate errors fail closed; resolve trust configuration, do
not set rejectUnauthorized=false. No rates/connection capacity are guaranteed.

Next: review this slice, then resolve runtime entry and purge scheduling under a
bounded plan. Deployment remains gated by proxy/auth, backups, abuse protection
and staging verification. New changes remain uncommitted; no automatic second
commit/push. Prior checkpoints `8e1445b` and `1d83de9` are now pushed to the active
branch, not merged to main.
