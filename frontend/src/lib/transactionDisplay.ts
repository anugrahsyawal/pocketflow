import type { Transaction } from '@/types/transaction';

/**
 * Formats a transaction date string (YYYY-MM-DD) into a localized Indonesian label:
 * - Today's date -> "Hari ini"
 * - Yesterday's date -> "Kemarin"
 * - Other dates -> "Senin, 13 Juli 2026"
 */
export function formatDateGroup(dateStr: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const yy = yesterday.getFullYear();
  const ym = String(yesterday.getMonth() + 1).padStart(2, '0');
  const yd = String(yesterday.getDate()).padStart(2, '0');
  const yesterdayStr = `${yy}-${ym}-${yd}`;

  if (dateStr === todayStr) {
    return 'Hari ini';
  }
  if (dateStr === yesterdayStr) {
    return 'Kemarin';
  }

  try {
    // Append T00:00:00 to parse correctly in local time
    const dateObj = new Date(`${dateStr}T00:00:00`);
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(dateObj);
  } catch (e) {
    return dateStr;
  }
}

/**
 * Sorts transactions by date desc, time desc, and createdAt desc.
 */
export function sortTransactions(txns: Transaction[]): Transaction[] {
  return [...txns].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    const timeCompare = b.time.localeCompare(a.time);
    if (timeCompare !== 0) return timeCompare;
    return b.createdAt.localeCompare(a.createdAt);
  });
}
