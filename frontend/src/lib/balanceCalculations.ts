import type { Pocket } from '@/types/pocket';
import type { Transaction } from '@/types/transaction';

/**
 * Calculates the total expense amount (used budget) for a pocket.
 */
export function getPocketUsedAmount(pocketId: string, transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === 'expense' && t.pocketId === pocketId && !t.isArchived)
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Calculates the transaction-aware effective balance of a pocket.
 */
export function getPocketEffectiveBalance(pocket: Pocket, transactions: Transaction[]): number {
  const activeTxns = transactions.filter((t) => !t.isArchived);
  let balance = pocket.initialBalance;

  for (const t of activeTxns) {
    if (t.type === 'income' && t.pocketId === pocket.id) {
      balance += t.amount;
    } else if (t.type === 'expense' && t.pocketId === pocket.id) {
      balance -= t.amount;
    } else if (t.type === 'transfer') {
      if (t.fromPocketId === pocket.id) {
        balance -= t.amount;
      }
      if (t.toPocketId === pocket.id) {
        balance += t.amount;
      }
    }
  }

  return balance;
}

/**
 * Calculates total effective balance across all active, non-archived pockets.
 */
export function getTotalEffectiveBalance(pockets: Pocket[], transactions: Transaction[]): number {
  return pockets
    .filter((p) => p.isActive && !p.isArchived)
    .reduce((sum, p) => sum + getPocketEffectiveBalance(p, transactions), 0);
}

/**
 * Calculates total spendable balance (active, non-archived daily spendable pockets only).
 */
export function getSpendableEffectiveBalance(pockets: Pocket[], transactions: Transaction[]): number {
  return pockets
    .filter((p) => p.isActive && !p.isArchived && p.groupId === 'daily' && p.isSpendable)
    .reduce((sum, p) => sum + getPocketEffectiveBalance(p, transactions), 0);
}

export type BudgetStatusType = 'aman' | 'waspada' | 'bahaya' | 'overbudget';

interface BudgetStatusResult {
  progress: number;
  status: BudgetStatusType;
  label: string;
}

/**
 * Calculates budget progress and warning status for monthly allocation pockets.
 */
export function getPocketBudgetStatus(usedAmount: number, monthlyAllocation: number | null): BudgetStatusResult {
  if (monthlyAllocation === null || monthlyAllocation <= 0) {
    return { progress: 0, status: 'aman', label: 'Aman' };
  }

  const progress = (usedAmount / monthlyAllocation) * 100;

  if (usedAmount < monthlyAllocation * 0.7) {
    return { progress, status: 'aman', label: 'Aman' };
  }
  if (usedAmount < monthlyAllocation * 0.9) {
    return { progress, status: 'waspada', label: 'Waspada' };
  }
  if (usedAmount < monthlyAllocation) {
    return { progress, status: 'bahaya', label: 'Bahaya' };
  }
  return { progress, status: 'overbudget', label: 'Overbudget' };
}
