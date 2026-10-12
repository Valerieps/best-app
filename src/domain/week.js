import { addDays, fromDayKey, toDayKey } from './day';
export function weekStart(day) {
    const weekday = (fromDayKey(day).getDay() + 6) % 7; // Monday = 0
    return addDays(day, -weekday);
}
export function weekKey(day) {
    // The ISO week belongs to the year of its Thursday.
    const thursday = fromDayKey(addDays(weekStart(day), 3));
    const yearStart = new Date(thursday.getFullYear(), 0, 1, 12);
    const week = Math.floor((thursday.getTime() - yearStart.getTime()) / 86_400_000 / 7) + 1;
    return `${thursday.getFullYear()}-W${String(week).padStart(2, '0')}`;
}
export function weekOf(day) {
    const start = weekStart(day);
    return { key: weekKey(day), start, end: addDays(start, 6) };
}
/**
 * The week a reflection evaluates by default: early in the week (Monday to Wednesday) it is
 * the week that just ended; from Thursday on, the current one.
 */
export function defaultReflectionWeek(today) {
    const weekday = (fromDayKey(today).getDay() + 6) % 7;
    return weekOf(weekday <= 2 ? addDays(today, -7) : today);
}
/** The week of an ISO week key like "2026-W41". January 4th is always in week 1. */
export function weekFromKey(key) {
    const [year, week] = key.split('-W').map(Number);
    const firstMonday = weekStart(toDayKey(new Date(year, 0, 4, 12)));
    return weekOf(addDays(firstMonday, (week - 1) * 7));
}
export function isInWeek(day, week) {
    return day >= week.start && day <= week.end;
}
export function dayOfTimestamp(iso) {
    return toDayKey(new Date(iso));
}
