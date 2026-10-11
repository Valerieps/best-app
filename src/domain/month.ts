import { addDays, fromDayKey, toDayKey, type DayKey } from './day';

/** A calendar month, e.g. "2026-10". */
export type MonthKey = string;

export interface MonthRange {
  key: MonthKey;
  start: DayKey;
  end: DayKey;
}

export function monthKey(day: DayKey): MonthKey {
  return day.slice(0, 7);
}

export function monthRange(key: MonthKey): MonthRange {
  const [year, month] = key.split('-').map(Number);
  const start = toDayKey(new Date(year, month - 1, 1, 12));
  const end = addDays(toDayKey(new Date(year, month, 1, 12)), -1);
  return { key, start, end };
}

export function shiftMonth(key: MonthKey, amount: number): MonthKey {
  const [year, month] = key.split('-').map(Number);
  return toDayKey(new Date(year, month - 1 + amount, 1, 12)).slice(0, 7);
}

/** Every day of a range, inclusive. */
export function daysBetween(start: DayKey, end: DayKey): DayKey[] {
  const days: DayKey[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day);
  return days;
}

export function weekdayOf(day: DayKey): number {
  return fromDayKey(day).getDay();
}
