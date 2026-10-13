import { addDays, fromDayKey, toDayKey, type DayKey } from './day';

/** ISO week key, e.g. "2026-W41". Weeks start on Monday. */
export type WeekKey = string;

export function weekStart(day: DayKey): DayKey {
  const weekday = (fromDayKey(day).getDay() + 6) % 7; // Monday = 0
  return addDays(day, -weekday);
}

export function weekKey(day: DayKey): WeekKey {
  // The ISO week belongs to the year of its Thursday.
  const thursday = fromDayKey(addDays(weekStart(day), 3));
  const yearStart = new Date(thursday.getFullYear(), 0, 1, 12);
  const week = Math.floor((thursday.getTime() - yearStart.getTime()) / 86_400_000 / 7) + 1;
  return `${thursday.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export interface WeekRange {
  key: WeekKey;
  start: DayKey;
  end: DayKey;
}

export function weekOf(day: DayKey): WeekRange {
  const start = weekStart(day);
  return { key: weekKey(day), start, end: addDays(start, 6) };
}

export function isInWeek(day: DayKey, week: WeekRange): boolean {
  return day >= week.start && day <= week.end;
}

export function dayOfTimestamp(iso: string): DayKey {
  return toDayKey(new Date(iso));
}
