import { addDays, fromDayKey, toDayKey, type DayKey } from './day';
import { ALL_DAYS } from './dayFlow';
import type { Block, Section } from './entities';
import { POSTPONE_ATTENTION_THRESHOLD } from './tasks';

/** Section 2: rules behind the project page. */

/** The icons a project can have. The drawings live in the UI; the project stores only the id. */
export const PROJECT_ICONS = [
  'pot',
  'home',
  'briefcase',
  'book',
  'heart',
  'plane',
  'code',
  'balloon',
  'leaf',
  'music',
  'dumbbell',
  'camera',
] as const;

export type ProjectIcon = (typeof PROJECT_ICONS)[number];

export function isProjectIcon(value: unknown): value is ProjectIcon {
  return typeof value === 'string' && (PROJECT_ICONS as readonly string[]).includes(value);
}

/** Letter shown for a project without an icon. */
export function projectInitial(name: string): string {
  return name.trim().charAt(0).toLocaleUpperCase('pt-BR') || '?';
}

/**
 * Sections that belong to a day note. The section that holds a project page's tasks does not,
 * nor do the notes written on a project page.
 */
export function isDaySection(section: Section): boolean {
  return section.projectPage !== true && section.projectNote !== true;
}

/**
 * "Travada": an active task postponed 3 times or more, or whose intended date already passed.
 * Uses the same threshold that makes a task ask for attention at checkout.
 */
export function isStuckTask(task: Block, today: DayKey): boolean {
  if (task.kind !== 'task' || task.status !== 'active' || task.waiting) return false;
  return task.postponeCount >= POSTPONE_ATTENTION_THRESHOLD || (task.intendedDate !== null && task.intendedDate < today);
}

function byDateThenCreation(a: Block, b: Block): number {
  // Tasks without a date go last.
  const dateA = a.intendedDate ?? '9999-12-31';
  const dateB = b.intendedDate ?? '9999-12-31';
  if (dateA !== dateB) return dateA < dateB ? -1 : 1;
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

/** Why a task is stuck, spelled out on its card ("adiada 3 vezes · desde 18/09", "venceu em 09/10"). */
export interface StuckReason {
  /** Postponements, when they made the task stuck. */
  postponed: number | null;
  /** Since when it waits: its first intended date, or the day it was written. */
  since: DayKey | null;
  /** The intended date that already passed. */
  overdueOn: DayKey | null;
}

export function stuckReason(task: Block, today: DayKey): StuckReason | null {
  if (!isStuckTask(task, today)) return null;
  const postponed = task.postponeCount >= POSTPONE_ATTENTION_THRESHOLD ? task.postponeCount : null;
  return {
    postponed,
    since: postponed === null ? null : (task.firstIntendedDate ?? toDayKey(new Date(task.createdAt))),
    overdueOn: task.intendedDate !== null && task.intendedDate < today ? task.intendedDate : null,
  };
}

export interface ProjectTaskGroups {
  /** "Travadas": postponed 3 times or more, or with an intended date already passed. */
  stuck: Block[];
  /** "Próximos dias": intended for today or later, and not stuck. */
  upcoming: Block[];
  /** "Sem data", and not stuck. */
  undated: Block[];
  /** "Aguardando": every task a person owes me, with or without a date. */
  waiting: Block[];
}

/**
 * The project's active tasks in the page's levels of emphasis, each group by date then creation.
 * A stuck task shows only among the stuck ones; a waiting task only among the waiting ones.
 */
export function groupProjectTasks(active: readonly Block[], today: DayKey): ProjectTaskGroups {
  const sorted = [...active].sort(byDateThenCreation);
  const waiting = sorted.filter((task) => task.waiting === true);
  const stuck = sorted.filter((task) => isStuckTask(task, today));
  const rest = sorted.filter((task) => !stuck.includes(task) && !waiting.includes(task));
  return {
    stuck,
    waiting,
    upcoming: rest.filter((task) => task.intendedDate !== null),
    undated: rest.filter((task) => task.intendedDate === null),
  };
}

/** How many days "Próximos dias" shows, as columns of a calendar. */
export const AGENDA_DAYS = 3;

/**
 * "Próximos dias" as a small calendar: the next 3 active days, starting today when today is
 * active, each with the tasks intended for it. Tasks of other days do not show.
 */
export function agendaColumns(
  upcoming: readonly Block[],
  today: DayKey,
  activeDays: readonly number[] = ALL_DAYS,
): { day: DayKey; tasks: Block[] }[] {
  const active = activeDays.length > 0 ? activeDays : ALL_DAYS;
  const days: DayKey[] = [];
  let day = today;
  for (let i = 0; days.length < AGENDA_DAYS && i < 7 * AGENDA_DAYS; i++, day = addDays(day, 1)) {
    if (active.includes(fromDayKey(day).getDay())) days.push(day);
  }
  return days.map((each) => ({ day: each, tasks: upcoming.filter((task) => task.intendedDate === each) }));
}
