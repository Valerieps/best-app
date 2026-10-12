import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { addDays } from '../../domain/day';
import { KindChip, NoteChip, ProjectChip, WhiteboardChip } from '../components/Chips';
import { Linkified } from '../components/Linkified';
import { Segmented } from '../components/Segmented';
import { formatTime, postponedLabel, relativeDay } from '../format';
export function rowKey(row) {
    return row.type === 'task' ? `task:${row.task.id}` : `${row.type}:${row.section.id}`;
}
export function TaskRowView({ row, decision, onChange, nextDay, today, projects, projectId, onProjectChange, allowReflection = true, }) {
    if (row.type !== 'task')
        return null;
    const choice = decision.kind === 'schedule' ? (decision.date === nextDay ? 'next' : 'other') : decision.kind;
    const postponed = postponedLabel(row.task.postponeCount);
    const nextLabel = relativeDay(nextDay, today);
    const deadline = row.task.deadline ?? null;
    const activeProjects = (projects ?? []).filter((project) => project.status === 'active');
    return (_jsxs("div", { className: "triage-row", children: [_jsxs("span", { className: "triage-row__label", children: [_jsx(Linkified, { text: row.task.text || '(tarefa sem texto)' }), postponed && _jsx("span", { className: `chip ${row.attention ? 'chip--whiteboard' : 'chip--muted'}`, children: postponed }), deadline && (_jsxs("span", { className: `chip ${deadline < nextDay ? 'chip--whiteboard' : 'chip--muted'}`, children: ["prazo ", relativeDay(deadline, today)] })), onProjectChange && activeProjects.length > 0 && (_jsxs("select", { className: "text-input triage-row__project", value: projectId ?? '', onChange: (event) => onProjectChange(event.target.value || null), "aria-label": `Projeto de "${row.task.text}"`, children: [_jsx("option", { value: "", children: "sem projeto" }), activeProjects.map((project) => (_jsx("option", { value: project.id, children: project.name }, project.id)))] }))] }), _jsxs("span", { className: "triage-row__controls", children: [_jsx(Segmented, { label: `Destino de "${row.task.text}"`, value: choice, options: [
                            { value: 'finish', label: 'Finalizar' },
                            { value: 'next', label: nextLabel.charAt(0).toUpperCase() + nextLabel.slice(1) },
                            { value: 'other', label: 'Outra data' },
                            { value: 'archive', label: 'Arquivar' },
                            { value: 'abandon', label: 'Abandonar' },
                            ...(allowReflection ? [{ value: 'reflection', label: 'Reflexão semanal' }] : []),
                            { value: 'habit', label: 'Virar hábito' },
                        ], onChange: (value) => {
                            if (value === 'next')
                                onChange({ kind: 'schedule', date: nextDay });
                            // "Outra data" starts one day after "dia seguinte", then the date field changes it.
                            else if (value === 'other')
                                onChange({ kind: 'schedule', date: addDays(nextDay, 1) });
                            else
                                onChange({ kind: value });
                        } }), choice === 'other' && decision.kind === 'schedule' && (_jsx("input", { type: "date", className: "date-input", min: today, value: decision.date, onChange: (event) => event.target.value && onChange({ kind: 'schedule', date: event.target.value }), "aria-label": "Outra data de inten\u00E7\u00E3o" }))] })] }));
}
export function NotesRowView({ row, decision, onChange, allowReflection = true, owners, resourceOwner, onResourceChange, }) {
    if (row.type !== 'notes')
        return null;
    return (_jsxs("div", { className: "triage-row", children: [_jsxs("span", { className: "triage-row__label", children: ["Notas desta se\u00E7\u00E3o (", row.noteCount, ")", onResourceChange && owners && owners.length > 0 && decision === 'wiki' && (_jsxs("select", { className: "text-input triage-row__project", value: resourceOwner ?? '', onChange: (event) => onResourceChange(event.target.value || null), "aria-label": "Vincular como recurso", children: [_jsx("option", { value: "", children: "sem v\u00EDnculo como recurso" }), owners.map((owner) => (_jsxs("option", { value: `${owner.ownerType}:${owner.ownerId}`, children: ["Recurso de ", owner.label] }, `${owner.ownerType}:${owner.ownerId}`)))] }))] }), _jsx(Segmented, { label: "Destino das notas desta se\u00E7\u00E3o", value: decision, options: [
                    { value: 'wiki', label: 'Wiki' },
                    { value: 'discarded', label: 'Descartar' },
                    ...(allowReflection ? [{ value: 'weeklyReflection', label: 'Reflexão semanal' }] : []),
                ], onChange: onChange })] }));
}
export function WhiteboardRowView({ row, decision, onChange, projects, }) {
    if (row.type !== 'whiteboard')
        return null;
    const active = projects.filter((project) => project.status === 'active');
    const linkTarget = decision.kind === 'link' ? active.find((project) => project.id === decision.projectId) : row.citedProject;
    const defaultName = row.section.title ?? '';
    return (_jsxs("div", { className: "triage-row", children: [_jsx("span", { className: "triage-row__label", children: "V\u00EDnculo desta se\u00E7\u00E3o" }), _jsxs("span", { className: "triage-row__controls", children: [_jsx(Segmented, { label: "V\u00EDnculo desta se\u00E7\u00E3o", value: decision.kind, options: [
                            { value: 'convert', label: 'Converter em projeto' },
                            { value: 'link', label: linkTarget ? `Vincular a ${linkTarget.name}` : 'Vincular a…' },
                            { value: 'leaveUnlinked', label: 'Deixar sem vínculo' },
                        ], onChange: (value) => {
                            if (value === 'convert')
                                onChange({ kind: 'convert', name: defaultName });
                            else if (value === 'link') {
                                const target = linkTarget ?? active[0];
                                if (target)
                                    onChange({ kind: 'link', projectId: target.id });
                            }
                            else
                                onChange({ kind: 'leaveUnlinked' });
                        } }), decision.kind === 'convert' && (_jsx("input", { className: "text-input", value: decision.name, placeholder: "Nome do projeto", onChange: (event) => onChange({ kind: 'convert', name: event.target.value }), "aria-label": "Nome do novo projeto" })), decision.kind === 'link' && active.length > 1 && (_jsx("select", { className: "text-input", value: decision.projectId, onChange: (event) => onChange({ kind: 'link', projectId: event.target.value }), "aria-label": "Projeto", children: active.map((project) => (_jsx("option", { value: project.id, children: project.name }, project.id))) }))] })] }));
}
/** Header of a group of rows: the section they came from. */
export function GroupHeader({ row }) {
    const section = row.section;
    if (!section) {
        return (_jsx("div", { className: "triage-group__header", children: _jsx("span", { children: "Tarefas planejadas para o dia" }) }));
    }
    const cited = row.type === 'whiteboard' ? row.citedProject : null;
    return (_jsxs("div", { className: "triage-group__header", children: [_jsx(KindChip, { kind: section.kind }), _jsx("span", { className: "muted", children: formatTime(section.createdAt) }), _jsx("span", { children: section.title ?? 'Sem título' }), section.projectId ? _jsx(ProjectChip, {}) : _jsx(WhiteboardChip, {}), cited && _jsx(NoteChip, { children: `cita “${cited.name}”` })] }));
}
