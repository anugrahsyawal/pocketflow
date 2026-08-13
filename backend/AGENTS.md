# Backend Instructions

## Active Status & Foundation

The backend foundation is implemented in TypeScript, Fastify, Drizzle ORM, and PostgreSQL 16 Alpine:

- Phase 7B.1 Backend Service & Database Foundation (commit `4ac8790`; Implemented & Verified; PO Acceptance Pending).
- Phase 7B.2 Owner Authentication & Secure Session (commit `e346d8f`; Implemented & Verified; PO Acceptance Pending).
- Phase 7B.2.1 Local PostgreSQL & Auth Integration Verification (commit `7e6c6b5910e23a31f419362b75ee371956a1b314` pushed to `origin/main`; Verified on VM 2026-08-12; PO Acceptance Pending).
- Phase 7B.2.2 Backend Docs Reconciliation & Phase 7B.3 Setup & Master Data API Contract Gate ([`SETUP_MASTER_DATA_API_CONTRACT.md`](../docs/architecture/SETUP_MASTER_DATA_API_CONTRACT.md); Product Owner Accepted 2026-08-13; Endpoint Implementation Awaiting Separate Authorization).

## Roles & Authority

- Antigravity acts as backend implementer.
- Codex acts as Technical Project Manager, Tech Lead, and reviewer.
- Product Owner decisions in `docs/decisions/DECISION_LOG.md` (DEC-025 through DEC-029) and approved decision packs (`docs/architecture/BACKEND_ARCHITECTURE_DECISION_PACK.md`) are authoritative.
- API endpoint implementations MUST strictly follow detailed API contract specifications before code implementation begins.

## Core Backend Architecture Rules

1. **Stack**: Fastify + TypeScript (Node 20.6+ ESM), Drizzle ORM, PostgreSQL.
2. **Provisioning**: Single-owner CLI provisioning via `npm run owner:provision`. No public sign-up/registration endpoints.
3. **Authentication & Session**: Argon2id password hashing, 30-day HttpOnly cookie sessions (`sid`), SHA-256 token database storage, session rotation on login, and `X-CSRF-Token` header protection on mutating HTTP requests (`PUT`, `POST`, `PATCH`).
4. **Money & Numbers**: Integer Rupiah amounts (non-negative integer minor-free values). Never floating point.
5. **Time**: Business dates in local `DATE` (`YYYY-MM-DD`); business times in local `TIME`; audit timestamps in UTC.
6. **Budget Period**: Fixed strictly from the 26th of one month through the 25th of the next month. Never accept or expose a configurable start day as supported backend behavior.
7. **Idempotency & Revisions**: Contracted domain mutations (`PUT /v1/setup`, `POST /v1/categories`, `PATCH /v1/pockets/:id`, `PATCH /v1/categories/:id`) require `clientMutationId`. Auth endpoints (`/v1/auth/login`, `/v1/auth/logout`, etc.) are not retroactively required to use `clientMutationId`. Edits/patches enforce `expectedRevision` to prevent silent last-write-wins.
8. **Owner Isolation & Error Privacy**: All database queries filter strictly by `user_id = authUser.id`. Direct cross-owner entity lookups return `404 Not Found` (`NOT_FOUND`) without leaking existence. Invalid cross-owner references return `422 Unprocessable Entity` (`INVALID_REFERENCE`) without exposing target details.

## Verification Gate for Backend Tasks

Before presenting backend changes for Tech Lead review:

1. `npm run typecheck` (`tsc --noEmit`) passes with 0 errors.
2. `npm run build` compiles cleanly to `backend/dist/`.
3. `docker compose up -d --wait` runs PostgreSQL on loopback `127.0.0.1:5432`.
4. `npm run db:migrate` runs cleanly and idempotently against live PostgreSQL.
5. Integration verification passes cleanly against live server and database.
6. Source code, git diff, and walkthrough evidence are updated.

## Prohibited Behavior

- Do not add npm dependencies without prior approval.
- Do not create unapproved API routes or modify approved endpoint signatures.
- Do not perform silent last-write-wins financial updates.
- Do not log plaintext passwords, session tokens, CSRF tokens, or full hashes to console/logs.
- Do not commit, push, stage, amend, or reset history without instruction.
