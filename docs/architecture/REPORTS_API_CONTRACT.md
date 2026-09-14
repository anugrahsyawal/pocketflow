# Phase 7B.5 — Reports API contract

Date: 2026-09-14
Status: Product Owner accepted the complete contract and explicitly authorized
implementation in the delivery conversation on 2026-09-14. DEC-031 remains
accepted. The documentation checkpoint was committed as `0e2eb5e` before
implementation began from a clean tree. Implementation and verification evidence
are tracked in the [walkthrough](../walkthroughs/phase-7b5-reports-api.md);
implementation acceptance is separate from contract acceptance.

This replaces the exploratory [draft](REPORTS_API_CONTRACT_DRAFT.md).
Authority: [decision log](../decisions/DECISION_LOG.md) DEC-019/020/023/024/030/031;
[requirements](../product/PRODUCT_REQUIREMENTS.md) PR-002–008, PR-010–015;
[architecture](BACKEND_ARCHITECTURE_DECISION_PACK.md); and the
[Reports UI specification](../design/google-stitch/iteration-3/REPORTS_IMPLEMENTATION_SPEC.md).
Existing frontend functions were inspected to preserve thresholds and behavior;
raw Stitch data/code is not an implementation source. No UI redesign is proposed.

## 1. Requests and errors

Only `GET /v1/reports/current-period` and
`GET /v1/reports/periods/:startDate`, both using the same response schema below.
Require owner session using existing auth hook. GET requires no CSRF token,
clientMutationId or expectedRevision. All responses use private, no-store caching.

Capture one server instant for generatedAt/current-period/weekly/Sinking dates.
Business timezone is Asia/Jakarta irrespective of host timezone. Explicit start
must be a valid four-digit Gregorian date, day 26; end is next month's day 25.
Reject a start later than the current period start. Supported years 0001–9998;
do not use JavaScript's special numeric-year 0–99 constructor behavior.

Both routes accept only optional `excludedPocketIds`, one comma-separated string
of UUID-v4s. Absent or empty means none. Maximum 100 entries and 3699 characters;
reject repeated query keys, arrays, whitespace/empty tokens and malformed UUIDs.
Normalize UUIDs to lowercase, deduplicate, then intersect with owner pocket IDs.
Unknown/other-owner IDs are silently ignored (no existence disclosure). Archived
or non-spendable pockets are already ineligible. Parameters never persist state.
Validate syntax even for historical reports, where exclusions have no effect.

| HTTP | error.code | Meaning |
|---|---|---|
| 401 | UNAUTHENTICATED | Invalid/missing/expired session; check before report validation |
| 400 | INVALID_INPUT | Invalid date/start day/future period, unknown or malformed query |
| 422 | REPORT_AMOUNT_OUT_OF_RANGE | Any emitted amount/count exceeds safe-integer bounds |
| 500 | INTERNAL_SERVER_ERROR | Sanitized unexpected failure, no SQL/secrets in response |

Example: `{"error":{"code":"INVALID_INPUT","message":"Invalid report parameters","statusCode":400}}`.
An authenticated owner before setup receives an empty report with unavailable
allocation; no new setup guard/error is introduced. Missing period row is not
404 and GET never creates it. Names resolve from current owner metadata, not
historical names. Invalid legacy foreign references use fallback metadata
without accessing another owner's rows.

## 2. Common type/schema rules

The following is the complete wire-field inventory, not application code.
All fields are required; all objects reject additional properties. Nullability
is explicit. JSON Schema implementation must enforce these rules and enums.
`UUID` = UUID-v4 string; `DateOnly` = valid YYYY-MM-DD; `Instant` = UTC ISO string.
`Amount` = signed safe-integer Rupiah, `Count` = nonnegative safe integer.
Income/expense/allocation/transfer volumes and counts are nonnegative. Balances,
remaining and net cash flow may be negative. No NaN/infinity/negative zero.
`Ratio` = finite nonnegative number, not clamped to 1; zero allocation => null.
Null means unavailable, not Rp0. Ratios are analytics, never stored ledger money.

```typescript
type Availability = 'available' | 'missing-allocation' | 'historical-unavailable';
type BudgetStatus = 'aman' | 'waspada' | 'bahaya' | 'overbudget' | 'tanpa-alokasi';
type Fraction = { numerator: Amount; denominator: 4 };
type Budget = {
  availability: Availability; revisedAllocation: Amount | null;
  expense: Amount; remaining: Amount | null;
  usageRatio: Ratio | null; status: BudgetStatus | null;
};
type Metadata = {
  id: UUID; label: string; emoji: string | null;
  isMetadataMissing: boolean; isCurrentlyActive: boolean;
};
type TransferSummary = {
  inAmount: Amount; outAmount: Amount; netAmount: Amount; count: Count;
};
type PocketBudgetActual = Metadata & {
  budget: Budget; attributedExpenseCount: Count;
  paymentExpense: Amount; paymentExpenseCount: Count;
  currentBalance: Amount | null;
  transfers: TransferSummary; reallocations: TransferSummary;
  transferBreakdown: { type: string; inAmount: Amount; outAmount: Amount; count: Count }[];
  attributedBudgets: { pocketId: UUID; label: string; emoji: string | null; amount: Amount }[];
};
type Breakdown = {
  id: UUID | null; label: string; emoji: string | null;
  isMetadataMissing: boolean; isCurrentlyActive: boolean;
  amount: Amount; transactionCount: Count; percentage: Ratio;
};
type Week = {
  weekNumber: 1 | 2 | 3 | 4; startDate: DateOnly; endDate: DateOnly;
  temporalState: 'selesai' | 'berjalan' | 'akan-datang';
  expense: Amount; availability: Availability;
  allowance: Fraction | null; remaining: Fraction | null;
  usageRatio: Ratio | null; status: BudgetStatus | null;
};
type Insight = {
  id: string;
  rule: 'overbudget-pocket' | 'running-week-warning' | 'category-concentration' | 'net-cash-flow';
  severity: 'critical' | 'warning' | 'info' | 'positive';
  pocketId: UUID | null; categoryId: UUID | null; weekNumber: 1 | 2 | 3 | 4 | null;
  amount: Amount; percentage: Ratio | null;
};
type SinkingFund = {
  status: 'not-near-period-end' | 'available' | 'no-eligible-pockets' |
    'no-positive-balance' | 'historical-unavailable';
  daysRemaining: Count | null; suggestedAmount: Amount | null;
  candidates: { pocketId: UUID; label: string; emoji: string | null;
    currentBalance: Amount; eligibleAmount: Amount; isExcluded: boolean }[];
};
type Report = {
  schemaVersion: 1; generatedAt: Instant; timezone: 'Asia/Jakarta';
  period: { startDate: DateOnly; endDate: DateOnly; isCurrent: boolean };
  totals: { totalIncome: Amount; totalExpense: Amount; netCashFlow: Amount;
    transferVolume: Amount; transactionCount: Count; incomeCount: Count;
    expenseCount: Count; transferCount: Count };
  daily: { date: DateOnly; income: Amount; expense: Amount; netCashFlow: Amount }[];
  budget: Budget; pocketBudgetActuals: PocketBudgetActual[];
  categories: Breakdown[]; paymentPockets: Breakdown[];
  weeklyUsage: Week[]; insights: Insight[]; sinkingFund: SinkingFund;
};
```

Response is a Report directly, not `{report: Report}`. Payment pocket breakdown
IDs cannot be null; category null is Tanpa kategori. `transferBreakdown.type`
uses the six values in the transaction contract; omit zero-count types and sort
by type ascending. Ordinary `transfers` excludes budget-reallocation;
`reallocations` includes only that type. All in/out amounts are positive
magnitudes; net = in minus out. Count a transfer once per affected pocket.

## 3. Deterministic financial mapping

Read all report sections from one READ ONLY REPEATABLE READ database transaction.
Every row/join must be owner-scoped, including referenced metadata. Aggregate
all transactions in the period, never just the transaction-list default page.
Active transactions have both archivedAt and deletedAt null. Filter inclusive
occurredOn dates, never audit dates. Metadata archive does not erase expenses.

- Totals: income/expense sums, net = income minus expense; transfer volume sums
  each transfer once, financially neutral, including budget reallocation.
- Daily: one row per period date ascending, zero-filled; only income/expense.
- Budget actual uses stored budgetPocketId, or payment pocket only if null;
  payment expense/breakdown uses pocketId. Never reattribute past records using
  today's Cash/NFC configuration. Attribution and payment views are not additive.
- Pocket row set: union of current active pockets and all pockets involved in
  selected-period payment/transfer/budget attribution, including archived ones.
  Sort by label then ID using Unicode code-point ascending, locale-independent.
- Current balance (only current period) = opening balance + all active income
  + all inbound transfers - all active expense - all outbound transfers. This
  preserves existing all-active-ledger behavior, including future-dated entries;
  it is NOT a reconstructed period-end or as-of balance. Missing metadata => null.
- Current revised allocation comes directly from the selected period row; do
  not add reallocation again. No base/original allocation snapshot is fabricated.
  Per-pocket missing row => missing-allocation; known zero remains available.
- Overall budget uses active pockets only for allocation (existing frontend
  policy), but total period expenses for actuals. If any active pocket lacks an
  allocation, or no active pockets/period exist, overall budget is unavailable.
  Do not present a partial sum as a complete budget. Individual known rows remain
  available. A later allocation-initialization workflow is outside this phase.
- Historical budget availability is historical-unavailable, irrespective of
  stored rows. Keep actual expense/counts/transfers; allocation, remaining,
  usage/status/currentBalance are null. No automatic rollover writes anywhere.
- Available budget: remaining = revisedAllocation - expense. Ratio = expense /
  allocation when >0, else null. Status thresholds: <0.7 aman, <0.9 waspada,
  <1 bahaya, otherwise overbudget; known zero => tanpa-alokasi. Unknown => null.
- Breakdowns: all positive expense groups, percentage = amount/totalExpense*100;
  no groups when totalExpense=0. Sort amount descending then label and ID ascending.
  Null ID sorts before non-null IDs. Missing labels: Tanpa kategori for absent
  category, Pocket tidak tersedia for absent pocket. Missing metadata has null
  emoji and false active flag. Retain non-null unresolved IDs in separate groups.
- Frontend groups top five categories + Lainnya and limits top-pocket display;
  API returns all groups. attributedBudgets uses stored budget attribution for
  expenses paid by that row's pocket; sort amount descending then pocketId.
- Weekly: days 1–7, 8–14, 15–21, 22–end. Expense counts once. If overall budget
  available, allowance={numerator:allocation,denominator:4}, remaining numerator
  = allocation - 4*weekExpense; compute exactly before range checking. Usage =
  4*expense/allocation; same status thresholds. Missing/historical allowance,
  remaining, ratio, status => null but expense/dates/temporalState remain real.

For exact computations use integer arithmetic before conversion, including sums
and intermediate multiplication. Reject if any emitted integer exceeds safe
bounds; never wrap or truncate. Compare ratio thresholds exactly by cross-product.

## 4. Insights and Sinking Fund

Insights are structured facts; UI owns Indonesian display text and styling.
Preserve existing rule eligibility: generate up to one candidate per rule below.

1. Current available pocket budget with allocation>0 and ratio>=1: choose highest
   ratio, then expense descending then ID. Emit critical; amount=attributed
   expense, percentage=ratio*100, pocketId=selected ID, other driver fields null.
2. Current running week with available positive allowance and ratio>=0.7: warning
   below 1, critical otherwise; amount=weekExpense, percentage=ratio*100,
   weekNumber set, pocket/category IDs null (no invented category causality).
3. Highest category breakdown with percentage>=40 and positive total expense:
   info, categoryId selected (may be null), amount and percentage from breakdown.
4. If fewer than three candidates exist, nonzero net cash flow: negative gives
   warning, positive gives positive; amount=absolute net, percentage=null.

IDs: `overbudget-pocket:<uuid>`, `running-week-warning:<1..4>`,
`category-concentration:<uuid-or-none>`, `net-cash-flow:<deficit-or-surplus>`.
Unused nullable fields are null. Sort severity critical>warning>info>positive,
then percentage (null=0) descending, amount descending, ID ascending; limit 3.
No minimum transaction count invented; empty/transfer-only totals => no insight.
Historical reports permit rules 3/4 only. No comparison to previous periods,
AI text, driver correlations or Sinking transfer suggestions outside these facts.

Sinking candidates: currently active, non-archived, spendable owner pockets,
each independent (never merge Cash/NFC balances with their budget owner).
eligibleAmount=max(currentBalance,0); exclusions mark candidates, do not hide
them; sort eligible descending then label/ID. Sum non-excluded eligible amounts.
Status precedence:

1. Historical: historical-unavailable, daysRemaining=null, suggestedAmount=null,
   candidates=[] (unknown is not zero).
2. Current daysRemaining>5: not-near-period-end, suggestedAmount=0; include candidates.
3. No candidates: no-eligible-pockets, suggestedAmount=0.
4. All eligible amounts zero: no-positive-balance, suggestedAmount=0.
5. Otherwise available and computed sum (may be 0 if all positive candidates excluded).

daysRemaining is Jakarta calendar days to the 25th, 0 on that day. No POST,
settings write or automatic transfer. Local exclusions persist in existing
frontend state and travel only as the optional query parameter above.

## 5. Exact examples / fixtures

These are field-level examples; full responses must also contain the zero-filled
daily array and all fields defined above.

| Fixture | Expected fields |
|---|---|
| Transport opens 200000; NFC opens 0; transfer 100000; NFC expense 18000 attributed to Transport | totalExpense=18000, totalIncome=0, netCashFlow=-18000, transferVolume=100000, transactionCount=2; current balances Transport=100000, NFC=82000; Transport budget.expense=18000, NFC paymentExpense=18000 |
| Explicit current allocation 0, expense 18000 | budget availability=available, revisedAllocation=0, remaining=-18000, usageRatio=null, status=tanpa-alokasi |
| Missing current allocation, expense 18000 | availability=missing-allocation, expense=18000; revisedAllocation/remaining/usageRatio/status=null |
| Historical same expense | availability=historical-unavailable; actual=18000, currentBalance=null, Sinking suggestedAmount=null |
| Total allocation 100001; weekExpense=10000 | allowance={"numerator":100001,"denominator":4}; remaining={"numerator":60001,"denominator":4} |
| Reallocate Food 30000 to Care | DB revised allocation returned once; overall allocation unchanged; no new income/expense |

Example request: `/v1/reports/periods/2026-08-26?excludedPocketIds=11111111-2222-4333-8444-555555555555`.
Current alias with frozen clock 2026-09-14T00:00:00Z resolves start 2026-08-26,
end 2026-09-25; four weeks end Sep 1/8/15/25, running week=3.

## 6. Required verification matrix and gate

| IDs | Cases required before delivery |
|---|---|
| RP-01–04 | Both unauthenticated routes; expired session; other-owner transactions/metadata and exclusions never disclosed |
| RP-05–09 | Malformed/nonexistent date, wrong day, future period, invalid/repeated/unknown query, oversized exclusions |
| RP-10–14 | Jakarta boundary, December rollover, leap February, alias equality with injected clock, pre-setup and missing period read-only |
| RP-15–20 | Mixed totals, neutral transfers, >50 rows, daily zero-fill, archive/restore/delete, archived metadata preservation |
| RP-21–25 | Cash/NFC fixture, owner-map changes preserve attribution, payment versus budget sums, reallocation once, independent balances |
| RP-26–30 | Missing versus zero, partial active allocation, historical unavailable despite rows, no GET writes, same repeatable-read snapshot |
| RP-31–35 | Four weekly buckets, exact fractions, thresholds at .7/.9/1, zero denominator, integer overflow rejection |
| RP-36–40 | Breakdown ties/null categories/top-five compatibility, deterministic insights, historical/empty insight suppression, no double counting |
| RP-41–46 | Sinking day6/day5/day0 boundaries, no eligible pockets, nonpositive balances, all excluded, historical null, local query not persisted |
| RP-47–49 | All response objects satisfy schema, private no-store headers, baseline 193 tests remain green |

Before coding: accept this complete contract, authorize implementation explicitly,
and start from a clean working tree. Scope is the two read-only routes, pure
calculations, schemas and integration tests. No new dependencies or migrations
without approval. Implementer must run type-check/build, live PostgreSQL tests,
migrations, source/diff review and bounded HTTP checks. Manual frontend
integration, CSV paging, sync, deployment and new settings remain separate.
