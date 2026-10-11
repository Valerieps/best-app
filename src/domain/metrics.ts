import type { DomainEvent } from './events';
import { isInWeek, type WeekRange } from './week';

/**
 * Weekly metrics, computed from the event history only (SPEC.md, section 2). Future metrics
 * are new functions over the same events.
 */
export interface WeeklyMetrics {
  /** Distinct tasks postponed at least once in the week. */
  postponedTasks: number;
  /** Tasks finished in the week. */
  finishedTasks: number;
  /** Finished tasks that had an intended date. */
  finishedWithIntention: number;
  /** Of those, finished on the intended day, however many times they were postponed. */
  finishedOnIntendedDay: number;
  /** finishedOnIntendedDay / finishedWithIntention, or null when there is nothing to measure. */
  intentionAccuracy: number | null;
}

export function weeklyMetrics(events: readonly DomainEvent[], week: WeekRange): WeeklyMetrics {
  const inWeek = events.filter((event) => isInWeek(event.day, week));
  const postponed = new Set(inWeek.filter((event) => event.type === 'task.postponed').map((event) => event.entityId));
  const finished = inWeek.filter((event) => event.type === 'task.finished');
  const withIntention = finished.filter((event) => typeof event.data.intendedDate === 'string');
  const onTime = withIntention.filter((event) => event.data.intendedDate === event.day);
  return {
    postponedTasks: postponed.size,
    finishedTasks: finished.length,
    finishedWithIntention: withIntention.length,
    finishedOnIntendedDay: onTime.length,
    intentionAccuracy: withIntention.length === 0 ? null : onTime.length / withIntention.length,
  };
}
