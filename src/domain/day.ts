/** A calendar day in the user's local time zone, formatted as YYYY-MM-DD. */
export type DayKey = string;

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDayKey(value: unknown): value is DayKey {
  return typeof value === 'string' && DAY_KEY_PATTERN.test(value);
}

/** The day a moment belongs to. Days turn over at local midnight. */
export function toDayKey(moment: Date): DayKey {
  const year = moment.getFullYear();
  const month = String(moment.getMonth() + 1).padStart(2, '0');
  const day = String(moment.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Local noon of the day, which is safe from daylight saving shifts when adding days. */
export function fromDayKey(day: DayKey): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date, 12);
}

export function addDays(day: DayKey, amount: number): DayKey {
  const moment = fromDayKey(day);
  moment.setDate(moment.getDate() + amount);
  return toDayKey(moment);
}

/** Whole days from `from` to `to`; negative when `to` comes first. Safe across daylight saving. */
export function daysBetween(from: DayKey, to: DayKey): number {
  return Math.round((fromDayKey(to).getTime() - fromDayKey(from).getTime()) / 86_400_000);
}

/** Negative if `a` comes before `b`, zero if equal. DayKeys sort as plain strings. */
export function compareDays(a: DayKey, b: DayKey): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function laterDay(a: DayKey, b: DayKey): DayKey {
  return compareDays(a, b) >= 0 ? a : b;
}
