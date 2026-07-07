import { DEFAULT_BUDGET_START_DAY } from '@/data/constants';

export interface BudgetPeriod {
  startDate: Date;
  endDate: Date;
  label: string;
  totalDays: number;
  remainingDays: number;
  elapsedDays: number;
}

const MONTH_NAMES_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

export function getCurrentPeriod(
  today: Date = new Date(),
  startDay: number = DEFAULT_BUDGET_START_DAY
): BudgetPeriod {
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();

  let startDate: Date;
  let endDate: Date;

  if (day >= startDay) {
    startDate = new Date(year, month, startDay);
    endDate = new Date(year, month + 1, startDay - 1);
  } else {
    startDate = new Date(year, month - 1, startDay);
    endDate = new Date(year, month, startDay - 1);
  }

  const totalDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  const elapsedDays = Math.ceil(
    (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  const remainingDays = Math.max(0, totalDays - elapsedDays);

  const label = formatPeriodLabel(startDate, endDate);

  return { startDate, endDate, label, totalDays, remainingDays, elapsedDays };
}

export function formatPeriodLabel(start: Date, end: Date): string {
  const startMonth = MONTH_NAMES_ID[start.getMonth()];
  const endMonth = MONTH_NAMES_ID[end.getMonth()];
  return `${start.getDate()} ${startMonth} \u2013 ${end.getDate()} ${endMonth}`;
}

export function formatDateId(date: Date): string {
  const monthName = MONTH_NAMES_ID[date.getMonth()];
  return `${date.getDate()} ${monthName} ${date.getFullYear()}`;
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(date, today)) return 'Hari ini';
  if (isSameDay(date, yesterday)) return 'Kemarin';
  return formatDateId(date);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}
