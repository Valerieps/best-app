import { addDays, fromDayKey, toDayKey } from './day';
export function monthKey(day) {
    return day.slice(0, 7);
}
export function monthRange(key) {
    const [year, month] = key.split('-').map(Number);
    const start = toDayKey(new Date(year, month - 1, 1, 12));
    const end = addDays(toDayKey(new Date(year, month, 1, 12)), -1);
    return { key, start, end };
}
export function shiftMonth(key, amount) {
    const [year, month] = key.split('-').map(Number);
    return toDayKey(new Date(year, month - 1 + amount, 1, 12)).slice(0, 7);
}
/** Every day of a range, inclusive. */
export function daysBetween(start, end) {
    const days = [];
    for (let day = start; day <= end; day = addDays(day, 1))
        days.push(day);
    return days;
}
export function weekdayOf(day) {
    return fromDayKey(day).getDay();
}
