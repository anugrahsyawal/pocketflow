import { AppError } from './errors.js';
import { UUID_V4_REGEX } from './validation.js';

export type ReportPocket = { id: string; name: string; emoji: string; isActive: boolean;
  isArchived: boolean; isSpendable: boolean; openingBalance: string };
export type ReportCategory = { id: string; name: string; emoji: string; isActive: boolean; isArchived: boolean };
export type ReportTransaction = { type: string; amount: string; pocketId: string | null;
  budgetPocketId: string | null; categoryId: string | null; fromPocketId: string | null;
  toPocketId: string | null; transferType: string | null; occurredOn: string };
export type ReportInput = { now: Date; startDate: string; pockets: ReportPocket[];
  categories: ReportCategory[]; transactions: ReportTransaction[];
  allocations: { pocketId: string; allocatedAmount: string }[]; excluded: Set<string> };

const MAX = BigInt(Number.MAX_SAFE_INTEGER);
export function money(value: bigint): number {
  if (value > MAX || value < -MAX) throw new AppError('Report amount exceeds supported range', 422, 'REPORT_AMOUNT_OUT_OF_RANGE');
  return Number(value);
}
export function compareText(a: string, b: string): number {
  const x = Array.from(a, c => c.codePointAt(0)!), y = Array.from(b, c => c.codePointAt(0)!);
  for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] - y[i];
  return x.length - y.length;
}
const labelSort = (a: {label: string; id?: string | null}, b: {label: string; id?: string | null}) =>
  compareText(a.label, b.label) || compareText(a.id ?? '', b.id ?? '');
const active = (p: {isActive: boolean; isArchived: boolean}) => p.isActive && !p.isArchived;
export function jakartaDate(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part('year').padStart(4, '0')}-${part('month')}-${part('day')}`;
}
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function currentStart(now: Date): string {
  const today = jakartaDate(now);
  return Number(today.slice(8)) >= 26 ? today.slice(0, 8) + '26' : addDays(today.slice(0, 8) + '01', -1).slice(0, 8) + '26';
}
export function periodEnd(start: string): string {
  const d = new Date(`${start}T00:00:00Z`); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(25);
  return d.toISOString().slice(0, 10);
}
export function validateReportRequest(start: string, query: Record<string, unknown>, now: Date): Set<string> {
  const invalid = () => { throw new AppError('Invalid report parameters', 400, 'INVALID_INPUT'); };
  if (!/^\d{4}-(0[1-9]|1[0-2])-26$/.test(start) || Number(start.slice(0,4)) < 1 || Number(start.slice(0,4)) > 9998 || start > currentStart(now)) invalid();
  if (Object.keys(query).some(k => k !== 'excludedPocketIds')) invalid();
  const raw = query.excludedPocketIds ?? '';
  if (typeof raw !== 'string' || raw.length > 3699) invalid();
  const ids = raw === '' ? [] : (raw as string).split(',');
  if (ids.length > 100 || ids.some(id => !UUID_V4_REGEX.test(id))) invalid();
  return new Set(ids.map(id => id.toLowerCase()));
}
function status(expense: bigint, allocation: bigint) {
  if (allocation === 0n) return 'tanpa-alokasi';
  if (expense * 10n < allocation * 7n) return 'aman';
  if (expense * 10n < allocation * 9n) return 'waspada';
  return expense < allocation ? 'bahaya' : 'overbudget';
}
function budget(expense: bigint, allocation: bigint | null, current: boolean) {
  const available = current && allocation !== null;
  return {availability: !current ? 'historical-unavailable' : allocation === null ? 'missing-allocation' : 'available',
    revisedAllocation: available ? money(allocation) : null, expense: money(expense),
    remaining: available ? money(allocation - expense) : null,
    usageRatio: available && allocation > 0n ? Number(expense) / Number(allocation) : null,
    status: available ? status(expense, allocation) : null};
}
const sum = (rows: ReportTransaction[]) => rows.reduce((s,t) => s + BigInt(t.amount), 0n);

export function calculateReport(input: ReportInput) {
  const {now, startDate, pockets, categories, transactions, excluded} = input;
  const endDate = periodEnd(startDate), today = jakartaDate(now), current = startDate === currentStart(now);
  const period = transactions.filter(t => t.occurredOn >= startDate && t.occurredOn <= endDate);
  const expenses = period.filter(t => t.type === 'expense'), incomes = period.filter(t => t.type === 'income');
  const transfers = period.filter(t => t.type === 'transfer');
  const expenseTotal = sum(expenses), incomeTotal = sum(incomes), net = incomeTotal - expenseTotal;
  const pMap = new Map(pockets.map(p => [p.id,p])), cMap = new Map(categories.map(c => [c.id,c]));
  const allocations = new Map(input.allocations.map(a => [a.pocketId, BigInt(a.allocatedAmount)]));
  const meta = (id: string, category = false) => {
    const p = category ? cMap.get(id) : pMap.get(id);
    return {id, label: p?.name ?? (category ? 'Tanpa kategori' : 'Pocket tidak tersedia'), emoji: p?.emoji ?? null,
      isMetadataMissing: !p, isCurrentlyActive: p ? active(p) : false};
  };
  const balances = new Map(pockets.map(p => [p.id, BigInt(p.openingBalance)]));
  const delta = (id: string | null, amount: bigint) => {if (id && balances.has(id)) balances.set(id, balances.get(id)! + amount);};
  for (const t of transactions) {
    const amount = BigInt(t.amount);
    if (t.type === 'expense') delta(t.pocketId, -amount);
    if (t.type === 'income') delta(t.pocketId, amount);
    if (t.type === 'transfer') {delta(t.fromPocketId, -amount); delta(t.toPocketId, amount);}
  }
  const daily = [];
  for (let date = startDate; date <= endDate; date = addDays(date,1)) {
    const inc = sum(incomes.filter(t => t.occurredOn === date)), exp = sum(expenses.filter(t => t.occurredOn === date));
    daily.push({date, income: money(inc), expense: money(exp), netCashFlow: money(inc-exp)});
  }
  const breakdown = (category: boolean) => {
    const groups = new Map<string | null, ReportTransaction[]>();
    for (const t of expenses) {const id = category ? t.categoryId : t.pocketId; groups.set(id, [...(groups.get(id) ?? []),t]);}
    return Array.from(groups, ([id, rows]) => ({...meta(id ?? '', category), id, amount: money(sum(rows)), transactionCount: rows.length,
      percentage: expenseTotal > 0n ? Number(sum(rows)) / Number(expenseTotal) * 100 : 0}))
      .sort((a,b) => b.amount-a.amount || labelSort(a,b));
  };
  const categoryRows = breakdown(true), paymentPockets = breakdown(false);
  const ids = new Set(pockets.filter(active).map(p => p.id));
  for (const t of period) for (const id of [t.pocketId,t.budgetPocketId,t.fromPocketId,t.toPocketId]) if(id) ids.add(id);
  const summary = (rows: ReportTransaction[], id: string) => {
    const inbound = sum(rows.filter(t => t.toPocketId === id)), outbound = sum(rows.filter(t => t.fromPocketId === id));
    return {inAmount: money(inbound), outAmount: money(outbound), netAmount: money(inbound-outbound), count: rows.length};
  };
  const pocketBudgetActuals = Array.from(ids, id => {
    const attributed = expenses.filter(t => (t.budgetPocketId ?? t.pocketId) === id);
    const paid = expenses.filter(t => t.pocketId === id);
    const moved = transfers.filter(t => t.fromPocketId === id || t.toPocketId === id);
    const types = [...new Set(moved.map(t => t.transferType ?? 'normal'))].sort(compareText);
    const attributedBudgets = [...new Set(paid.map(t => (t.budgetPocketId ?? t.pocketId)!))].map(pocketId => ({
      pocketId, label: meta(pocketId).label, emoji: meta(pocketId).emoji,
      amount: money(sum(paid.filter(t => (t.budgetPocketId ?? t.pocketId) === pocketId)))}))
      .sort((a,b) => b.amount-a.amount || compareText(a.pocketId,b.pocketId));
    return {...meta(id), budget: budget(sum(attributed), allocations.get(id) ?? null, current),
      attributedExpenseCount: attributed.length, paymentExpense: money(sum(paid)), paymentExpenseCount: paid.length,
      currentBalance: current && balances.has(id) ? money(balances.get(id)!) : null,
      transfers: summary(moved.filter(t => t.transferType !== 'budget-reallocation'),id),
      reallocations: summary(moved.filter(t => t.transferType === 'budget-reallocation'),id),
      transferBreakdown: types.map(type => {const s = summary(moved.filter(t => (t.transferType ?? 'normal') === type),id);
        return {type,inAmount:s.inAmount,outAmount:s.outAmount,count:s.count};}), attributedBudgets};
  }).sort(labelSort);
  const activePockets = pockets.filter(active);
  const totalAllocation = activePockets.length && activePockets.every(p => allocations.has(p.id))
    ? activePockets.reduce((s,p) => s + allocations.get(p.id)!,0n) : null;
  const overall = budget(expenseTotal,totalAllocation,current);
  const weeklyUsage = [1,2,3,4].map(weekNumber => {
    const start = addDays(startDate,(weekNumber-1)*7), end = weekNumber === 4 ? endDate : addDays(start,6);
    const exp = sum(expenses.filter(t => t.occurredOn >= start && t.occurredOn <= end));
    const a = current ? totalAllocation : null;
    return {weekNumber, startDate:start, endDate:end, expense:money(exp), availability:overall.availability,
      temporalState: end < today ? 'selesai' : start > today ? 'akan-datang' : 'berjalan',
      allowance:a === null ? null : {numerator:money(a),denominator:4},
      remaining:a === null ? null : {numerator:money(a-4n*exp),denominator:4},
      usageRatio:a !== null && a > 0n ? Number(4n*exp)/Number(a) : null, status:a === null ? null : status(4n*exp,a)};
  });
  type Insight = {id:string;rule:string;severity:string;pocketId:string|null;categoryId:string|null;
    weekNumber:number|null;amount:number;percentage:number|null};
  const insights: Insight[] = [];
  const insight = (id:string,rule:string,severity:string,amount:number,percentage:number|null,
    pocketId:string|null=null,categoryId:string|null=null,weekNumber:number|null=null) =>
    insights.push({id,rule,severity,amount,percentage,pocketId,categoryId,weekNumber});
  const over = pocketBudgetActuals.filter(p => p.budget.status === 'overbudget').sort((a,b) => {
    const difference = BigInt(b.budget.expense)*BigInt(a.budget.revisedAllocation!) - BigInt(a.budget.expense)*BigInt(b.budget.revisedAllocation!);
    return (difference > 0n ? 1 : difference < 0n ? -1 : 0) || b.budget.expense-a.budget.expense || compareText(a.id,b.id);
  })[0];
  if(over) insight(`overbudget-pocket:${over.id}`,'overbudget-pocket','critical',over.budget.expense,over.budget.usageRatio!*100,over.id);
  const week = weeklyUsage.find(w => w.temporalState === 'berjalan' && ['waspada','bahaya','overbudget'].includes(w.status ?? ''));
  if(week) insight(`running-week-warning:${week.weekNumber}`,'running-week-warning',week.status === 'overbudget' ? 'critical':'warning',week.expense,week.usageRatio!*100,null,null,week.weekNumber);
  const cat = categoryRows[0];
  if(cat && BigInt(cat.amount)*100n >= expenseTotal*40n) insight(`category-concentration:${cat.id ?? 'none'}`,'category-concentration','info',cat.amount,cat.percentage,null,cat.id);
  if(insights.length < 3 && net !== 0n) insight(`net-cash-flow:${net < 0n ? 'deficit':'surplus'}`,'net-cash-flow',net < 0n ? 'warning':'positive',money(net < 0n ? -net:net),null);
  const severity:Record<string,number> = {critical:4,warning:3,info:2,positive:1};
  insights.sort((a,b) => severity[b.severity]-severity[a.severity] || (b.percentage ?? 0)-(a.percentage ?? 0) || b.amount-a.amount || compareText(a.id,b.id));
  const candidates = current ? activePockets.filter(p => p.isSpendable).map(p => {
    const bal = balances.get(p.id)!;
    return {pocketId:p.id,label:p.name,emoji:p.emoji,currentBalance:money(bal),eligibleAmount:money(bal > 0n ? bal:0n),isExcluded:excluded.has(p.id)};
  }).sort((a,b) => b.eligibleAmount-a.eligibleAmount || compareText(a.label,b.label) || compareText(a.pocketId,b.pocketId)) : [];
  const daysRemaining = current ? Math.round((Date.parse(endDate+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000) : null;
  const sinkingStatus = !current ? 'historical-unavailable' : daysRemaining! > 5 ? 'not-near-period-end'
    : candidates.length === 0 ? 'no-eligible-pockets' : candidates.every(c => c.eligibleAmount === 0) ? 'no-positive-balance':'available';
  const suggestedAmount = !current ? null : sinkingStatus !== 'available' ? 0
    : money(candidates.filter(c => !c.isExcluded).reduce((s,c) => s+BigInt(c.eligibleAmount),0n));
  return {schemaVersion:1,generatedAt:now.toISOString(),timezone:'Asia/Jakarta',period:{startDate,endDate,isCurrent:current},
    totals:{totalIncome:money(incomeTotal),totalExpense:money(expenseTotal),netCashFlow:money(net),transferVolume:money(sum(transfers)),
      transactionCount:period.length,incomeCount:incomes.length,expenseCount:expenses.length,transferCount:transfers.length},
    daily,budget:overall,pocketBudgetActuals,categories:categoryRows,paymentPockets,weeklyUsage,insights:insights.slice(0,3),
    sinkingFund:{status:sinkingStatus,daysRemaining,suggestedAmount,candidates}};
}
