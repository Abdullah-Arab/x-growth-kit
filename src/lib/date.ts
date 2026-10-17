import type { DateKey } from './types';

/** Local-time calendar key, e.g. '2026-10-17'. */
export function toDateKey(date: Date = new Date()): DateKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

/** Calendar arithmetic in local time (DST-safe). */
export function addDays(key: DateKey, days: number): DateKey {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(key: DateKey): number {
  return parseDateKey(key).getDay();
}

/** Monday of the week containing `key`. */
export function startOfWeek(key: DateKey): DateKey {
  return addDays(key, -((weekday(key) + 6) % 7));
}
