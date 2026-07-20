import { Transaction } from '@/types/transaction';
import { Category } from '@/types/category';
import { Pocket } from '@/types/pocket';
import { STATUS_THRESHOLDS } from '@/data/constants';
import { isValidLocalDateString } from '@/lib/budgetPeriod';

export interface ReportTotals {
  totalExpense: number;
  totalIncome: number;
  netCashFlow: number;
  transferVolume: number;
  transactionCount: number;
  expenseCount: number;
  incomeCount: number;
  transferCount: number;
}

export interface ReportBreakdownItem {
  id: string;
  label: string;
  emoji?: string;
  amount: number;
  transactionCount: number;
  percentage: number;
}

export function calculateReportTotals(transactions: Transaction[]): ReportTotals {
  let totalExpense = 0;
  let totalIncome = 0;
  let transferVolume = 0;
  let expenseCount = 0;
  let incomeCount = 0;
  let transferCount = 0;

  for (const t of transactions) {
    if (t.isArchived) continue;
    if (t.type === 'expense') {
      totalExpense += t.amount;
      expenseCount++;
    } else if (t.type === 'income') {
      totalIncome += t.amount;
      incomeCount++;
    } else if (t.type === 'transfer') {
      transferVolume += t.amount;
      transferCount++;
    }
  }

  const netCashFlow = totalIncome - totalExpense;
  const transactionCount = expenseCount + incomeCount + transferCount;

  return {
    totalExpense,
    totalIncome,
    netCashFlow,
    transferVolume,
    transactionCount,
    expenseCount,
    incomeCount,
    transferCount,
  };
}

export function calculateExpenseBreakdownByCategory(
  expenses: Transaction[],
  categories: Category[],
  totalExpense: number
): ReportBreakdownItem[] {
  const categoryMap = new Map<string, Category>();
  for (const cat of categories) {
    categoryMap.set(cat.id, cat);
  }

  const groups = new Map<string, { amount: number; count: number }>();
  for (const t of expenses) {
    if (t.type !== 'expense' || t.isArchived) continue;
    const catId = t.categoryId || '';
    const current = groups.get(catId) || { amount: 0, count: 0 };
    groups.set(catId, {
      amount: current.amount + t.amount,
      count: current.count + 1,
    });
  }

  const items: ReportBreakdownItem[] = [];
  groups.forEach((value, categoryId) => {
    const cat = categoryId ? categoryMap.get(categoryId) : undefined;
    const label = cat ? cat.name : 'Tanpa kategori';
    const emoji = cat ? cat.emoji : '🧾';
    const percentage = totalExpense > 0 ? (value.amount / totalExpense) * 100 : 0;

    items.push({
      id: categoryId || 'none',
      label,
      emoji,
      amount: value.amount,
      transactionCount: value.count,
      percentage,
    });
  });

  items.sort((a, b) => {
    if (b.amount !== a.amount) {
      return b.amount - a.amount;
    }
    return a.label.localeCompare(b.label);
  });

  return items;
}

export function calculateExpenseBreakdownByPocket(
  expenses: Transaction[],
  pockets: Pocket[],
  totalExpense: number
): ReportBreakdownItem[] {
  const pocketMap = new Map<string, Pocket>();
  for (const p of pockets) {
    pocketMap.set(p.id, p);
  }

  const groups = new Map<string, { amount: number; count: number }>();
  for (const t of expenses) {
    if (t.type !== 'expense' || t.isArchived) continue;
    const pId = t.pocketId || '';
    const current = groups.get(pId) || { amount: 0, count: 0 };
    groups.set(pId, {
      amount: current.amount + t.amount,
      count: current.count + 1,
    });
  }

  const items: ReportBreakdownItem[] = [];
  groups.forEach((value, pocketId) => {
    const p = pocketMap.get(pocketId);
    const label = p ? p.name : 'Pocket tidak tersedia';
    const emoji = p ? p.emoji : '📁';
    const percentage = totalExpense > 0 ? (value.amount / totalExpense) * 100 : 0;

    items.push({
      id: pocketId,
      label,
      emoji,
      amount: value.amount,
      transactionCount: value.count,
      percentage,
    });
  });

  items.sort((a, b) => {
    if (b.amount !== a.amount) {
      return b.amount - a.amount;
    }
    return a.label.localeCompare(b.label);
  });

  return items;
}

export interface DailyCashFlowPoint {
  date: string;
  dayLabel: string;
  income: number;
  expense: number;
}

export interface CategoryChartItem {
  id: string;
  label: string;
  emoji?: string;
  amount: number;
  transactionCount: number;
  percentage: number;
  isCombinedOther?: boolean;
}

export interface TopPocketSpendingItem {
  id: string;
  label: string;
  emoji?: string;
  amount: number;
  transactionCount: number;
  percentageOfTop: number;
  percentageOfTotal: number;
}

export function calculateDailyCashFlow(
  transactions: Transaction[],
  startDateStr: string,
  endDateStr: string
): DailyCashFlowPoint[] {
  const parseLocalDate = (dateStr: string): Date => {
    const parts = (dateStr || '').split('-').map(Number);
    const y = parts[0] ?? 2026;
    const m = parts[1] ?? 1;
    const d = parts[2] ?? 1;
    return new Date(y, m - 1, d);
  };

  const toLocalDateStr = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const INDO_MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
  ];

  const start = parseLocalDate(startDateStr);
  const end = parseLocalDate(endDateStr);

  const points: DailyCashFlowPoint[] = [];
  const current = new Date(start);

  let loopCount = 0;
  while (current <= end && loopCount < 100) {
    loopCount++;
    const dateStr = toLocalDateStr(current);
    const day = current.getDate();
    const monthLabel = INDO_MONTHS[current.getMonth()] || '';
    
    points.push({
      date: dateStr,
      dayLabel: `${day} ${monthLabel}`,
      income: 0,
      expense: 0,
    });

    current.setDate(current.getDate() + 1);
  }

  const pointMap = new Map<string, DailyCashFlowPoint>();
  for (const pt of points) {
    pointMap.set(pt.date, pt);
  }

  for (const t of transactions) {
    if (t.isArchived) continue;
    const pt = pointMap.get(t.date);
    if (pt) {
      if (t.type === 'expense') {
        pt.expense += t.amount;
      } else if (t.type === 'income') {
        pt.income += t.amount;
      }
    }
  }

  return points;
}

export function prepareCategoryChartData(
  breakdownItems: ReportBreakdownItem[],
  maxVisibleCategories = 5
): CategoryChartItem[] {
  const sorted = [...breakdownItems].sort((a, b) => b.amount - a.amount);
  const totalAmount = sorted.reduce((sum, item) => sum + item.amount, 0);

  if (sorted.length <= maxVisibleCategories) {
    return sorted.map((item) => ({
      id: item.id,
      label: item.label,
      emoji: item.emoji,
      amount: item.amount,
      transactionCount: item.transactionCount,
      percentage: item.percentage,
    }));
  }

  const visible = sorted.slice(0, maxVisibleCategories);
  const remainder = sorted.slice(maxVisibleCategories);

  const otherAmount = remainder.reduce((sum, item) => sum + item.amount, 0);
  const otherCount = remainder.reduce((sum, item) => sum + item.transactionCount, 0);
  const otherPercentage = totalAmount > 0 ? (otherAmount / totalAmount) * 100 : 0;

  const items: CategoryChartItem[] = visible.map((item) => ({
    id: item.id,
    label: item.label,
    emoji: item.emoji,
    amount: item.amount,
    transactionCount: item.transactionCount,
    percentage: item.percentage,
  }));

  items.push({
    id: 'other',
    label: 'Lainnya',
    emoji: '📊',
    amount: otherAmount,
    transactionCount: otherCount,
    percentage: otherPercentage,
    isCombinedOther: true,
  });

  return items;
}

export function prepareTopPocketSpending(
  breakdownItems: ReportBreakdownItem[],
  maxVisiblePockets = 5
): TopPocketSpendingItem[] {
  const sorted = [...breakdownItems].sort((a, b) => b.amount - a.amount);
  const totalAmount = sorted.reduce((sum, item) => sum + item.amount, 0);
  const topAmount = sorted.length > 0 ? (sorted[0]?.amount ?? 0) : 0;

  const visible = sorted.slice(0, maxVisiblePockets);

  return visible.map((item) => {
    const percentageOfTop = topAmount > 0 ? item.amount / topAmount : 0;
    const percentageOfTotal = totalAmount > 0 ? item.amount / totalAmount : 0;

    return {
      id: item.id,
      label: item.label,
      emoji: item.emoji,
      amount: item.amount,
      transactionCount: item.transactionCount,
      percentageOfTop,
      percentageOfTotal,
    };
  });
}

// ─── Phase 6C: Shared Budget Helpers & Budget vs Actual Pocket ─────────

export type PocketBudgetStatus =
  | 'aman'
  | 'waspada'
  | 'bahaya'
  | 'overbudget'
  | 'tanpa-alokasi';

export interface PocketBudgetActualItem {
  id: string;
  label: string;
  emoji?: string;

  isMetadataMissing: boolean;
  isCurrentlyActive: boolean;

  allocation: number;
  expense: number;

  transferIn: number;
  transferOut: number;
  netTransfer: number;

  currentBalance: number | null;

  remaining: number;
  usageRatio: number;
  usagePercent: number;
  status: PocketBudgetStatus;

  expenseTransactionCount: number;
  transferTransactionCount: number;
}

export function derivePocketBudgetStatus(
  expense: number,
  allocation: number
): PocketBudgetStatus {
  if (!Number.isFinite(allocation) || allocation <= 0) return 'tanpa-alokasi';
  const safeExpense = Number.isFinite(expense) && expense > 0 ? expense : 0;
  const ratio = safeExpense / allocation;
  if (ratio < STATUS_THRESHOLDS.aman) return 'aman';
  if (ratio < STATUS_THRESHOLDS.waspada) return 'waspada';
  if (ratio < STATUS_THRESHOLDS.bahaya) return 'bahaya';
  return 'overbudget';
}

export function formatUsagePercent(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0%';
  if (value < 1) return '<1%';
  return `${Math.round(value)}%`;
}

function sanitizeNumber(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Object.is(val, -0) ? 0 : val;
}

export function calculatePocketBudgetActuals(
  activePeriodTransactions: Transaction[],
  pockets: Pocket[],
  allTransactions: Transaction[],
  getPocketEffectiveBalanceFn: (pocket: Pocket, transactions: Transaction[]) => number
): PocketBudgetActualItem[] {
  const pocketMap = new Map<string, Pocket>();
  for (const p of pockets) {
    pocketMap.set(p.id, p);
  }

  const pocketIdSet = new Set<string>();

  for (const p of pockets) {
    if (p.isActive && !p.isArchived) {
      pocketIdSet.add(p.id);
    }
  }

  for (const t of activePeriodTransactions) {
    if (t.isArchived) continue;
    if (t.type === 'expense' && t.pocketId) {
      pocketIdSet.add(t.pocketId);
    }
    if (t.type === 'transfer') {
      if (t.fromPocketId) pocketIdSet.add(t.fromPocketId);
      if (t.toPocketId) pocketIdSet.add(t.toPocketId);
    }
  }

  const expenseMap = new Map<string, { amount: number; count: number }>();
  const transferInMap = new Map<string, number>();
  const transferOutMap = new Map<string, number>();
  const transferTxCountMap = new Map<string, Set<string>>();

  for (const t of activePeriodTransactions) {
    if (t.isArchived) continue;

    if (t.type === 'expense' && t.pocketId) {
      const cur = expenseMap.get(t.pocketId) || { amount: 0, count: 0 };
      expenseMap.set(t.pocketId, { amount: cur.amount + t.amount, count: cur.count + 1 });
    }

    if (t.type === 'transfer') {
      if (t.fromPocketId) {
        transferOutMap.set(t.fromPocketId, (transferOutMap.get(t.fromPocketId) || 0) + t.amount);
        const set = transferTxCountMap.get(t.fromPocketId) || new Set<string>();
        set.add(t.id);
        transferTxCountMap.set(t.fromPocketId, set);
      }
      if (t.toPocketId) {
        transferInMap.set(t.toPocketId, (transferInMap.get(t.toPocketId) || 0) + t.amount);
        const set = transferTxCountMap.get(t.toPocketId) || new Set<string>();
        set.add(t.id);
        transferTxCountMap.set(t.toPocketId, set);
      }
    }
  }

  const items: PocketBudgetActualItem[] = [];

  for (const pocketId of pocketIdSet) {
    const pocket = pocketMap.get(pocketId);
    const isMetadataMissing = !pocket;
    const isCurrentlyActive = pocket ? (pocket.isActive && !pocket.isArchived) : false;

    const label = pocket ? pocket.name : 'Pocket tidak tersedia';
    const emoji = pocket ? pocket.emoji : undefined;

    const rawAlloc = pocket?.monthlyAllocation ?? 0;
    const allocation = sanitizeNumber(Number.isFinite(rawAlloc) && rawAlloc >= 0 ? rawAlloc : 0);

    const expenseData = expenseMap.get(pocketId) || { amount: 0, count: 0 };
    const expense = sanitizeNumber(expenseData.amount);
    const expenseTransactionCount = expenseData.count;

    const transferIn = sanitizeNumber(transferInMap.get(pocketId) || 0);
    const transferOut = sanitizeNumber(transferOutMap.get(pocketId) || 0);
    const netTransfer = sanitizeNumber(transferIn - transferOut);

    const transferTransactionCount = transferTxCountMap.get(pocketId)?.size ?? 0;

    let currentBalance: number | null = null;
    if (pocket) {
      const rawBal = getPocketEffectiveBalanceFn(pocket, allTransactions);
      currentBalance = Number.isFinite(rawBal) ? sanitizeNumber(rawBal) : null;
    }

    const remaining = sanitizeNumber(allocation - expense);
    const usageRatio = allocation > 0 ? expense / allocation : 0;
    const usagePercent = usageRatio * 100;
    const status = derivePocketBudgetStatus(expense, allocation);

    items.push({
      id: pocketId,
      label,
      emoji,
      isMetadataMissing,
      isCurrentlyActive,
      allocation,
      expense,
      transferIn,
      transferOut,
      netTransfer,
      currentBalance,
      remaining,
      usageRatio,
      usagePercent,
      status,
      expenseTransactionCount,
      transferTransactionCount,
    });
  }

  items.sort((a, b) => {
    const aAllocated = a.allocation > 0 ? 1 : 0;
    const bAllocated = b.allocation > 0 ? 1 : 0;
    if (bAllocated !== aAllocated) return bAllocated - aAllocated;
    if (b.usageRatio !== a.usageRatio) return b.usageRatio - a.usageRatio;
    if (b.expense !== a.expense) return b.expense - a.expense;
    return a.label.localeCompare(b.label);
  });

  return items;
}

// ─── Phase 6C: Weekly Budget Usage ─────────────────────────────────────

export interface WeeklyBudgetUsageItem {
  weekNumber: number;
  label: string;

  startDate: string;
  endDate: string;
  dateLabel: string;

  expense: number;
  allowance: number;

  remaining: number;
  usageRatio: number;
  usagePercent: number;

  status:
    | 'aman'
    | 'waspada'
    | 'bahaya'
    | 'overbudget'
    | 'tanpa-alokasi';

  temporalState:
    | 'selesai'
    | 'berjalan'
    | 'akan-datang';
}

export function calculateWeeklyBudgetUsage(
  activePeriodTransactions: Transaction[],
  periodStartDate: string,
  periodEndDate: string,
  totalMonthlyAllocation: number
): WeeklyBudgetUsageItem[] {
  if (!isValidLocalDateString(periodStartDate) || !isValidLocalDateString(periodEndDate)) {
    return [];
  }

  if (periodStartDate > periodEndDate) {
    return [];
  }

  const parseLocalDate = (dateStr: string): Date => {
    const parts = (dateStr || '').split('-').map(Number);
    const y = parts[0] ?? 2026;
    const m = parts[1] ?? 1;
    const d = parts[2] ?? 1;
    return new Date(y, m - 1, d);
  };

  const toLocalDateStr = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const INDO_MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
  ];

  const formatDateLabel = (d: Date): string => {
    const day = d.getDate();
    const month = INDO_MONTHS[d.getMonth()] || '';
    return `${day} ${month}`;
  };

  const start = parseLocalDate(periodStartDate);
  const end = parseLocalDate(periodEndDate);

  const addDays = (d: Date, n: number): Date => {
    const result = new Date(d);
    result.setDate(result.getDate() + n);
    return result;
  };

  const weekBoundaries: { start: Date; end: Date }[] = [];
  for (let i = 0; i < 4; i++) {
    const weekStart = addDays(start, i * 7);
    const weekEnd = i < 3 ? addDays(start, (i + 1) * 7 - 1) : end;
    weekBoundaries.push({ start: weekStart, end: weekEnd });
  }

  const today = new Date();
  const todayStr = toLocalDateStr(today);

  const safeMonthlyAllocation = sanitizeNumber(
    Number.isFinite(totalMonthlyAllocation) && totalMonthlyAllocation > 0
      ? totalMonthlyAllocation
      : 0
  );

  const weeklyAllowance = safeMonthlyAllocation > 0
    ? safeMonthlyAllocation / 4
    : 0;

  const items: WeeklyBudgetUsageItem[] = weekBoundaries.map((wb, idx) => {
    const weekStartStr = toLocalDateStr(wb.start);
    const weekEndStr = toLocalDateStr(wb.end);

    let weekExpense = 0;
    for (const t of activePeriodTransactions) {
      if (t.isArchived) continue;
      if (t.type !== 'expense') continue;
      if (!isValidLocalDateString(t.date)) continue;
      if (t.date >= weekStartStr && t.date <= weekEndStr) {
        weekExpense += t.amount;
      }
    }

    weekExpense = sanitizeNumber(weekExpense);
    const remaining = sanitizeNumber(weeklyAllowance - weekExpense);
    const usageRatio = weeklyAllowance > 0 ? weekExpense / weeklyAllowance : 0;
    const usagePercent = usageRatio * 100;
    const status = derivePocketBudgetStatus(weekExpense, weeklyAllowance);

    let temporalState: 'selesai' | 'berjalan' | 'akan-datang';
    if (weekEndStr < todayStr) {
      temporalState = 'selesai';
    } else if (weekStartStr <= todayStr && todayStr <= weekEndStr) {
      temporalState = 'berjalan';
    } else {
      temporalState = 'akan-datang';
    }

    const dateLabel = `${formatDateLabel(wb.start)} – ${formatDateLabel(wb.end)}`;

    return {
      weekNumber: idx + 1,
      label: `Minggu ${idx + 1}`,
      startDate: weekStartStr,
      endDate: weekEndStr,
      dateLabel,
      expense: weekExpense,
      allowance: weeklyAllowance,
      remaining,
      usageRatio,
      usagePercent,
      status,
      temporalState,
    };
  });

  return items;
}
