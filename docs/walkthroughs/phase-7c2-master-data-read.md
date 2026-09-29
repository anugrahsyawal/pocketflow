# Phase 7C.2 — Master-data read integration checkpoint

Date: 2026-09-19. Status: read-only slice implemented and verified locally;
**the full Phase 7C.2 is not complete**. Setup submission and master-data edits
remain to be integrated with stable mutation identity and revision handling.

## Git and scope

On explicit PO instruction, Phase 7C.1 was committed as `cd2154b` and pushed to
`origin/codex/audit-pocketflow-documentation`. Earlier commits on that branch
were included. `main` was not changed. Working tree was clean before this
continuation. These new read-integration changes are uncommitted for review.

The approved integration plan sequences setup, pockets and categories before
transaction forms. This checkpoint implements the bounded GET side first:

- Real setup status, without using local setup flags or creating server data.
- Active server pockets and their active categories, UUIDs and revisions.
- Independent current balances and revised allocation from current Reports API.
  Opening balance and a paginated transaction list are not used as current balance.
- Cash/NFC budget-owner labels from stored IDs, not names or guessed defaults.
  Explicit null mapping falls back to the payment pocket itself.
- Missing allocation is "Belum diatur"; known zero remains Rp0. Missing balance
  is "Belum tersedia", not an invented value.
- Complete loading/error/empty/pre-setup states; refresh clears prior data;
  rejected responses do not publish partial financial state. Late requests
  cannot update an unmounted view after logout or session change.
- No additional financial mutation transport, local fallback, storage writes,
  new backend endpoints, dependencies, migration, deployment or production data.

## Files and authority

- `frontend/src/lib/api/masterData.ts`: validated read DTO adapter and loader.
- `frontend/src/lib/api/sessionClient.ts`: explicit read endpoint allowlist.
- `frontend/src/features/connected/ConnectedPockets.tsx`: read-only UI.
- `frontend/src/features/connected/ConnectedApp.tsx`: authenticated boundary.
- `backend/tests/integration/frontendMasterData.test.ts`: 8 read/validation tests.
- `backend/tests/helpers/masterDataFixture.ts` and `sessionPreview.ts`: disposable
  fixture and optional `--with-pockets` preview.

Authority: accepted setup/master-data and Reports API contracts, DEC-024/027/031,
PR-002/003/007 and the Phase 7C integration plan. Iteration 2 pocket screenshot
and existing PocketCard were inspected; shared cream/blue styling is retained.
The existing PocketCard imports local transaction stores, so it is intentionally
not mounted in connected mode. No raw Stitch HTML or hardcoded production money.

## Verification actually obtained

- Frontend `npx tsc --noEmit -p tsconfig.app.json`: passed.
- Frontend `npx tsc --noEmit`: passed; ordinary `npm run build`: passed.
- Frontend `npm run build -- --mode connected`: passed. Ordinary build ran last
  so the default generated artifact remains local mode.
- `npm run test:integration` against live native PostgreSQL 16:
  **252 passed, 0 failed, 22 suites**, approximately 178 seconds. Includes 8 new
  master-data tests, 9 session tests, and the existing 235 backend cases.
- Test DB `pocketflow_test_7b4_windows`; separate browser fixture DB
  `pocketflow_test_7c1_preview`. No development owner or real financial data used.
- `npm run dev:connected` started successfully on 127.0.0.1:5174.
- Browser: logged into seeded preview, displayed Transportation Rp100000 and
  NFC Rp82000 after a Rp100000 top-up and Rp18000 expense; Cash Rp50000 remained
  separate. NFC allocation displayed Rp0; Cash displayed "Belum diatur".
- Expanded NFC categories and verified MRT; DOM contains exactly four pockets.
- Inspected 375/390/430px layouts; body scroll widths did not exceed viewport.
  Full-page capture showed stitching artifacts, so viewport screenshots and
  DOM card counts were used for confirmation rather than treating duplicated
  screenshot segments as extra application records.
- Browser console inspection before deliberate backend shutdown: no captured
  warning/error entries. Stopped the preview backend, clicked Muat ulang, and
  verified explicit error with no pocket data shown, rather than Rp0.
- Pre-setup, empty configured account, owner isolation, null owner mapping,
  malformed/unsafe amounts and partial-fetch failure verified in automated tests.
  They are not claimed as additional manual browser scenarios.
- Source/diff review and `git diff --check`: passed. No local store import in
  the new connected component or adapter. No reads/writes of user LocalStorage.

## Limits and next work

This is a read-only development checkpoint, not a production-ready replacement
for local mode. GETs for metadata and the report are separate requests, not a
single cross-endpoint database snapshot. All displayed financial amounts use
the same report response; metadata may change between requests and refresh
loads it again. No cross-endpoint snapshot guarantee is claimed.

Setup form submission, category creation/edit/archive, Cash/NFC configuration
edits and other mutations are **not implemented here**. Continue within 7C.2
with an explicit retry/conflict design before enabling those writes. No
automatic advancement to transaction integration (7C.3).

Preview backend was stopped after QA; the disposable fixture DB remains for
repeat verification. Connected frontend alone will show a backend error until
a backend is running. Review this checkpoint before committing further changes.
