import { addDays, fromDayKey, type DayKey } from './day';
import type { DayRecord, Reminder, WarmupItem } from './entities';

/**
 * Section 3: how the day opens. With a warm-up checklist, the app opens on "Iniciar Dia",
 * goes through the warm up and the dashboard, and then to the day note. Without a checklist
 * (the first weeks of use), it opens straight on the day note.
 */

export const ALL_DAYS: readonly number[] = [0, 1, 2, 3, 4, 5, 6];

export type DayStage = 'start' | 'warmup' | 'dashboard' | 'execution';

/**
 * Where the day stands. "Iniciar Dia" and the warm up only exist with a checklist. The dashboard
 * shows after the warm up, or, without a checklist, when it has something else to show
 * (`dashboardContent`, such as the projects in focus), until "Iniciar o Flow de Execução".
 */
export function dayStage(record: DayRecord | undefined, warmupItems: readonly WarmupItem[], dashboardContent = false): DayStage {
  if (warmupItems.length === 0) return dashboardContent && !record?.executionStartedAt ? 'dashboard' : 'execution';
  if (!record?.startedAt) return 'start';
  if (record.executionStartedAt) return 'execution';
  const answered = record.warmup ?? {};
  return warmupItems.every((item) => item.id in answered) ? 'dashboard' : 'warmup';
}

/** The next active day after `day` ("na sexta-feira, o dia seguinte é a segunda"). */
export function nextActiveDay(day: DayKey, activeDays: readonly number[] = ALL_DAYS): DayKey {
  const active = activeDays.length > 0 ? activeDays : ALL_DAYS;
  let next = addDays(day, 1);
  for (let i = 0; i < 7 && !active.includes(fromDayKey(next).getDay()); i++) next = addDays(next, 1);
  return next;
}

/** Reminders whose time has come and that were not answered yet, oldest first. */
export function dueReminders(reminders: readonly Reminder[], now: Date): Reminder[] {
  const at = now.toISOString();
  return reminders
    .filter((reminder) => reminder.status === 'pending' && reminder.dueAt <= at)
    .sort((a, b) => (a.dueAt < b.dueAt ? -1 : 1));
}

/** The moment "perguntar de novo às HH:MM" means: today at that time, or tomorrow if it passed. */
export function askAgainAt(now: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const moment = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes || 0, 0);
  if (moment <= now) moment.setDate(moment.getDate() + 1);
  return moment;
}
