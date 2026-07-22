import type { Pocket } from '@/types/pocket';
import type { Transaction } from '@/types/transaction';

/**
 * Calculates the total expense amount (used budget) attributed to a budget owner pocket.
 * Uses (t.budgetPocketId ?? t.pocketId) so expenses paid via Cash/NFC are attributed
 * to their respective budget owner pockets without double counting.
 * Optionally filtered by a date range (e.g. active budget period).
 */
export function getPocketUsedAmount(
  pocketId: string,
  transactions: Transaction[],
  startDate?: string,
  endDate?: string
): number {
  return transactions
    .filter((t) => {
      if (t.type !== 'expense' || t.isArchived) return false;
      const targetBudgetPocketId = t.budgetPocketId ?? t.pocketId;
      if (targetBudgetPocketId !== pocketId) return false;
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;
      return true;
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Resolves the default budget owner pocket ID for a given payment pocket.
 *
 * Rules:
 * - NFC Transportation Card -> Transportation pocket
 * - Cash -> Food & Groceries pocket
 * - Regular pockets -> payment pocket itself
 */
export function getDefaultBudgetPocketId(paymentPocketId: string, pockets: Pocket[]): string {
  const paymentPocket = pockets.find((p) => p.id === paymentPocketId);
  if (!paymentPocket) return paymentPocketId;

  // 1. If explicit budgetOwnerPocketId is configured on the payment pocket:
  if (paymentPocket.budgetOwnerPocketId) {
    const configuredTarget = pockets.find(
      (p) => p.id === paymentPocket.budgetOwnerPocketId && p.isActive && !p.isArchived
    );
    // If configured pocket is valid & active, return it.
    // If configured pocket is inactive or archived, fallback safely to payment pocket itself.
    return configuredTarget ? configuredTarget.id : paymentPocketId;
  }

  const idLower = paymentPocket.id.toLowerCase();
  const nameLower = paymentPocket.name.toLowerCase();

  // 2. Default seeding rule: NFC Transportation Card -> Transportation
  if (idLower === 'nfc-card' || nameLower.includes('nfc')) {
    const transportPocket = pockets.find(
      (p) => (p.id === 'transportation' || p.name.toLowerCase().includes('transportation')) && p.isActive && !p.isArchived
    );
    if (transportPocket) return transportPocket.id;
  }

  // 3. Default seeding rule: Cash -> Food & Groceries
  if (idLower === 'cash' || nameLower.includes('cash')) {
    const foodPocket = pockets.find(
      (p) => (p.id === 'food-groceries' || p.name.toLowerCase().includes('food')) && p.isActive && !p.isArchived
    );
    if (foodPocket) return foodPocket.id;
  }

  return paymentPocketId;
}

/**
 * Calculates budget reallocation in/out amounts for a pocket within an optional date range.
 */
export function getPocketReallocationsInPeriod(
  pocketId: string,
  transactions: Transaction[],
  startDate?: string,
  endDate?: string
): { reallocationIn: number; reallocationOut: number; netReallocation: number } {
  let reallocationIn = 0;
  let reallocationOut = 0;

  for (const t of transactions) {
    if (t.isArchived || t.type !== 'transfer' || t.transferType !== 'budget-reallocation') continue;
    if (startDate && t.date < startDate) continue;
    if (endDate && t.date > endDate) continue;

    if (t.toPocketId === pocketId) {
      reallocationIn += t.amount;
    }
    if (t.fromPocketId === pocketId) {
      reallocationOut += t.amount;
    }
  }

  return {
    reallocationIn,
    reallocationOut,
    netReallocation: reallocationIn - reallocationOut,
  };
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
