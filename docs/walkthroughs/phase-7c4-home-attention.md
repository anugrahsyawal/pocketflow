# Phase 7C.4 — Home budget status and attention

Date: 2026-10-21. Local/uncommitted; technical verification obtained, PO manual
review pending. User authorized continuation, not commit/push. Previous carousel
changes preserved in the same 7C.4 phase; latest pushed commit remains `a71e3cc`.

## Scope / source of truth

Backlog 7.2/7.3 and PR-009; server Reports API status contract; DEC-024 attribution
unchanged. Iteration-5 screenshot and existing Home behavior inspected. No raw
Stitch markup copied. Home does not calculate thresholds from pocket balances.

- Master-data adapter validates server budget status enum and rejects non-null
  status for missing allocation. No new request: consumes the current report
  already read with master data. Missing report row remains unknown.
- Carousel labels explicitly identify the pocket whose budget status is shown;
  paired cards do not imply merged budget attribution.
- Attention excludes Cash/NFC standalone cards, orders overbudget > bahaya >
  waspada, and limits to two. Stable ties follow existing Home template ordering.
- Positive state requires every monitored owner to have explicit `aman` status.
  Empty pockets, missing data and known zero allocation have non-positive copy;
  absence of alerts is not proof of safety.
- Attention links point to existing server-pocket articles in this connected
  preview with focusable anchor targets. They do not navigate into local-mode
  detail routes, mutate data, or bypass transaction editing/recovery locks.
- Alert copy contains no monetary values; shared Home privacy continues to mask
  all displayed amounts. It does not hide the report/detail outside Home.

## Changed files

- `frontend/src/lib/api/masterData.ts`: validated optional model status (production
  mapping always supplies status or null; absent in older in-memory fixtures is
  treated as unknown by Home).
- `frontend/src/lib/api/homeSnapshot.ts`: severity selection / all-safe predicate.
- `frontend/src/features/connected/ConnectedHomeSnapshot.tsx`: status and alerts.
- `frontend/src/features/connected/ConnectedPockets.tsx`: anchor/focus targets.
- `backend/tests/integration/frontendHomeSnapshot.test.ts` and
  `frontendMasterData.test.ts`: status/selection/validation coverage.
- `backend/tests/browser/homeSnapshot.cjs`: runtime alert/anchor/unknown checks.
- Documentation index, current state, sprint, handoff and this walkthrough.

## Verification

```text
npx tsc --noEmit
npm run build
npm run build -- --mode connected
npx tsx --test tests/integration/frontendHomeSnapshot.test.ts tests/integration/frontendMasterData.test.ts
node tests/browser/homeSnapshot.cjs
git diff --check
```

Type-check and both builds passed, 148 modules. Fifteen targeted tests passed
using isolated `pocketflow_test_7b4_windows`; preview uses a separate disposable
database. The existing connected dev server on 5175/API 3000 were reused.
No production data was used. No full backend suite rerun.

Edge runtime: hero/carousel checks retained; real fixture safe state, mocked
server severity yields two sorted alerts, native anchor focuses correct article,
missing allocation avoids false all-safe, 375/390/430px no document overflow.
No page/unexpected console errors; expected pre-login 401/external font failures
are explicitly filtered. Status-response overrides are UI fixtures, not claimed
as real stored overbudget transactions or backend threshold tests.
Agent reviewed ignored `.env.home-attention.png`: red/amber horizontal cards,
readable CTA and next-card peek. This is automated browser interaction plus agent
visual review, not PO manual acceptance. Source/diff reviewed.

## Remaining work / review

Review current attention cards and unknown-budget copy. Recent transactions,
full detail routing, overall budget progress and mutation-to-screen evidence are
still pending; no full Home cutover or Phase 7C.4 completion. Dates/status refresh
with existing parent reload; no new midnight timer. This change does not expand
budget-owner attribution rules, add server writes, dependencies or deployment.
