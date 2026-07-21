import type { Transaction } from '@/types/transaction';
import type { Category } from '@/types/category';
import type { Pocket } from '@/types/pocket';
import { STATUS_THRESHOLDS } from '@/data/constants';
import { isValidLocalDateString } from '@/lib/budgetPeriod';
import { formatRupiah } from '@/lib/currency';

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

// ─── Phase 6D: Rule-Based Insights ─────────────────────────────────────

export type ReportInsightSeverity = 'positive' | 'info' | 'warning' | 'critical';

export interface ReportInsight {
  id: string;
  severity: ReportInsightSeverity;
  title: string;
  message: string;

  driverPocketId?: string;
  driverPocketLabel?: string;

  driverCategoryId?: string;
  driverCategoryLabel?: string;

  amount?: number;
  percentage?: number;
}

export function calculateRuleBasedInsights(params: {
  transactions: Transaction[];
  totals: ReportTotals;
  budgetActualItems: PocketBudgetActualItem[];
  weeklyUsageItems: WeeklyBudgetUsageItem[];
  categoryBreakdown: ReportBreakdownItem[];
  pocketBreakdown: ReportBreakdownItem[];
  pockets: Pocket[];
  categories: Category[];
  isCurrentPeriod: boolean;
}): ReportInsight[] {
  const {
    transactions,
    totals,
    budgetActualItems,
    weeklyUsageItems,
    categoryBreakdown,
    pockets,
    categories,
    isCurrentPeriod,
  } = params;

  const categoryMap = new Map<string, Category>();
  for (const c of categories) {
    categoryMap.set(c.id, c);
  }

  const pocketMap = new Map<string, Pocket>();
  for (const p of pockets) {
    pocketMap.set(p.id, p);
  }

  const insights: ReportInsight[] = [];
  const periodLabel = isCurrentPeriod ? 'periode ini' : 'periode terpilih';

  // Rule 1: Critical Overbudget Pocket (Current Period Only)
  if (isCurrentPeriod) {
    const overbudgetItems = budgetActualItems.filter(
      (item) => item.status === 'overbudget' && item.allocation > 0
    );

    if (overbudgetItems.length > 0) {
      // Pick highest usageRatio
      const topOverbudget = [...overbudgetItems].sort(
        (a, b) => b.usageRatio - a.usageRatio || b.expense - a.expense
      )[0];

      if (topOverbudget) {
        // Find top expense category for this pocket
        const pocketExpenses = transactions.filter(
          (t) => !t.isArchived && t.type === 'expense' && t.pocketId === topOverbudget.id
        );

        const catTotals = new Map<string, number>();
        for (const t of pocketExpenses) {
          const catId = t.categoryId || 'none';
          catTotals.set(catId, (catTotals.get(catId) || 0) + t.amount);
        }

        let topCatId = 'none';
        let topCatAmount = 0;
        catTotals.forEach((amt, catId) => {
          if (amt > topCatAmount) {
            topCatAmount = amt;
            topCatId = catId;
          }
        });

        const topCat = topCatId !== 'none' ? categoryMap.get(topCatId) : undefined;
        const driverCategoryLabel = topCat ? topCat.name : 'Tanpa kategori';

        const usagePctStr = formatUsagePercent(topOverbudget.usagePercent);
        const catDetailStr =
          topCatAmount > 0
            ? `. Pengeluaran terbesar berasal dari kategori ${driverCategoryLabel} sebesar ${formatRupiah(topCatAmount)}.`
            : '.';

        insights.push({
          id: `overbudget-pocket-${topOverbudget.id}`,
          severity: 'critical',
          title: `${topOverbudget.label} melewati anggaran`,
          message: `Pocket ${topOverbudget.label} telah memakai ${usagePctStr} alokasi${catDetailStr}`,
          driverPocketId: topOverbudget.id,
          driverPocketLabel: topOverbudget.label,
          driverCategoryId: topCatId !== 'none' ? topCatId : undefined,
          driverCategoryLabel: topCatAmount > 0 ? driverCategoryLabel : undefined,
          amount: topOverbudget.expense,
          percentage: topOverbudget.usagePercent,
        });
      }
    }
  }

  // Rule 2: Current-Week Warning Insight (Current Period Only)
  if (isCurrentPeriod) {
    const runningWeek = weeklyUsageItems.find(
      (w) => w.temporalState === 'berjalan'
    );

    if (
      runningWeek &&
      (runningWeek.status === 'waspada' ||
        runningWeek.status === 'bahaya' ||
        runningWeek.status === 'overbudget')
    ) {
      // Find top expense pocket/category in this week's date range
      const weekExpenses = transactions.filter(
        (t) =>
          !t.isArchived &&
          t.type === 'expense' &&
          isValidLocalDateString(t.date) &&
          t.date >= runningWeek.startDate &&
          t.date <= runningWeek.endDate
      );

      const pTotals = new Map<string, number>();
      const cTotals = new Map<string, number>();
      for (const t of weekExpenses) {
        if (t.pocketId) {
          pTotals.set(t.pocketId, (pTotals.get(t.pocketId) || 0) + t.amount);
        }
        const catId = t.categoryId || 'none';
        cTotals.set(catId, (cTotals.get(catId) || 0) + t.amount);
      }

      let topPId = '';
      let topPAmt = 0;
      pTotals.forEach((amt, pId) => {
        if (amt > topPAmt) {
          topPAmt = amt;
          topPId = pId;
        }
      });

      let topCId = 'none';
      let topCAmt = 0;
      cTotals.forEach((amt, cId) => {
        if (amt > topCAmt) {
          topCAmt = amt;
          topCId = cId;
        }
      });

      const driverPocket = topPId ? pocketMap.get(topPId) : undefined;
      const driverPocketLabel = driverPocket ? driverPocket.name : 'Pocket harian';

      const driverCat = topCId !== 'none' ? categoryMap.get(topCId) : undefined;
      const driverCatLabel = driverCat ? driverCat.name : 'Tanpa kategori';

      const weekPctStr = formatUsagePercent(runningWeek.usagePercent);
      const driverDetailStr =
        topCAmt > 0
          ? ` ${driverPocketLabel} menjadi pocket pengeluaran terbesar, terutama kategori ${driverCatLabel} sebesar ${formatRupiah(topCAmt)}.`
          : '';

      insights.push({
        id: `running-week-warning-${runningWeek.weekNumber}`,
        severity: runningWeek.status === 'overbudget' ? 'critical' : 'warning',
        title: `Pemakaian ${runningWeek.label} perlu diperhatikan`,
        message: `Pemakaian minggu ini mencapai ${weekPctStr}.${driverDetailStr}`,
        driverPocketId: topPId || undefined,
        driverPocketLabel,
        driverCategoryId: topCId !== 'none' ? topCId : undefined,
        driverCategoryLabel: topCAmt > 0 ? driverCatLabel : undefined,
        amount: runningWeek.expense,
        percentage: runningWeek.usagePercent,
      });
    }
  }

  // Rule 3: Category Concentration (Current & Historical)
  if (totals.totalExpense > 0 && categoryBreakdown.length > 0) {
    const topCatItem = categoryBreakdown[0];
    if (topCatItem && topCatItem.percentage >= 40) {
      const pctRounded = Math.round(topCatItem.percentage);
      insights.push({
        id: `category-concentration-${topCatItem.id}`,
        severity: 'info',
        title: `Pengeluaran terkonsentrasi di ${topCatItem.label}`,
        message: `Kategori ${topCatItem.label} menyumbang ${pctRounded}% dari pengeluaran ${periodLabel}, sebesar ${formatRupiah(topCatItem.amount)}.`,
        driverCategoryId: topCatItem.id !== 'none' ? topCatItem.id : undefined,
        driverCategoryLabel: topCatItem.label,
        amount: topCatItem.amount,
        percentage: topCatItem.percentage,
      });
    }
  }

  // Rule 4: Net Cash Flow Surplus / Deficit (Current & Historical)
  if (insights.length < 3) {
    if (totals.netCashFlow < 0) {
      const absNet = Math.abs(totals.netCashFlow);
      insights.push({
        id: 'net-cash-flow-deficit',
        severity: 'warning',
        title: 'Pengeluaran lebih besar dari pemasukan',
        message: `Defisit ${periodLabel} sebesar ${formatRupiah(absNet)}.`,
        amount: absNet,
      });
    } else if (totals.netCashFlow > 0) {
      insights.push({
        id: 'net-cash-flow-surplus',
        severity: 'positive',
        title: `Arus kas ${periodLabel} positif`,
        message: `Pemasukan lebih besar dari pengeluaran sebesar ${formatRupiah(totals.netCashFlow)}.`,
        amount: totals.netCashFlow,
      });
    }
  }

  // Deterministic sorting & limiting to max 3 items
  const severityWeight: Record<ReportInsightSeverity, number> = {
    critical: 4,
    warning: 3,
    info: 2,
    positive: 1,
  };

  insights.sort((a, b) => {
    const weightDiff = severityWeight[b.severity] - severityWeight[a.severity];
    if (weightDiff !== 0) return weightDiff;
    const pctDiff = (b.percentage ?? 0) - (a.percentage ?? 0);
    if (pctDiff !== 0) return pctDiff;
    const amtDiff = (b.amount ?? 0) - (a.amount ?? 0);
    if (amtDiff !== 0) return amtDiff;
    return a.title.localeCompare(b.title);
  });

  return insights.slice(0, 3);
}

// ─── Phase 6D: Sinking Fund Recommendation ─────────────────────────────

export const SINKING_FUND_RECOMMENDATION_WINDOW_DAYS = 5;

export interface SinkingFundPocketCandidate {
  pocketId: string;
  label: string;
  emoji?: string;
  currentBalance: number;
  eligibleAmount: number;
  isExcluded: boolean;
}

export type SinkingFundStatus =
  | 'not-near-period-end'
  | 'available'
  | 'no-eligible-pockets'
  | 'no-positive-balance'
  | 'historical-unavailable';

export interface SinkingFundRecommendation {
  status: SinkingFundStatus;
  daysRemaining: number | null;
  suggestedAmount: number;
  candidates: SinkingFundPocketCandidate[];
}

export function calculateSinkingFundRecommendation(params: {
  pockets: Pocket[];
  allActiveTransactions: Transaction[];
  excludedPocketIds: string[];
  periodEndDate: string;
  today?: Date;
  isCurrentPeriod: boolean;
  getPocketEffectiveBalanceFn: (pocket: Pocket, transactions: Transaction[]) => number;
}): SinkingFundRecommendation {
  const {
    pockets,
    allActiveTransactions,
    excludedPocketIds,
    periodEndDate,
    today = new Date(),
    isCurrentPeriod,
    getPocketEffectiveBalanceFn,
  } = params;

  if (!isCurrentPeriod) {
    return {
      status: 'historical-unavailable',
      daysRemaining: null,
      suggestedAmount: 0,
      candidates: [],
    };
  }

  if (!isValidLocalDateString(periodEndDate)) {
    return {
      status: 'historical-unavailable',
      daysRemaining: null,
      suggestedAmount: 0,
      candidates: [],
    };
  }

  // Calculate local days remaining until periodEndDate
  const parseLocalDate = (dateStr: string): Date => {
    const parts = dateStr.split('-').map(Number);
    return new Date(parts[0] ?? 2026, (parts[1] ?? 1) - 1, parts[2] ?? 1);
  };

  const endDate = parseLocalDate(periodEndDate);
  const todayReset = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffTime = endDate.getTime() - todayReset.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Find candidate spendable pockets
  const spendablePockets = pockets.filter(
    (p) => p.isSpendable && p.isActive && !p.isArchived
  );

  const candidates: SinkingFundPocketCandidate[] = spendablePockets.map((p) => {
    const bal = getPocketEffectiveBalanceFn(p, allActiveTransactions);
    const safeBal = Number.isFinite(bal) ? (Object.is(bal, -0) ? 0 : bal) : 0;
    const isExcluded = excludedPocketIds.includes(p.id);
    const eligibleAmount = safeBal > 0 ? safeBal : 0;

    return {
      pocketId: p.id,
      label: p.name,
      emoji: p.emoji,
      currentBalance: safeBal,
      eligibleAmount,
      isExcluded,
    };
  });

  candidates.sort((a, b) => b.eligibleAmount - a.eligibleAmount || a.label.localeCompare(b.label));

  if (daysRemaining > SINKING_FUND_RECOMMENDATION_WINDOW_DAYS) {
    return {
      status: 'not-near-period-end',
      daysRemaining,
      suggestedAmount: 0,
      candidates,
    };
  }

  if (spendablePockets.length === 0) {
    return {
      status: 'no-eligible-pockets',
      daysRemaining,
      suggestedAmount: 0,
      candidates: [],
    };
  }

  const includedPositiveCandidates = candidates.filter(
    (c) => !c.isExcluded && c.eligibleAmount > 0
  );

  const suggestedAmount = includedPositiveCandidates.reduce(
    (sum, c) => sum + c.eligibleAmount,
    0
  );

  if (candidates.length === 0) {
    return {
      status: 'no-eligible-pockets',
      daysRemaining,
      suggestedAmount: 0,
      candidates,
    };
  }

  if (suggestedAmount === 0 && candidates.every((c) => c.eligibleAmount === 0)) {
    return {
      status: 'no-positive-balance',
      daysRemaining,
      suggestedAmount: 0,
      candidates,
    };
  }

  return {
    status: 'available',
    daysRemaining,
    suggestedAmount,
    candidates,
  };
}

