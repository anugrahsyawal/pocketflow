/**
 * Budget period helper.
 *
 * Budget cycles run from the 26th of one month through the 25th of the next.
 *
 * Examples:
 *   2026-07-14 → startDate: 2026-06-26, endDate: 2026-07-25
 *   2026-07-26 → startDate: 2026-07-26, endDate: 2026-08-25
 *   2026-01-05 → startDate: 2025-12-26, endDate: 2026-01-25
 *
 * Uses local Date components only. Never derives date from UTC ISO strings
 * to avoid UTC-offset day shifts.
 */

export interface BudgetPeriod {
  /** YYYY-MM-DD string (local date) */
  startDate: string;
  /** YYYY-MM-DD string (local date) */
  endDate: string;
  /** Human-readable Indonesian label, e.g. "26 Jun – 25 Jul 2026" */
  label: string;
}

const MONTH_SHORT_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

/** Zero-pads a number to at least 2 digits. */
function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Formats a local Date as a YYYY-MM-DD string (no UTC conversion). */
function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Formats a budget period label in Indonesian.
 *
 * Same-year example:  "26 Jun – 25 Jul 2026"
 * Cross-year example: "26 Des 2025 – 25 Jan 2026"
 */
function formatBudgetPeriodLabel(start: Date, end: Date): string {
  const startDay = start.getDate();
  const startMonth = MONTH_SHORT_ID[start.getMonth()];
  const startYear = start.getFullYear();

  const endDay = end.getDate();
  const endMonth = MONTH_SHORT_ID[end.getMonth()];
  const endYear = end.getFullYear();

  if (startYear === endYear) {
    return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${endYear}`;
  }
  return `${startDay} ${startMonth} ${startYear} – ${endDay} ${endMonth} ${endYear}`;
}

/**
 * Returns the current budget period for a given date.
 *
 * Budget period starts on the 26th and ends on the 25th of the following month.
 *
 * @param today - The reference date. Defaults to `new Date()`. Use local Date
 *                constructors (`new Date(year, monthIndex, day)`) for testing.
 */
export function getBudgetPeriod(today: Date = new Date()): BudgetPeriod {
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed
  const day = today.getDate();

  let startDate: Date;
  let endDate: Date;

  if (day >= 26) {
    // Period started this month on the 26th, ends next month on the 25th
    startDate = new Date(year, month, 26);
    endDate = new Date(year, month + 1, 25);
  } else {
    // Period started last month on the 26th, ends this month on the 25th
    startDate = new Date(year, month - 1, 26);
    endDate = new Date(year, month, 25);
  }

  return {
    startDate: toLocalDateStr(startDate),
    endDate: toLocalDateStr(endDate),
    label: formatBudgetPeriodLabel(startDate, endDate),
  };
}

/**
 * Returns the budget period corresponding to a numeric offset from the current period.
 *
 * @param offset - Numeric offset (0: current period, -1: previous period, etc.). Clamped to <= 0.
 * @param today - The reference date. Defaults to `new Date()`.
 */
export function getBudgetPeriodByOffset(
  offset: number,
  today: Date = new Date()
): BudgetPeriod {
  const safeOffset = offset > 0 ? 0 : offset;
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed
  const day = today.getDate();

  let baseStartMonth: number;
  if (day >= 26) {
    baseStartMonth = month;
  } else {
    baseStartMonth = month - 1;
  }

  const targetStartMonth = baseStartMonth + safeOffset;
  const targetEndMonth = targetStartMonth + 1;

  const startDate = new Date(year, targetStartMonth, 26);
  const endDate = new Date(year, targetEndMonth, 25);

  return {
    startDate: toLocalDateStr(startDate),
    endDate: toLocalDateStr(endDate),
    label: formatBudgetPeriodLabel(startDate, endDate),
  };
}

/**
 * Validates if a string is a valid local date in YYYY-MM-DD format.
 */
export function isValidLocalDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parts = value.split('-').map(Number);
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
    return false;
  }

  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

