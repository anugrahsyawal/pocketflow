# Phase 7C.4 — Connected Home financial snapshot

Date: 2026-10-21. Status: implemented locally, not committed; technical checks
passed, Product Owner manual review pending. Same approved 7C.4, not a new phase.
Prior report review/remediation committed and pushed as `3e1689c`; tree was clean
before this continuation.

## Scope and requirements

Implements the financial snapshot portion of backlog 7.1 / PR-009, following
approved Home behavior and iteration-5 visual direction (cream/white surfaces,
rounded cards, eye control beside total). Raw Stitch HTML was not copied.

- Sum each active pocket once, including Cash and NFC. Do not add owner budget
  balances again or use allocations as available money.
- Spendable uses existing server pocket classification. Safe-per-day is floored
  spendable divided by inclusive remaining calendar days in Asia/Jakarta,
  clamped at zero. The fixed 26–25 period is consumed from existing master data.
- Unknown balances and sums outside safe integer range stay unavailable, never
  zero. Known empty collections are zero. A stale period has no daily estimate.
- Eye control masks all three amounts within this Home snapshot only. It does
  not hide the report/detail below; the preview explicitly explains this limit.
- Reuse canonical parent loading/error/reload and account isolation. No new API,
  schema, dependency, write path or local-mode behavior change.

## Files

- `frontend/src/lib/api/homeSnapshot.ts`: exact integer summation and date helper.
- `frontend/src/features/connected/ConnectedHomeSnapshot.tsx`: snapshot and privacy.
- `frontend/src/features/connected/ConnectedPockets.tsx`: mount after setup.
- `backend/tests/integration/frontendHomeSnapshot.test.ts`: three boundary tests.
- `backend/tests/browser/homeSnapshot.cjs`: runtime and responsive checks.
- Documentation index, current state, sprint, handoff and this walkthrough.

## Verification obtained

Frontend commands:

```text
npx tsc --noEmit
npm run build
npm run build -- --mode connected
npm run dev -- --mode connected --host 127.0.0.1 --port 5175 --strictPort
```

Type-check and both production builds passed (148 modules). Connected preview
served on loopback 5175, disposable fixture API on 3000. Initial browser attempt
failed because preview services were stopped. PostgreSQL was started successfully
after automatic recovery; API was seeded only in `pocketflow_test_7c1_preview`.
No production or user transaction data was used.

Backend-directory checks (Edge via existing PLAYWRIGHT_MODULE_PATH):

```text
npx tsx --test tests/integration/frontendHomeSnapshot.test.ts
node tests/browser/homeSnapshot.cjs
node tests/browser/reportEmptyActions.cjs
node tests/browser/reportReconciliation.cjs
```

All three unit tests and all three browser scripts passed. Runtime checks covered
server total/spendable Rp1,532,000; safe-per-day Rp306,400 on 21 October; hide/show
and accessible pressed state; missing balance propagation; reload recovery;
375/390/430px without page overflow. Regression scripts verified report CTA/draft
locks and downloaded CSV reconciliation. No page errors or unexpected console
errors (expected pre-login 401 / external font failures filtered explicitly).

Agent visually inspected `backend/.env.home-snapshot.png` at 375px: readable
amounts, two-column detail and eye control, no clipping. Screenshot is ignored
local evidence, not committed. This is automated browser interaction plus agent
screenshot review, not Product Owner manual acceptance or exhaustive manual QA.
Source/diff review and `git diff --check` completed. Full backend suite not rerun.

## Limitations / review / next bounded work

This is a partial Home presentation in the connected development preview, not
the complete Home route. Carousel (including paired wallets), attention, recent
transactions, detail and mutation-to-screen reconciliation remain pending.
Visibility resets on component remount/reload; no persistence preference was
added. Day calculation updates on render, without a midnight refresh timer;
reload is required to obtain a new period. Master data/report are separate reads,
not claimed to be an atomic cross-request snapshot.

Review total vs individual pocket balances, spendable classification, privacy
scope and unknown-state copy before proceeding to remaining Home sections.
