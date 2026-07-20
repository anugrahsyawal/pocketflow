import { Transaction } from '@/types/transaction';
import { Category } from '@/types/category';
import { Pocket } from '@/types/pocket';

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

  // Sort: 1. amount descending, 2. category name ascending
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

  // Sort: 1. amount descending, 2. pocket name ascending
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

  // Wait, Indonesian MONTH_SHORT_ID:
  // Jan, Feb, Mar, Apr, Mei, Jun, Jul, Agu, Sep, Okt, Nov, Des.
  const INDO_MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
  ];

  const start = parseLocalDate(startDateStr);
  const end = parseLocalDate(endDateStr);

  const points: DailyCashFlowPoint[] = [];
  const current = new Date(start);

  // Safeguard loop boundary to avoid infinite loop on malformed dates
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
