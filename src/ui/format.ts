import { addDays, fromDayKey, type DayKey } from '../domain/day';
import type { DayActivity } from '../domain/projectActivity';
import type { StuckReason } from '../domain/projectPage';

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

/**
 * "Falta fechar sexta e sábado". Plain, without urgency: closing yesterday this morning is not
 * late (spec/checkout.md).
 */
export function pendingDaysSentence(days: readonly DayKey[], today: DayKey): string {
  if (days.length === 1) return `Falta fechar ${recentDayName(days[0], today)}`;
  if (days.length === 2) return `Falta fechar ${recentDayName(days[0], today)} e ${recentDayName(days[1], today)}`;
  return `Faltam fechar ${days.length} dias`;
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

/** Supporting line of a link resource: "drive.google.com". Read from the text, nothing is fetched. */
export function linkDomain(url: string): string {
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname) return parsed.hostname.replace(/^www\./, '');
  } catch {
    // Not a full URL, like "go/plano": the text itself is the best label.
  }
  return trimmed;
}

/** "outubro" */
export function monthName(day: DayKey): string {
  return fromDayKey(day).toLocaleDateString('pt-BR', { month: 'long' });
}

/** Hover of a day on the activity map: "07/10 · 1 nota, 2 tarefas finalizadas", or "07/10 · nada". */
export function activityDetail(day: DayKey, activity: DayActivity): string {
  const parts = [
    activity.notes > 0 ? plural(activity.notes, 'nota', 'notas') : null,
    activity.sections > 0 ? plural(activity.sections, 'seção aberta', 'seções abertas') : null,
    activity.tasksCreated > 0 ? plural(activity.tasksCreated, 'tarefa criada', 'tarefas criadas') : null,
    activity.tasksFinished > 0 ? plural(activity.tasksFinished, 'tarefa finalizada', 'tarefas finalizadas') : null,
  ].filter(Boolean);
  return `${formatShortDate(day)} · ${parts.length > 0 ? parts.join(', ') : 'nada'}`;
}

/** Header of the project list: "4 ativos · 1 parado · 3 travadas". Zero stalled or stuck is left out. */
export function projectListSummary({ active, stalled, stuck }: { active: number; stalled: number; stuck: number }): string {
  return [
    plural(active, 'ativo', 'ativos'),
    stalled > 0 ? plural(stalled, 'parado', 'parados') : null,
    stuck > 0 ? plural(stuck, 'travada', 'travadas') : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Why a task is stuck: "adiada 3 vezes · desde 18/09", "venceu em 09/10", or both. */
export function stuckReasonLabel(reason: StuckReason): string {
  return [
    reason.overdueOn ? `venceu em ${formatShortDate(reason.overdueOn)}` : null,
    reason.postponed !== null ? postponedLabel(reason.postponed) : null,
    reason.since ? `desde ${formatShortDate(reason.since)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Date block of the project agenda: "amanhã" over "13", a weekday within the week, else the month. */
export function agendaDate(day: DayKey, today: DayKey): { top: string; bottom: string } {
  const date = fromDayKey(day);
  const bottom = String(date.getDate());
  if (day === today) return { top: 'hoje', bottom };
  if (day === addDays(today, 1)) return { top: 'amanhã', bottom };
  if (day <= addDays(today, 6)) return { top: weekdayName(day).slice(0, 3), bottom };
  return { top: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), bottom };
}
