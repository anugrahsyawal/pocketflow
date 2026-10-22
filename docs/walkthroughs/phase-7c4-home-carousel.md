# Phase 7C.4 — Connected Home pocket carousel

Date: 2026-10-21. Implemented locally; uncommitted, PO manual review pending.
Previous snapshot committed/pushed as `a71e3cc`; clean tree before continuation.

## Scope and authority

Bounded continuation of backlog 7.3 and PR-003/009. Iteration-5 reference reviewed;
existing carousel style reused, no raw HTML copied. Transportation/NFC and
Food/Cash are visual template pairs, not inferred transaction attribution.
DEC-024 budget-owner configuration is untouched. Each wallet retains its own
balance and appears once. Renamed pockets are resolved by templateKey, never name.
An unmatched active wallet still appears; all other active pockets follow.
MasterData already excludes archived/inactive pockets. Null balances and unsafe
aggregate integers remain unavailable. Shared eye control now covers carousel
and hero; report/detail outside Home still visible, as explicitly stated in UI.

No dependencies, API calls, schema or transaction changes; local Home unchanged.
Read-only cards deliberately have no misleading button/link to an unintegrated
detail route. Status badges, Lihat semua/detail navigation, attention and recent
transactions remain pending; not full Home/7C.4 completion.

## Files and checks

- `frontend/src/lib/api/homeSnapshot.ts`: stable template grouping and safe totals.
- `frontend/src/features/connected/ConnectedHomeSnapshot.tsx`: horizontal cards,
  individual balances, totals, privacy and explicit preview limitations.
- `backend/tests/integration/frontendHomeSnapshot.test.ts`: grouping/orphan/null
  coverage in addition to existing financial boundary tests (4 tests pass).
- `backend/tests/browser/homeSnapshot.cjs`: paired balances, hidden amounts,
  scrollability, hidden scrollbar, keyboard scroll, null/reload and mobile checks.
- Documentation index/current state/sprint/handoff and this walkthrough.

Commands executed:

```text
npx tsc --noEmit
npm run build
npm run build -- --mode connected
npx tsx --test tests/integration/frontendHomeSnapshot.test.ts
node tests/browser/homeSnapshot.cjs
git diff --check
```

Type-check and both builds passed (148 modules). Browser used the running Vite
connected dev server on 5175 and disposable preview API on 3000. Edge headless:
two fixture cards, Transportation/NFC Rp182,000; Food/Cash Rp1,350,000; all nine
amounts masked; unavailable source balance also invalidates its pair total;
375/390/430px without document overflow; no page/unexpected console errors.
Expected pre-auth 401 and external font failures are filtered by the test.
Agent screenshot review uses ignored `backend/.env.home-snapshot.png`; this is
not Product Owner manual acceptance. Full backend/regression suite not rerun.

Review recommendation: inspect horizontal spacing and separate wallet balances,
swipe across cards, toggle privacy, then review remaining Home status/navigation
integration. No deployment or automatic commit of this continuation.
