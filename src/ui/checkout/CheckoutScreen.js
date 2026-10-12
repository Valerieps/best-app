import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { applyPlanning, applyTriage, completeCheckout } from '../../application/checkout';
import { answerReminder, snoozeReminder } from '../../application/dayOpening';
import { loadDayTriage, loadPlanning, loadReminderQuestions } from '../../application/queries';
import { askAgainAt } from '../../domain/dayFlow';
import { ReminderQuestions } from './ReminderQuestions';
import { automaticToRow, } from '../../domain/triage';
import { Fireworks, playPlim } from '../components/Celebration';
import { ProjectChip } from '../components/Chips';
import { Linkified } from '../components/Linkified';
import { LoadingPage, SkeletonLines } from '../components/Skeleton';
import { formatLongDate, plural, postponedLabel, relativeDay } from '../format';
import { navigate } from '../hooks';
import { appContext, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';
import { GroupHeader, NotesRowView, rowKey, TaskRowView, WhiteboardRowView, } from './TriageRows';
/** Turns the `objective:id` / `project:id` keys chosen in the rows into resource owners. */
function resourceDecisions(choices) {
    const owners = new Map();
    for (const [sectionId, key] of choices) {
        if (!key)
            continue;
        const [ownerType, ownerId] = key.split(':');
        owners.set(sectionId, { ownerType, ownerId });
    }
    return owners;
}
function automaticKey(item) {
    return item.type === 'notesToWiki' ? `notes:${item.section.id}` : `task:${item.task.id}`;
}
function automaticLabel(item, today) {
    if (item.type === 'notesToWiki') {
        const name = item.project?.name ?? item.section.title ?? 'sem título';
        return `Notas de “${name}” foram para a wiki, ligadas ao projeto`;
    }
    if (item.type === 'scheduledDuringDay' && item.task.intendedDate) {
        return `“${item.task.text}” já tem data (${relativeDay(item.task.intendedDate, today)}) e saiu da triagem`;
    }
    return `“${item.task.text}” foi finalizada durante o dia e saiu da triagem`;
}
/** Groups consecutive rows that came from the same section. */
function groupRows(rows) {
    const groups = [];
    for (const row of rows) {
        const last = groups.at(-1);
        if (last && last[0].section?.id === row.section?.id)
            last.push(row);
        else
            groups.push([row]);
    }
    return groups;
}
export function CheckoutScreen({ day, today }) {
    const [step, setStep] = useState(1);
    const [triage, setTriage] = useState(null);
    const [projects, setProjects] = useState([]);
    const [undone, setUndone] = useState(new Set());
    const [choices, setChoices] = useState(new Map());
    const [taskProjects, setTaskProjects] = useState(new Map());
    const [reminders, setReminders] = useState([]);
    const [reminderChoices, setReminderChoices] = useState(new Map());
    const [objectives, setObjectives] = useState([]);
    const [noteResources, setNoteResources] = useState(new Map());
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        // A snapshot: the triage does not change under the user's hands while choosing.
        loadDayTriage(reader, day, today).then(setTriage);
        reader.projects().then(setProjects);
        reader.objectives().then(setObjectives);
        loadReminderQuestions(reader, day).then(setReminders);
    }, [day, today]);
    const rows = useMemo(() => {
        if (!triage)
            return [];
        const reopened = triage.automatic.filter((item) => undone.has(automaticKey(item))).map(automaticToRow);
        return [...triage.rows, ...reopened];
    }, [triage, undone]);
    if (!triage)
        return _jsx(LoadingPage, { title: `Checkout · ${formatLongDate(day)}` });
    const automatic = triage.automatic.filter((item) => !undone.has(automaticKey(item)));
    const attention = rows.filter((row) => row.attention);
    const suggestions = rows.filter((row) => !row.attention);
    const decisionOf = (row) => choices.get(rowKey(row)) ?? row.suggestion;
    const setDecision = (row, decision) => setChoices((previous) => new Map(previous).set(rowKey(row), decision));
    const resourceOwners = [
        ...objectives
            .filter((objective) => objective.status === 'active')
            .map((objective) => ({ ownerType: 'objective', ownerId: objective.id, label: objective.goal })),
        ...projects
            .filter((project) => project.status === 'active')
            .map((project) => ({ ownerType: 'project', ownerId: project.id, label: project.name })),
    ];
    async function accept() {
        if (!triage)
            return;
        const decisions = {
            tasks: new Map(),
            notes: new Map(),
            whiteboards: new Map(),
            taskProjects,
            noteResources: resourceDecisions(noteResources),
        };
        for (const row of rows) {
            const decision = decisionOf(row);
            if (row.type === 'task')
                decisions.tasks.set(row.task.id, decision);
            if (row.type === 'notes')
                decisions.notes.set(row.section.id, decision);
            if (row.type === 'whiteboard') {
                const whiteboard = decision;
                // A conversion without a name falls back to leaving the section unlinked.
                const safe = whiteboard.kind === 'convert' && !whiteboard.name.trim() ? { kind: 'leaveUnlinked' } : whiteboard;
                decisions.whiteboards.set(row.section.id, safe);
            }
        }
        for (const item of automatic) {
            if (item.type === 'notesToWiki')
                decisions.notes.set(item.section.id, 'wiki');
        }
        setBusy(true);
        try {
            await applyTriage(appContext, day, decisions);
            for (const [id, choice] of reminderChoices) {
                if (choice.kind === 'drop')
                    await answerReminder(appContext, id, 'dropped');
                if (choice.kind === 'change')
                    await snoozeReminder(appContext, id, askAgainAt(new Date(), choice.time));
            }
            setStep(2);
        }
        finally {
            setBusy(false);
        }
    }
    const renderGroups = (list) => groupRows(list).map((group) => (_jsxs("div", { className: "triage-group", children: [_jsx(GroupHeader, { row: group[0] }), group.map((row) => {
                const key = rowKey(row);
                if (row.type === 'task') {
                    return (_jsx(TaskRowView, { row: row, decision: decisionOf(row), onChange: (decision) => setDecision(row, decision), nextDay: triage.nextDay, today: today, projects: projects, projectId: taskProjects.has(row.task.id) ? taskProjects.get(row.task.id) : row.task.projectId, onProjectChange: (projectId) => setTaskProjects((previous) => new Map(previous).set(row.task.id, projectId)) }, key));
                }
                if (row.type === 'notes') {
                    return (_jsx(NotesRowView, { row: row, decision: decisionOf(row), onChange: (decision) => setDecision(row, decision), owners: resourceOwners, resourceOwner: noteResources.get(row.section.id) ?? null, onResourceChange: (owner) => setNoteResources((previous) => new Map(previous).set(row.section.id, owner)) }, key));
                }
                return (_jsx(WhiteboardRowView, { row: row, decision: decisionOf(row), onChange: (decision) => setDecision(row, decision), projects: projects }, key));
            })] }, rowKey(group[0]))));
    const nextLabel = relativeDay(triage.nextDay, today);
    return (_jsx("main", { className: "page page--wide", children: _jsxs("div", { className: "card", children: [_jsxs("header", { className: "card__header", children: [_jsx("button", { type: "button", className: "icon-button", onClick: () => navigate({ name: 'day' }), "aria-label": "Voltar para a nota do dia", children: "\u2190" }), _jsxs("h1", { className: "card__title", children: ["Checkout \u00B7 ", formatLongDate(day)] }), _jsxs("ol", { className: "steps", children: [_jsx("li", { className: step === 1 ? 'steps__current' : '', children: "1 Triagem" }), _jsx("li", { "aria-hidden": "true", children: "\u203A" }), _jsxs("li", { className: step === 2 ? 'steps__current' : '', children: ["2 ", nextLabel.charAt(0).toUpperCase() + nextLabel.slice(1)] })] })] }), step === 1 ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "card__body", children: [rows.length === 0 && automatic.length === 0 ? (_jsx("p", { className: "muted", children: "Nada para triar neste dia." })) : (_jsxs("p", { className: "muted", children: [plural(rows.length + automatic.length, 'item', 'itens'), " \u00B7 ", plural(suggestions.length, 'com sugestão', 'com sugestão'), " \u00B7", ' ', plural(attention.length, 'pede atenção', 'pedem atenção')] })), attention.length > 0 && (_jsxs(_Fragment, { children: [_jsx("h2", { className: "card__subtitle", children: "Pedem aten\u00E7\u00E3o" }), _jsx("div", { className: "triage-attention", children: renderGroups(attention) })] })), suggestions.length > 0 && (_jsxs(_Fragment, { children: [_jsx("h2", { className: "card__subtitle", children: "Sugest\u00F5es" }), renderGroups(suggestions)] })), _jsx(ReminderQuestions, { reminders: reminders, choices: reminderChoices, onChange: (id, choice) => setReminderChoices((previous) => new Map(previous).set(id, choice)) }), automatic.length > 0 && (_jsxs(_Fragment, { children: [_jsx("h2", { className: "card__subtitle", children: "J\u00E1 resolvido automaticamente" }), _jsx("ul", { className: "card-list", children: automatic.map((item) => (_jsxs("li", { className: "card-list__item", children: [_jsxs("span", { children: [_jsx("span", { className: "check-mark", "aria-hidden": "true", children: "\u2713" }), " ", automaticLabel(item, today)] }), _jsx("button", { type: "button", className: "link", onClick: () => setUndone((previous) => new Set(previous).add(automaticKey(item))), children: "desfazer" })] }, automaticKey(item)))) })] }))] }), _jsxs("footer", { className: "card__footer", children: [_jsx("span", { className: "muted", children: attention.length > 0
                                        ? `Confira ${plural(attention.length, 'o item destacado', 'os itens destacados')}; o resto já está decidido`
                                        : 'Tudo já tem destino sugerido' }), _jsx("button", { type: "button", className: "primary", onClick: accept, disabled: busy, children: rows.length + automatic.length === 0 ? 'Continuar' : 'Confirmar decisões' })] })] })) : (_jsx(PlanningStep, { day: day, target: triage.nextDay, today: today, onBack: () => {
                        // The triage was applied; show what is left, if anything.
                        setUndone(new Set());
                        setChoices(new Map());
                        setTaskProjects(new Map());
                        loadDayTriage(reader, day, today).then(setTriage);
                        setStep(1);
                    } }))] }) }));
}
/** Step 2: choose, among the active tasks, what goes into the next day's note. */
function PlanningStep({ day, target, today, onBack }) {
    const view = useLiveQuery(() => loadPlanning(reader, target), [target]);
    const [toggles, setToggles] = useState(new Map());
    const [celebrating, setCelebrating] = useState(false);
    const [busy, setBusy] = useState(false);
    const finish = useCallback(() => navigate({ name: 'day' }), []);
    if (!view)
        return _jsx(SkeletonLines, {});
    const isChecked = (id, planned) => toggles.get(id) ?? planned;
    const toggle = (id, checked) => setToggles((previous) => new Map(previous).set(id, checked));
    const plannedCount = view.planned.filter((item) => isChecked(item.task.id, true)).length +
        view.others.filter((item) => isChecked(item.task.id, false)).length;
    const label = relativeDay(target, today);
    async function finalize() {
        setBusy(true);
        const changes = [...toggles].map(([taskId, include]) => ({ taskId, include }));
        await applyPlanning(appContext, day, target, changes);
        await completeCheckout(appContext, day);
        playPlim();
        setCelebrating(true);
    }
    const renderItem = (item, planned) => {
        const postponed = postponedLabel(item.task.postponeCount);
        const meta = planned
            ? postponed
            : [item.task.intendedDate ? `intenção: ${relativeDay(item.task.intendedDate, today)}` : 'sem data', postponed]
                .filter(Boolean)
                .join(' · ');
        return (_jsxs("li", { className: "card-list__item", children: [_jsxs("label", { className: "check-row", children: [_jsx("input", { type: "checkbox", checked: isChecked(item.task.id, planned), onChange: (event) => toggle(item.task.id, event.target.checked) }), _jsx(Linkified, { text: item.task.text || '(tarefa sem texto)' })] }), _jsxs("span", { className: "list-meta", children: [item.project && _jsx(ProjectChip, { name: item.project.name }), meta && _jsx("span", { className: "muted", children: meta })] })] }, item.task.id));
    };
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "card__body", children: [_jsxs("h2", { className: "card__subtitle", children: ["Na nota de ", label, " (", plannedCount, ")"] }), view.planned.length > 0 ? (_jsx("ul", { className: "card-list", children: view.planned.map((item) => renderItem(item, true)) })) : (_jsxs("p", { className: "muted", children: ["Nenhuma tarefa ainda. Marque abaixo o que entra na nota de ", label, "."] })), view.others.length > 0 && (_jsxs(_Fragment, { children: [_jsx("h2", { className: "card__subtitle", children: "Outras tarefas ativas" }), _jsx("ul", { className: "card-list", children: view.others.map((item) => renderItem(item, false)) })] }))] }), _jsxs("footer", { className: "card__footer card__footer--end", children: [_jsx("button", { type: "button", onClick: onBack, children: "Voltar" }), _jsx("button", { type: "button", className: "primary", onClick: finalize, disabled: busy, children: "Finalizar meu dia \u2726" })] }), celebrating && _jsx(Fireworks, { onDone: finish })] }));
}
