import { addDays, fromDayKey } from '../domain/day';
/** Date and time labels in Brazilian Portuguese. */
function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}
/** "Domingo, 11 de outubro" */
export function formatLongDate(day) {
    return capitalize(fromDayKey(day).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }));
}
/** "14/10" */
export function formatShortDate(day) {
    return fromDayKey(day).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
/** "08:42" */
export function formatTime(iso) {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
/** "sexta", "sábado" */
export function weekdayName(day) {
    return fromDayKey(day).toLocaleDateString('pt-BR', { weekday: 'long' }).replace('-feira', '');
}
/** "hoje", "amanhã", "ontem", or "14/10". */
export function relativeDay(day, today) {
    if (day === today)
        return 'hoje';
    if (day === addDays(today, 1))
        return 'amanhã';
    if (day === addDays(today, -1))
        return 'ontem';
    return formatShortDate(day);
}
/** Name for a day in the recent past: "ontem", "sexta", or "03/10". */
function recentDayName(day, today) {
    if (day === addDays(today, -1))
        return 'ontem';
    if (day >= addDays(today, -6))
        return weekdayName(day);
    return formatShortDate(day);
}
/** "Sexta e sábado estão com checkout pendente" */
export function pendingDaysSentence(days, today) {
    if (days.length === 1)
        return `${capitalize(recentDayName(days[0], today))} está com checkout pendente`;
    if (days.length === 2) {
        return `${capitalize(recentDayName(days[0], today))} e ${recentDayName(days[1], today)} estão com checkout pendente`;
    }
    return `${days.length} dias estão com checkout pendente`;
}
/** "sexta, sábado e domingo" */
export function listDays(days, today) {
    const names = days.map((day) => recentDayName(day, today));
    if (names.length <= 1)
        return capitalize(names.join(''));
    return capitalize(`${names.slice(0, -1).join(', ')} e ${names.at(-1)}`);
}
export function plural(count, one, many) {
    return `${count} ${count === 1 ? one : many}`;
}
export function postponedLabel(count) {
    if (count === 0)
        return null;
    return count === 1 ? 'adiada 1 vez' : `adiada ${count} vezes`;
}
/** Supporting line of a link resource: "drive.google.com". Read from the text, nothing is fetched. */
export function linkDomain(url) {
    const trimmed = url.trim();
    try {
        const parsed = new URL(trimmed);
        if (parsed.hostname)
            return parsed.hostname.replace(/^www\./, '');
    }
    catch {
        // Not a full URL, like "go/plano": the text itself is the best label.
    }
    return trimmed;
}
/** "outubro" */
export function monthName(day) {
    return fromDayKey(day).toLocaleDateString('pt-BR', { month: 'long' });
}
/** Hover of a day on the activity map: "07/10 · 1 nota, 2 tarefas finalizadas", or "07/10 · nada". */
export function activityDetail(day, activity) {
    const parts = [
        activity.notes > 0 ? plural(activity.notes, 'nota', 'notas') : null,
        activity.sections > 0 ? plural(activity.sections, 'seção aberta', 'seções abertas') : null,
        activity.tasksCreated > 0 ? plural(activity.tasksCreated, 'tarefa criada', 'tarefas criadas') : null,
        activity.tasksFinished > 0 ? plural(activity.tasksFinished, 'tarefa finalizada', 'tarefas finalizadas') : null,
    ].filter(Boolean);
    return `${formatShortDate(day)} · ${parts.length > 0 ? parts.join(', ') : 'nada'}`;
}
/** Header of the project list: "4 ativos · 1 parado · 3 travadas". Zero stalled or stuck is left out. */
export function projectListSummary({ active, stalled, stuck }) {
    return [
        plural(active, 'ativo', 'ativos'),
        stalled > 0 ? plural(stalled, 'parado', 'parados') : null,
        stuck > 0 ? plural(stuck, 'travada', 'travadas') : null,
    ]
        .filter(Boolean)
        .join(' · ');
}
/** Why a task is stuck: "adiada 3 vezes · desde 18/09", "venceu em 09/10", or both. */
export function stuckReasonLabel(reason) {
    return [
        reason.overdueOn ? `venceu em ${formatShortDate(reason.overdueOn)}` : null,
        reason.postponed !== null ? postponedLabel(reason.postponed) : null,
        reason.since ? `desde ${formatShortDate(reason.since)}` : null,
    ]
        .filter(Boolean)
        .join(' · ');
}
/** Date block of the project agenda: "amanhã" over "13", a weekday within the week, else the month. */
export function agendaDate(day, today) {
    const date = fromDayKey(day);
    const bottom = String(date.getDate());
    if (day === today)
        return { top: 'hoje', bottom };
    if (day === addDays(today, 1))
        return { top: 'amanhã', bottom };
    if (day <= addDays(today, 6))
        return { top: weekdayName(day).slice(0, 3), bottom };
    return { top: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), bottom };
}
