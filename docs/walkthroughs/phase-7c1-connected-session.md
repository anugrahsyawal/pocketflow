# Phase 7C.1 — Isolated connected session foundation

Date: 2026-09-15. Implementation complete locally; PO review pending.
Plan checkpoint committed first: `d4b2f36`. Clean working tree verified before
source changes. No implementation commit/push performed.

## Delivered

- Explicit `npm run dev:connected` entry on `http://127.0.0.1:5174`.
- Existing `npm run dev` remains local mode. Separate dynamic imports ensure
  server mode never imports the local persisted auth, setup or financial stores.
- Real session bootstrap, login, logout, focus/reload checks, pending/error UI.
  The screen is a development boundary, not the completed financial application.
  Visiting a financial route in this mode cannot expose local forms.
- Credentialed same-origin `/v1` proxy to loopback port 3000; no third-party
  service or production hosting change. Session cookie is HttpOnly; CSRF is held
  only in memory. Native browser fetch is called without rebinding its receiver.
- Single-flight CSRF refresh; logout retries once only for explicit CSRF
  rejection. Network failures are not automatically replayed or marked success.
- No dependencies, schema changes, store migration, financial writes, offline
  queue, or automatic fallback to LocalStorage.

Sources: accepted 7C plan, PR-017/018/021, DEC-026/027/029 and existing auth API.
Visuals retain the existing cream/blue theme and shared Button/Input components;
Iteration 2 login screenshot and DESIGN.md were inspected. Raw Stitch HTML was
not copied and unsupported Google login was not added.

## Verification

- Frontend `npx tsc --noEmit`, explicit app-project type-check, ordinary build and
  connected-mode build: all passed after the native-fetch correction. Ordinary
  build ran last so the generated default artifact remains local mode.
- Backend type-check/build passed (no backend production source changed).
- Full backend regression: 243 tests / 20 suites passed, including 8 new session
  tests. A ninth test was then added for the native-fetch receiver bug detected
  by browser QA; the final focused run passed all 9 tests / 2 suites. The entire
  suite was not rerun after adding that ninth regression test.
- HTTP integration uses an ephemeral loopback listener with live PostgreSQL
  and disposable `pocketflow_test_7b4_windows`, not the user's development DB.
- Browser QA uses `sessionPreview.ts`, guarded to accept only the separate
  `pocketflow_test_7c1_preview` database; it seeds only a disposable account.
  No credentials were invented for the user's development/production account.
- Browser verified: anonymous login form, wrong-password error, successful real
  login, reload retaining session, logout returning to login, and backend-down
  state after stopping the preview backend. Vite reports unreachable upstream
  as HTTP 500, shown as a server error with unknown session, not empty data.
- Screens inspected at 375, 390 and 430px; no clipped controls/overlapping text
  observed. DOM check at 375px: body scrollWidth=375, innerWidth=375.
- Browser console inspection after successful login/logout: no captured warning
  or error entries. Expiry and cross-tab CSRF rotation were tested over HTTP,
  not claimed as separate manual browser tests.
- A first browser run revealed native-fetch receiver binding failure despite
  Node tests passing. Default transport now wraps native fetch in an arrow
  function; browser login/logout passed after correction.
- Source review: connected entry has no imports of legacy stores; no storage
  APIs in session client/UI; credentials are not logged or persisted. Existing
  local financial code was not edited and user's LocalStorage was not inspected.
- `git diff --check` passed; implementation remains uncommitted for PO review.

## Running locally

Normal local mode: `cd frontend` then `npm run dev`.
Server mode: start the configured backend on loopback port 3000, then from
`frontend` run `npm run dev:connected`. An owner account must already be
provisioned through the existing backend CLI. No public signup/demo credential
is added to server mode. Do not use the disposable QA account for real data.

For reproducible disposable QA only, set TEST_DATABASE_URL to the separate
`pocketflow_test_7c1_preview` database and run from backend:
`npx tsx tests/helpers/sessionPreview.ts`. This resets that named test database;
the script refuses other database names. Test credentials are in the fixture
source. Stop the fixture after testing. The preview backend was stopped after
this verification; its disposable database remains for repeat QA.

## Limits and next gate

No financial UI, setup completion, pocket or Reports API consumption yet. The
existing UI remains usable only in local mode. Offline support remains an MVP
direction; connected-mode writes are not yet available. Backend must be running
to verify a server session. Deployment and legacy-data import remain separate.

Recommend PO review before committing this implementation and approving 7C.2.
No automatic advance to setup/master-data integration.
