import { toDayKey } from './day';
import type { Settings } from './entities';
import { defaultReflectionWeek, type WeekRange } from './week';

export type ReflectionSchedule = NonNullable<Settings['weeklyReflection']>;

/** The latest moment, up to `now`, when the weekly reflection was scheduled. */
export function lastScheduledMoment(now: Date, schedule: ReflectionSchedule): Date {
  const moment = new Date(now.getFullYear(), now.getMonth(), now.getDate(), schedule.hour, 0, 0);
  const daysBack = (now.getDay() - schedule.weekday + 7) % 7;
  moment.setDate(moment.getDate() - daysBack);
  if (moment > now) moment.setDate(moment.getDate() - 7);
  return moment;
}

/**
 * The week whose reflection is due: the scheduled moment has passed and that week was not
 * closed yet. The app never sends notifications; this only drives a banner inside the app.
 */
export function dueReflectionWeek(
  now: Date,
  schedule: ReflectionSchedule | null,
  isClosed: (week: WeekRange) => boolean,
): WeekRange | null {
  if (!schedule) return null;
  const week = defaultReflectionWeek(toDayKey(lastScheduledMoment(now, schedule)));
  return isClosed(week) ? null : week;
}
