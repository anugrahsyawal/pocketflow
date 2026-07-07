import type { Pocket } from '@/types/pocket';
import { STATUS_THRESHOLDS } from '@/data/constants';

/**
 * Pocket status types matching the design system badge variants.
 */
export type PocketStatus = 'aman' | 'waspada' | 'bahaya' | 'overbudget';

/**
 * Get pocket status based on usage percentage.
 * Usage = (allocation - currentBalance) / allocation
 *
 * Thresholds (usage-based):
 * - Aman: used < 70%
 * - Waspada: used >= 70% and < 90%
 * - Bahaya: used >= 90% and < 100%
 * - Overbudget: used >= 100%
 *
 * Returns null for pockets without monthly allocation (Cash, NFC).
 */
export function getPocketStatus(
  currentBalance: number,
  allocation: number | null,
): PocketStatus | null {
  if (allocation === null || allocation === 0) return null;

  const used = (allocation - currentBalance) / allocation;

  if (used >= STATUS_THRESHOLDS.bahaya) return 'overbudget';
  if (used >= STATUS_THRESHOLDS.waspada) return 'bahaya';
  if (used >= STATUS_THRESHOLDS.aman) return 'waspada';
  return 'aman';
}

/**
 * Calculate usage ratio for a pocket.
 * Returns 0 for pockets without allocation.
 */
export function getPocketUsageRatio(
  currentBalance: number,
  allocation: number | null,
): number {
  if (allocation === null || allocation === 0) return 0;
  return Math.max(0, (allocation - currentBalance) / allocation);
}

/**
 * Calculate total spendable balance across all daily pockets.
 */
export function calculateSpendableBalance(pockets: Pocket[], balances: Record<string, number>): number {
  return pockets
    .filter((p) => p.isSpendable && !p.isArchived)
    .reduce((sum, p) => sum + (balances[p.id] ?? p.initialBalance), 0);
}

/**
 * Calculate total balance across all pockets.
 */
export function calculateTotalBalance(pockets: Pocket[], balances: Record<string, number>): number {
  return pockets
    .filter((p) => !p.isArchived)
    .reduce((sum, p) => sum + (balances[p.id] ?? p.initialBalance), 0);
}
