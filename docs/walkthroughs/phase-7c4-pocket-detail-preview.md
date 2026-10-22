# Phase 7C.4 — Connected pocket detail preview

2026-10-22. Bounded continuation authorized by PO's “lanjut”. Previous Home
privacy icon changes remain uncommitted; this continues the same Phase 7C.4,
not a new phase or production cutover.

## Scope and authority

Backlog 2.1 pocket detail and DEC-024 budget attribution: independent balances,
current-period budget metrics, active categories, latest three transactions.
Iteration-2 detail reference informs content hierarchy; existing Modal/tokens
are reused, not raw Stitch HTML. Each member of a paired Home card opens its
own read-only dialog. Settings and transaction recovery stay in existing forms.

Files: ConnectedPocketDetail.tsx (new), ConnectedHomeSnapshot.tsx,
ConnectedHomeRecent.tsx, lib/api/masterData.ts; browser/pocketDetail.cjs (new),
integration/frontendMasterData.test.ts, documentation index/state/sprint/handoff.

Budget values come from validated server report rows, never from payment-pocket
transaction sums. Missing allocations remain unknown, not zero. Recent rows use
the server pocketId filter (payment/from/to), explicitly distinct from budget
attribution. Dialog inherits Home privacy; archived metadata may resolve labels,
but only active carousel pockets can open. No dependencies, API mutations,
local-storage migration, schema changes, or new product decisions.

## Verification

- `npx tsc --noEmit`, `npm run build`, `npx vite build --mode connected`.
- Existing Vite dev server on 127.0.0.1:5175 reused; launching another instance
  correctly refused the occupied port. Sandbox service checks were misleading;
  elevated read-only checks confirmed PostgreSQL/API/Vite were already running.
- `node tests/browser/pocketDetail.cjs`: real disposable preview API; Transportation
  balance 100000/budget expense 18000/remaining 182000, NFC balance 82000/budget
  expense 0; category MRT, filtered transfer/payment counts, privacy, Escape and
  return focus, error/retry, mobile 375/390/430px, no mutation requests.
- `node tests/browser/homeSnapshot.cjs`: existing Home regression. First run
  timed out waiting for carousel scroll reset; unchanged rerun passed. This is
  retained as an intermittent browser-scroll test limitation, not erased evidence.
- `npx tsx --test tests/integration/frontendMasterData.test.ts`: 10 tests against
  dedicated pocketflow_test_7b4_windows; includes per-pocket budget assertions.
- Browser pageerror/console review; expected pre-login 401 and external font
  network failures excluded, unexpected errors rejected.
- Agent inspected backend/.env.pocket-detail.png at 375px: layout contained,
  scrollable dialog, independent saldo/budget labels and category visible.
  Screenshot is ignored local evidence; not Product Owner manual acceptance.
- Source/diff review and `git diff --check`.

## Limits / review

Final results: type-check passed; both builds passed (151 modules); integration
10/10 passed; detail browser and Home rerun passed; diff whitespace check passed.
Git status: 9 modified tracked files and 4 untracked new files, including prior
icon work. Nothing staged, committed or pushed in this continuation.

Read-only dialog, not complete routed pocket detail. Recent rows span periods
and are limited to three; budget metrics are current-period only. Shared dialog
still uses existing external close-icon font. Other screens are not covered by
Home privacy. Full backend regression and production deployment not performed.
Review opening both members of Transportation/NFC and Food/Cash, scrolling the
dialog, closing it, and privacy. Full Phase 7C.4 remains in progress.
