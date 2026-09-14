# Phase 7B.5 — Reports API contract draft

Date: 2026-09-14
Status: Superseded exploratory draft. R-1/R-2/R-3 accepted in DEC-031.
The [finalized technical specification](REPORTS_API_CONTRACT.md) is the current
review document; full contract acceptance and implementation authorization are
still pending. The original draft below is retained for traceability.
Author: Codex (PM / Technical Lead).
Entry checkpoint: `5e019db`, pushed to `origin/main`; clean tree verified before
starting this documentation phase. Phase 7B.4 remediation was accepted by PO.

## 1. Purpose and authority

Specify backend report data without changing the accepted Reports UI or MVP.
Authorities: PR-002–008, PR-010–015, DEC-019/020/023/024/027/030,
[backend architecture](BACKEND_ARCHITECTURE_DECISION_PACK.md), and
[Reports presentation specification](../design/google-stitch/iteration-3/REPORTS_IMPLEMENTATION_SPEC.md).
Backlog coverage: Epic 8, with CSV integration tracked separately under 10.1.

Inspected: current Stitch Reports screenshot and specification,
`frontend/src/features/reports/ReportsPage.tsx`,
`frontend/src/lib/reportCalculations.ts`, `frontend/src/data/constants.ts`,
`backend/src/routes/pockets.ts`, transaction implementation/contracts and schema.
Existing frontend behavior is evidence, not permission to copy drift into API.

No route, schema, package, deployment, frontend, sync or backup implementation
is included in this draft task. Prior 193-test evidence belongs to Phase 7B.4,
not to these unimplemented report endpoints.

## 2. Route boundary (already listed in architecture)

| Method/path | Proposed behavior |
|---|---|
| GET `/v1/reports/current-period` | Resolve current Jakarta 26–25 period; return the same envelope as the explicit-period route |
| GET `/v1/reports/periods/:startDate` | Validate real `YYYY-MM-DD` date with day 26; derive next month's day 25 |

No new `/reports/export`, preference-write, allocation-write or purge endpoint.
Both GETs require valid owner session, not CSRF or mutation IDs. Proposed
`Cache-Control: private, no-store`; no client-supplied owner ID or current time.
Use one injected server clock for deterministic tests, `Asia/Jakarta` for
business dates, UTC ISO timestamp for `generatedAt`.

Proposed errors use the existing `{error:{code,message,statusCode}}` envelope:
401 UNAUTHENTICATED; 400 INVALID_INPUT for malformed dates, wrong start day,
unknown parameters, or future-period selection (frontend has no future navigation).
Missing period row is not 404: return truthful transaction aggregates and
explicit allocation-unavailable metadata; GET must not create periods or budgets.
Pre-setup behavior should match the approved setup/master-data contract and must
be finalized in the endpoint schemas before implementation.

## 3. Financial invariants and query consistency

- Every query/join is scoped to authenticated owner. Read all aggregate sections
  from one read-only repeatable-read database transaction to avoid mixing totals
  from different transaction revisions during concurrent writes.
- Period filter is inclusive on `occurred_on`, not `created_at`.
- Exclude `archived_at IS NOT NULL` and `deleted_at IS NOT NULL` transactions.
  Do not discard still-active transactions merely because their pocket/category
  metadata is now archived. Resolve current metadata with an explicit flag;
  names are not historical name snapshots.
- Income/expense are counted once. Transfer volume counts each transfer once,
  including reallocation, but contributes zero to income/expense/net cash flow.
- Cash and NFC retain independent payment balances. Expense attributed to budget
  uses the stored `budget_pocket_id`, falling back to `pocket_id` only if null;
  never recompute old attribution from today's owner mapping.
- Category and top-spending-pocket breakdowns group by the actual payment
  pocket/category, not budget owner. Budget vs Actual groups by budget owner.
  These are two views of the same expenses, not additive totals.
- Current balance uses opening balance plus all active transaction effects
  (not just selected-period transactions). Label it current, not period-end.
- Database `pocket_budget_allocations.allocated_amount` is already revised by
  reallocation endpoints. Do NOT add transfer reallocation again. The frontend
  starts from a base monthly allocation and therefore cannot be copied verbatim.
- Transfers show ordinary in/out and budget-reallocation in/out separately.
  Payment expense amount and attributed expense amount must have distinct names.
- Compute money totals exactly; reject an unrepresentable aggregate instead of
  rounding beyond JavaScript safe integer. Proposed typed 422 error:
  REPORT_AMOUNT_OUT_OF_RANGE. Ratios are display analytics, never ledger writes.

## 4. Proposed response shape (to finalize after decisions in section 7)

One versioned envelope, no raw transaction list or pagination in report totals:

```typescript
type Availability = 'available' | 'missing-allocation' | 'historical-unavailable';
type Report = {
  schemaVersion: 1;
  generatedAt: string;
  timezone: 'Asia/Jakarta';
  period: { startDate: string; endDate: string; isCurrent: boolean };
  totals: {
    totalIncome: number; totalExpense: number; netCashFlow: number;
    transferVolume: number; transactionCount: number;
    incomeCount: number; expenseCount: number; transferCount: number;
  };
  daily: { date: string; income: number; expense: number; netCashFlow: number }[];
  budget: {
    availability: Availability; revisedAllocation: number | null;
    expense: number; remaining: number | null; usageRatio: number | null;
  };
  // Exact item schemas, reason enums and optional section parameters still TBD.
  pocketBudgetActuals: PocketBudgetActual[];
  categories: CategoryBreakdown[];
  paymentPockets: PaymentPocketBreakdown[];
  weeklyUsage: WeeklyUsage[];
  insights: RuleBasedInsight[];
  sinkingFund: SinkingFundRecommendation;
};
```

The types with TBD schemas above are design placeholders, NOT compile-ready
code or a finalized contract. Null means unavailable, never Rp0. Actual
transaction totals remain available in historical/empty reports. Explicit
zero allocation is different from a missing allocation row.

Proposed pocket item fields: ID/current label/emoji/active flag; availability;
revised allocation; attributed expense/count; payment expense/count; ordinary
transfer in/out/count; reallocation in/out/count; current balance (current
period only); remaining/usage/status when allocation is known. Do not promise
an original allocation snapshot until a source is approved.

Category rows: category ID or null, label, emoji, amount, count, percentage.
Payment pocket rows: pocket ID, label, emoji, amount, count, percentage.
Return complete breakdowns; the UI groups categories as top five + Lainnya and
chooses its top-pocket display limit. Deterministic ordering: amount descending,
label then ID ascending, with a fixed documented comparison in final schema.
Daily array includes every date of the period, zero-filled for missing activity.

Weekly rows use 7–7–7–remainder day buckets, expense from transactions and
temporal state separated from financial status. DEC-019 is exact division by
four, so proposed response represents the allowance as
`{numerator: totalAllocation, denominator: 4}` if needed to avoid inventing a
rounding policy for fractional Rupiah. Thresholds from existing behavior:
<70% aman, <90% waspada, <100% bahaya, otherwise overbudget; known zero allocation
is tanpa-alokasi. Unknown allocation has no financial status.

Insights: maximum three deterministic results, no AI calls. Preserve existing
priorities (overbudget, current-week warning, category concentration, cash flow)
and suppress allocation-dependent rules when unavailable. Exact thresholds,
tie-breakers, output keys and low-data cases must be enumerated in final schema
and fixtures, not inferred from Stitch sample copy.

Sinking Fund: informational only; no transfer CTA/action. Existing rule is
`0 <= daysRemaining <= 5`, including day 25; active spendable pockets, positive
current balances, omit owner-excluded pockets. No historical recommendation.
Do not create a settings storage model as a side effect of this GET contract.

CSV remains the existing frontend function until the frontend integration phase.
Integration must fetch all relevant transaction pages before CSV creation; report
aggregates must never depend on the default 50-row transaction page.

## 5. Required domain acceptance fixtures

1. Transport opening balance Rp200,000; NFC Rp0. Transfer Rp100,000 to NFC;
   NFC fare Rp18,000 attributed to Transport. Balances: Rp100,000 and Rp82,000;
   Transport budget expense Rp18,000; total expense Rp18,000; transfer volume
   Rp100,000; no transfer counted as income/expense.
2. Reallocate Rp30,000 from Food to Personal Care, then spend Rp30,000 there.
   Revised allocations read from database once; Food allocation down Rp30,000,
   Personal Care up Rp30,000, total allocation unchanged; expense counted once.
3. Changing Cash/NFC owner does not change past expense attribution.
4. Archive/restore/delete changes aggregates consistently with active ledger;
   delete tombstones are excluded without waiting for physical purge.
5. Current empty period returns zero actuals and known allocation only when
   stored; historical empty period never borrows today's budget/balance.

## 6. Test plan for implementation gate

- Authentication/owner isolation, metadata ownership, unsupported parameters,
  date validation, December/year rollover and leap February boundaries.
- Jakarta date boundary independent of machine/server timezone; alias and
  explicit current-period route match except generated timestamp.
- Mixed expense/income/transfer sums, more than 50 transactions, archive/delete
  filtering, daily zero-fill, independent payment/budget attribution.
- Stored revised allocations not double-counted; missing versus explicit zero;
  period without row; archived metadata; historical unavailable states.
- Four weekly buckets, threshold edges and fractional division by four;
  zero denominator, negative remaining and large-total handling.
- Category null/ties/top-five grouping compatibility and sum conservation.
- Sinking date boundaries, positive/zero/negative balances, exclusions, empty
  candidates and historical unavailability; deterministic insight fixtures.
- Read-only behavior: no new periods/allocations/transactions after either GET.
  Concurrent write consistency test; schema validation on every response.
- Existing 193 backend tests remain green; type-check/build, migrations and
  bounded live HTTP verification; no frontend integration claim without testing.

## 7. PO decisions requested (recommendations, not accepted decisions)

| ID | Recommendation | Why |
|---|---|---|
| R-1 | Keep historical budget/weekly allowance/current balance/Sinking values unavailable in 7B.5; still show historical transaction analytics | Per-period allocation rows exist but do not prove a complete immutable snapshot; avoid expanding historical capability silently |
| R-2 | Missing current-period allocations show "Belum diatur"; never auto-copy last period or create budgets while reading reports | Automatic monthly allocation rollover has no approved workflow and missing data is not zero |
| R-3 | Keep Sinking exclusions local for now and pass selected IDs to report GET via a validated optional parameter; no new preference database | Preserves the current interaction without introducing settings/sync scope; exact parameter/schema to finalize after approval |

These choices are intentionally not added to the accepted decision log yet.
After PO response: finalize all field schemas/examples/error codes, thresholds
and test IDs; submit the completed contract for acceptance. Then obtain explicit
implementation authorization, check a clean tree, and implement 7B.5. Approval
to continue work or draft this contract does not waive that implementation gate.
