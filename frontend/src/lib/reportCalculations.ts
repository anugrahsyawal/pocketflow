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
