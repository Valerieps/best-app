import { daysBetween, type DayKey } from './day';

/**
 * How urgent each cleanup assistant is, shown as a color on the "Assistentes"
 * grid of the "Rituais" screen (spec/assistentes.md). The color says how long the oldest item has been waiting, not
 * how many items there are, because the cost of cleaning grows with age: the longer it waits, the
 * less I remember of its context. The limits, in days, are set in the settings (ADR-045).
 */

/** Assistants that exist so far. The others join the dashboard when they are built. */
export const ASSISTANT_IDS = ['pendingDays', 'whiteboards', 'duplicates', 'forgottenTasks'] as const;
export type AssistantId = (typeof ASSISTANT_IDS)[number];

/**
 * Assistants whose color says how many items they hold, not how long the oldest waits: every
 * forgotten task is already old by definition, so what grows is the pile (spec/assistentes.md).
 */
export const COUNTED_ASSISTANTS: ReadonlySet<AssistantId> = new Set(['forgottenTasks']);

/** 0 em dia (green), 1 atenção (yellow), 2 acumulando (orange), 3 urgente (red). */
export type CleanupStatus = 0 | 1 | 2 | 3;

/** How many days of waiting turn the card yellow, orange and red, in that order. */
export type StatusLimits = readonly [number, number, number];

export const DEFAULT_STATUS_LIMITS: Record<AssistantId, StatusLimits> = {
  // Days left without closing. Closing yesterday this morning is not late (spec/checkout.md).
  pendingDays: [2, 4, 7],
  // Sections left without a project.
  whiteboards: [7, 30, 60],
  // Projects with similar names, counted from when the repeat appeared.
  duplicates: [7, 30, 60],
  // Tasks at risk of being forgotten, counted (COUNTED_ASSISTANTS).
  forgottenTasks: [5, 10, 15],
};

/** Whole numbers from 1 up, each limit at least the previous one. */
export function normalizeLimits(limits: readonly number[]): StatusLimits {
  const clean = (value: number | undefined, floor: number) =>
    Math.max(floor, Number.isFinite(value) ? Math.round(value!) : floor);
  const yellow = clean(limits[0], 1);
  const orange = clean(limits[1], yellow);
  const red = clean(limits[2], orange);
  return [yellow, orange, red];
}

/**
 * Changes one limit and moves the others out of its way, so the edited value always wins:
 * lowering red below orange brings orange down too, instead of pushing red back up.
 */
export function withLimit(limits: StatusLimits, index: 0 | 1 | 2, value: number): StatusLimits {
  const edited = normalizeLimits([value])[0];
  const next = limits.map((limit, i) => (i === index ? edited : i < index ? Math.min(limit, edited) : Math.max(limit, edited)));
  return normalizeLimits(next);
}

export function limitsFor(
  id: AssistantId,
  saved: Partial<Record<AssistantId, StatusLimits>> | undefined,
): StatusLimits {
  return saved?.[id] ? normalizeLimits(saved[id]) : DEFAULT_STATUS_LIMITS[id];
}

/**
 * Green while the measure (days the oldest item waits, or items for COUNTED_ASSISTANTS) is below
 * the yellow limit, and with nothing to clean.
 */
export function cleanupStatus(measure: number | null, limits: StatusLimits): CleanupStatus {
  if (measure === null) return 0;
  if (measure >= limits[2]) return 3;
  if (measure >= limits[1]) return 2;
  if (measure >= limits[0]) return 1;
  return 0;
}

export interface AssistantFindings {
  count: number;
  /** The day the oldest item started waiting; null when there is nothing. */
  oldest: DayKey | null;
}

export interface AssistantCard {
  id: AssistantId;
  count: number;
  /** Days the oldest item has been waiting; null when there is nothing. */
  ageInDays: number | null;
  status: CleanupStatus;
}

/** The dashboard cards, most urgent first; ties keep the order of ASSISTANT_IDS. */
export function assistantCards(
  findings: Record<AssistantId, AssistantFindings>,
  today: DayKey,
  saved: Partial<Record<AssistantId, StatusLimits>> | undefined,
): AssistantCard[] {
  return ASSISTANT_IDS.map((id) => {
    const { count, oldest } = findings[id];
    const ageInDays = count > 0 && oldest !== null ? Math.max(0, daysBetween(oldest, today)) : null;
    const measure = COUNTED_ASSISTANTS.has(id) ? count : ageInDays;
    return { id, count, ageInDays, status: cleanupStatus(measure, limitsFor(id, saved)) };
  }).sort((a, b) => b.status - a.status);
}

/** The earliest of some days; null for none. */
export function oldestDay(days: readonly (DayKey | null | undefined)[]): DayKey | null {
  const known = days.filter((day): day is DayKey => typeof day === 'string');
  return known.length > 0 ? [...known].sort()[0] : null;
}
