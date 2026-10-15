import type { DayKey } from './day';
import { daysBetween, monthRange, weekdayOf, type MonthKey } from './month';

/**
 * The month calendar of the "Rituais" screen (spec/assistentes.md, "A tela Rituais"): which days
 * are still waiting for their closing, which were closed and which have no note at all.
 */

/**
 * The weeks of a month, Sunday first, as in Brazilian calendars. The cells before the first day
 * and after the last one are null.
 */
export function monthWeeks(month: MonthKey): (DayKey | null)[][] {
  const { start, end } = monthRange(month);
  const cells: (DayKey | null)[] = [...Array.from({ length: weekdayOf(start) }, () => null), ...daysBetween(start, end)];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (DayKey | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
  return weeks;
}

/**
 * - pending: a past day still without its closing; clicking it opens "Fechar o dia".
 * - today: opens today's "Fechar o dia".
 * - closed: a past day with a note and nothing left to close; clicking it does nothing.
 * - empty: a past day with no note.
 * - future: after today.
 */
export type CalendarDayState = 'pending' | 'today' | 'closed' | 'empty' | 'future';

export function calendarDayState(
  day: DayKey,
  today: DayKey,
  pendingDays: ReadonlySet<DayKey>,
  daysWithNotes: ReadonlySet<DayKey>,
): CalendarDayState {
  if (day > today) return 'future';
  if (day === today) return 'today';
  if (pendingDays.has(day)) return 'pending';
  return daysWithNotes.has(day) ? 'closed' : 'empty';
}
