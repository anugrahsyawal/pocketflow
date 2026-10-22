# Phase 7C.4 — Home budget progress

Date: 2026-10-22. Local/uncommitted; technical checks passed, PO review pending.
Previous carousel/attention/recent committed and pushed as `9d8ed55` under user
authorization. Clean tree confirmed before this same-phase continuation.

## Scope and requirements

Backlog 7.1, PR-009, iteration-5 hero budget progress, and Reports API aggregate
budget policy. No client sum of pocket allocations: any missing allocation makes
the server overall budget unavailable. Known zero remains distinct from missing.

Existing master-data current-report request now supplies decoded aggregate budget.
Home presents actual expense, total revised allocation, remaining amount and
server status/ratio. The progress bar is visually capped at 100%; textual usage
retains 120% when overbudget. Negative remaining stays negative. Zero allocation
has no invented ratio/bar. Unknown allocation shows explanatory text separately
from current money balances. Shared privacy masks all three monetary amounts;
percentage/status are non-monetary and remain visible, matching existing privacy.

No new requests, writes, dependencies, schema changes or frontend accounting
thresholds. Current-budget decoder reuses report wire field validation and rejects
historical budgets, invalid types/enums and inconsistent availability nullability.
This is not full navigation/detail cutover or full Phase 7C.4 completion.

## Files

- `frontend/src/lib/api/reportRead.ts`: exported current-budget decoder.
- `frontend/src/lib/api/masterData.ts`: aggregate current budget mapping.
- `frontend/src/features/connected/ConnectedHomeSnapshot.tsx`: hero budget UI.
- `backend/tests/integration/frontendHomeBudget.test.ts`: boundary tests.
- `backend/tests/browser/homeSnapshot.cjs`: budget runtime fixtures and privacy.
- Documentation index, current state, sprint, handoff and this walkthrough.

## Verification obtained

```text
npx tsc --noEmit
npm run build
npm run build -- --mode connected
npx tsx --test tests/integration/frontendHomeBudget.test.ts tests/integration/frontendMasterData.test.ts
npm run dev -- --mode connected --host 127.0.0.1 --port 5175 --strictPort
node tests/browser/homeSnapshot.cjs
git diff --check
```

Type-check and both builds passed (149 modules). Initial integration run could
not connect to stopped PostgreSQL; after starting existing local installation,
all 12 targeted tests passed. Test DB `pocketflow_test_7b4_windows` and disposable
preview `pocketflow_test_7c1_preview` remain separate. Fixture API restarted on
3000; preview Vite on 5175. No production data or external deployment touched.

Edge browser passed existing Home checks plus real missing aggregate allocation,
UI-fixture available/overbudget (120% text, 100% visual bar, -Rp20,000 remainder),
three masked budget amounts, and known zero with no ratio/bar. Aggregate fixture
is an intercepted response, not a claim that stored transactions are overbudget.
Earlier Home mobile/console checks run in the same script. No unexpected console
or page errors. Expected pre-login 401 and external font failures filtered.
Agent reviewed ignored `backend/.env.home-budget.png`; readable layout and values.
Source/diff review completed. Full backend suite not rerun; no PO manual acceptance.

## Review / remaining

Review budget-vs-balance distinction, unavailable-allocation copy, overbudget and
privacy. Full Home review, complete detail/navigation integration and end-to-end
mutation reconciliation remain next. Current preview is not a production UI
cutover. Status updates rely on existing reload, not a new midnight/polling timer.
