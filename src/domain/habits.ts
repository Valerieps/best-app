import { toDayKey, type DayKey } from './day';
import type { Habit, HabitLog } from './entities';
import { daysBetween, weekdayOf } from './month';

/** Section 6: habit statistics, from the yes/no logs. */

export function habitLogId(habitId: string, day: DayKey): string {
  return `${habitId}:${day}`;
}

export function isExpectedOn(habit: Habit, day: DayKey): boolean {
  return habit.weekdays.includes(weekdayOf(day));
}

export interface HabitStats {
  /** Expected days in the range, up to today. */
  expected: number;
  done: number;
  /** done / expected, or null when no day was expected. */
  completion: number | null;
  /** Longest run of expected days done in a row; days the habit is not expected do not break it. */
  longestStreak: number;
}

/** Days before the habit existed are not expected. */
function firstDay(habit: Habit): DayKey | null {
  return habit.createdAt ? toDayKey(new Date(habit.createdAt)) : null;
}

export function habitStats(habit: Habit, logs: readonly HabitLog[], start: DayKey, end: DayKey): HabitStats {
  const doneDays = new Set(logs.filter((log) => log.habitId === habit.id && log.done).map((log) => log.day));
  const createdOn = firstDay(habit);
  let expected = 0;
  let done = 0;
  let streak = 0;
  let longestStreak = 0;
  for (const day of daysBetween(start, end)) {
    if (!isExpectedOn(habit, day) || (createdOn !== null && day < createdOn && !doneDays.has(day))) continue;
    expected++;
    if (doneDays.has(day)) {
      done++;
      streak++;
      longestStreak = Math.max(longestStreak, streak);
    } else {
      streak = 0;
    }
  }
  return { expected, done, completion: expected === 0 ? null : done / expected, longestStreak };
}
