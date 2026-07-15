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

const MONTH_SHORT_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

/**
 * Formats a transaction date and time into a compact, localized Indonesian string.
 */
export function formatCompactTransactionDateTime(
  dateStr: string,
  timeStr: string,
  today: Date = new Date()
): string {
  const timeSuffix = timeStr ? ` • ${timeStr}` : '';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return `${dateStr}${timeSuffix}`;
  }

  try {
    const parts = dateStr.split('-').map(Number);
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];

    if (
      year === undefined ||
      month === undefined ||
      day === undefined ||
      isNaN(year) ||
      isNaN(month) ||
      isNaN(day)
    ) {
      return `${dateStr}${timeSuffix}`;
    }

    const dateObj = new Date(year, month - 1, day);
    if (
      dateObj.getFullYear() !== year ||
      dateObj.getMonth() !== month - 1 ||
      dateObj.getDate() !== day
    ) {
      return `${dateStr}${timeSuffix}`;
    }

    // Determine today and yesterday strings in YYYY-MM-DD
    const todayY = today.getFullYear();
    const todayM = String(today.getMonth() + 1).padStart(2, '0');
    const todayD = String(today.getDate()).padStart(2, '0');
    const todayStr = `${todayY}-${todayM}-${todayD}`;

    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    const yesterdayY = yesterday.getFullYear();
    const yesterdayM = String(yesterday.getMonth() + 1).padStart(2, '0');
    const yesterdayD = String(yesterday.getDate()).padStart(2, '0');
    const yesterdayStr = `${yesterdayY}-${yesterdayM}-${yesterdayD}`;

    if (dateStr === todayStr) {
      return `Hari ini${timeSuffix}`;
    }
    if (dateStr === yesterdayStr) {
      return `Kemarin${timeSuffix}`;
    }

    const monthLabel = MONTH_SHORT_ID[dateObj.getMonth()];
    if (year === todayY) {
      return `${day} ${monthLabel}${timeSuffix}`;
    }
    return `${day} ${monthLabel} ${year}${timeSuffix}`;
  } catch {
    return `${dateStr}${timeSuffix}`;
  }
}
