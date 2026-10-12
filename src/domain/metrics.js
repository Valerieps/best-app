import { isInWeek } from './week';
export function weeklyMetrics(events, week) {
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
