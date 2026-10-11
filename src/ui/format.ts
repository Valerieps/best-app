import { addDays, fromDayKey, type DayKey } from '../domain/day';

/** Date and time labels in Brazilian Portuguese. */

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Domingo, 11 de outubro" */
export function formatLongDate(day: DayKey): string {
  return capitalize(fromDayKey(day).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }));
}

/** "14/10" */
export function formatShortDate(day: DayKey): string {
  return fromDayKey(day).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/** "08:42" */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** "sexta", "sábado" */
export function weekdayName(day: DayKey): string {
  return fromDayKey(day).toLocaleDateString('pt-BR', { weekday: 'long' }).replace('-feira', '');
}

/** "hoje", "amanhã", "ontem", or "14/10". */
export function relativeDay(day: DayKey, today: DayKey): string {
  if (day === today) return 'hoje';
  if (day === addDays(today, 1)) return 'amanhã';
  if (day === addDays(today, -1)) return 'ontem';
  return formatShortDate(day);
}

/** Name for a day in the recent past: "ontem", "sexta", or "03/10". */
function recentDayName(day: DayKey, today: DayKey): string {
  if (day === addDays(today, -1)) return 'ontem';
  if (day >= addDays(today, -6)) return weekdayName(day);
  return formatShortDate(day);
}

/** "Sexta e sábado estão com checkout pendente" */
export function pendingDaysSentence(days: readonly DayKey[], today: DayKey): string {
  if (days.length === 1) return `${capitalize(recentDayName(days[0], today))} está com checkout pendente`;
  if (days.length === 2) {
    return `${capitalize(recentDayName(days[0], today))} e ${recentDayName(days[1], today)} estão com checkout pendente`;
  }
  return `${days.length} dias estão com checkout pendente`;
}

/** "sexta, sábado e domingo" */
export function listDays(days: readonly DayKey[], today: DayKey): string {
  const names = days.map((day) => recentDayName(day, today));
  if (names.length <= 1) return capitalize(names.join(''));
  return capitalize(`${names.slice(0, -1).join(', ')} e ${names.at(-1)}`);
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function postponedLabel(count: number): string | null {
  if (count === 0) return null;
  return count === 1 ? 'adiada 1 vez' : `adiada ${count} vezes`;
}
