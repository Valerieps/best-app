import { toDayKey } from './day';
import { daysBetween, weekdayOf } from './month';
/** Section 6: habit statistics, from the yes/no logs. */
export function habitLogId(habitId, day) {
    return `${habitId}:${day}`;
}
export function isExpectedOn(habit, day) {
    return habit.weekdays.includes(weekdayOf(day));
}
/** Days before the habit existed are not expected. */
function firstDay(habit) {
    return habit.createdAt ? toDayKey(new Date(habit.createdAt)) : null;
}
export function habitStats(habit, logs, start, end) {
    const doneDays = new Set(logs.filter((log) => log.habitId === habit.id && log.done).map((log) => log.day));
    const createdOn = firstDay(habit);
    let expected = 0;
    let done = 0;
    let streak = 0;
    let longestStreak = 0;
    for (const day of daysBetween(start, end)) {
        if (!isExpectedOn(habit, day) || (createdOn !== null && day < createdOn && !doneDays.has(day)))
            continue;
        expected++;
        if (doneDays.has(day)) {
            done++;
            streak++;
            longestStreak = Math.max(longestStreak, streak);
        }
        else {
            streak = 0;
        }
    }
    return { expected, done, completion: expected === 0 ? null : done / expected, longestStreak };
}
