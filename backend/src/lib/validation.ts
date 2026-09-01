import { AppError } from './errors.js';

export const UUID_V4_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

export function isValidUuidV4(val: unknown): val is string {
  return typeof val === 'string' && UUID_V4_REGEX.test(val);
}

export function validateUuidV4(val: unknown, fieldName: string): string {
  if (!isValidUuidV4(val)) {
    throw new AppError(
      `${fieldName} must be a valid RFC 4122 v4 UUID string matching pattern ${UUID_V4_REGEX.source}`,
      400,
      'INVALID_INPUT'
    );
  }
  return val;
}

export function trimAndValidateString(val: unknown, fieldName: string, maxCodePoints: number): string {
  if (typeof val !== 'string') {
    throw new AppError(`${fieldName} must be a string`, 400, 'INVALID_INPUT');
  }
  const trimmed = val.trim();
  const codePoints = Array.from(trimmed).length;
  if (codePoints === 0) {
    throw new AppError(`${fieldName} cannot be blank or whitespace-only`, 400, 'INVALID_INPUT');
  }
  if (codePoints > maxCodePoints) {
    throw new AppError(
      `${fieldName} must not exceed ${maxCodePoints} Unicode code points`,
      400,
      'INVALID_INPUT'
    );
  }
  return trimmed;
}

export function getCurrentAsiaJakartaPeriodDates(now = new Date()): { startDate: string; endDate: string } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const parts = formatter.formatToParts(now);
  let year = 0;
  let month = 0;
  let day = 0;
  for (const part of parts) {
    if (part.type === 'year') year = parseInt(part.value, 10);
    if (part.type === 'month') month = parseInt(part.value, 10);
    if (part.type === 'day') day = parseInt(part.value, 10);
  }

  let startYear: number;
  let startMonth: number;
  let endYear: number;
  let endMonth: number;

  if (day >= 26) {
    startYear = year;
    startMonth = month;
    if (month === 12) {
      endYear = year + 1;
      endMonth = 1;
    } else {
      endYear = year;
      endMonth = month + 1;
    }
  } else {
    endYear = year;
    endMonth = month;
    if (month === 1) {
      startYear = year - 1;
      startMonth = 12;
    } else {
      startYear = year;
      startMonth = month - 1;
    }
  }

  const startDateStr = `${startYear}-${String(startMonth).padStart(2, '0')}-26`;
  const endDateStr = `${endYear}-${String(endMonth).padStart(2, '0')}-25`;

  return { startDate: startDateStr, endDate: endDateStr };
}

export const DATE_REGEX = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;

export function isValidDateString(val: unknown): val is string {
  if (typeof val !== 'string' || !DATE_REGEX.test(val)) return false;
  const [yearStr, monthStr, dayStr] = val.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function validateDateString(val: unknown, fieldName: string): string {
  if (!isValidDateString(val)) {
    throw new AppError(`${fieldName} must be a valid date in YYYY-MM-DD format`, 400, 'INVALID_INPUT');
  }
  return val;
}

export const TIME_REGEX = /^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;

export function isValidTimeString(val: unknown): val is string {
  return typeof val === 'string' && TIME_REGEX.test(val);
}

export function validateTimeString(val: unknown, fieldName: string): string {
  if (!isValidTimeString(val)) {
    throw new AppError(
      `${fieldName} must be a valid time in HH:mm or HH:mm:ss format`,
      400,
      'INVALID_INPUT'
    );
  }
  return val;
}

export function getBudgetPeriodForDate(dateStr: string): { startDate: string; endDate: string } {
  validateDateString(dateStr, 'occurredOn');
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  let startYear: number;
  let startMonth: number;
  let endYear: number;
  let endMonth: number;

  if (day >= 26) {
    startYear = year;
    startMonth = month;
    if (month === 12) {
      endYear = year + 1;
      endMonth = 1;
    } else {
      endYear = year;
      endMonth = month + 1;
    }
  } else {
    endYear = year;
    endMonth = month;
    if (month === 1) {
      startYear = year - 1;
      startMonth = 12;
    } else {
      startYear = year;
      startMonth = month - 1;
    }
  }

  const startDateStr = `${startYear}-${String(startMonth).padStart(2, '0')}-26`;
  const endDateStr = `${endYear}-${String(endMonth).padStart(2, '0')}-25`;

  return { startDate: startDateStr, endDate: endDateStr };
}
