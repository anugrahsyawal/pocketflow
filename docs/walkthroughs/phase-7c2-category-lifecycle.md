# Phase 7C.2 — Category archive and restore

Implementation: 2026-09-25. Reviewed: 2026-09-27. PO review pending.

## Scope and authority

Backlog 3.2, approved Setup & Master Data API contract, DEC-026/027.
Connected-development mode only; local financial stores remain untouched.
Active categories offer explicit archive confirmation; archived categories under
active pockets offer restore confirmation. No hard delete or financial mutation.

## Safety and verification

- Narrow allowlisted PATCH with UUID, expectedRevision and isArchived.
- Immutable explicit retry after uncertain responses; conflict is Reload-only.
- Refresh reads canonical lists including archives; no optimistic fake balances.
- Guarded beforeunload and session expiry/unmount handling.
- Full integration log `.env.category-archive.log`: 272 tests / 28 suites passed,
  zero failures (119441 ms). Archive/replay/restore preserves the transaction ledger;
  stale revisions and cross-owner writes rejected.
- Frontend app/root type-check and connected/default builds passed. Backend
  type-check/build passed. `git diff --check` passed (line-ending warnings only).
- `npm run dev:connected`: existing server reused after second launch reported
  port 5174 occupied. Disposable backend on port 3000, separate preview database.
- Headless Edge `tests/browser/categoryArchive.cjs` passed cancellation with no
  write, committed-but-lost response with identical retry, restore with canonical
  revision, unchanged NFC balance Rp82,000, no horizontal overflow at 375 px,
  untouched LocalStorage and no unexpected console errors.
- Inspected confirmation and restore screenshots in `backend/dist/qa-category-archive/`.
  Expected bootstrap 401, simulated network failure and blocked external font
  requests are excluded from unexpected console errors. No PO manual acceptance claimed.

## Files and limitations

CategoryArchiveForm.tsx, ConnectedPockets.tsx, masterData.ts, sessionClient.ts,
frontendCategoryEdit.test.ts and categoryArchive.cjs; delivery docs updated.
Categories under archived pockets are not reachable in this bounded UI yet.
Category creation and pocket lifecycle remain pending. Full Phase 7C.2 is not
complete; no migration, sync, deployment, commit or push performed.
