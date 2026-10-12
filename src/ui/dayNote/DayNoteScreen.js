import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { changeBlockKind, convertSectionToProject, createBlock, createSection, deleteBlock, linkSectionToProject, mergeIntoPrevious, setSectionTitle, setTaskDone, splitBlock, splitKind, updateBlockText, } from '../../application/notebook';
import { setDayPriority, setDeadline, setIntendedDate, setSectionDetails } from '../../application/dayTools';
import { loadDayNote, loadDayPriorities } from '../../application/queries';
import { detectKind } from '../../domain/blockKind';
import { comparePositions, positionBetween } from '../../domain/position';
import { canEditFreely } from '../../domain/tasks';
import { appContext as ctx, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';
import { enqueue } from '../writeQueue';
import { BlockLine, GhostLine, NOTE_HINT } from './BlockLine';
import { requestFocus } from './focus';
import { MeetingDetails } from './MeetingDetails';
import { PendingDaysBanner } from './PendingDaysBanner';
import { PrioritiesBlock, usePinnedPriorities } from './PrioritiesBlock';
import { ScreenHeader } from '../components/ScreenHeader';
import { SkeletonLines } from '../components/Skeleton';
import { formatLongDate } from '../format';
import { navigate } from '../hooks';
import { RemindersBanner } from '../opening/Reminders';
import { SectionHeader } from './SectionHeader';
/** Key of the day's first general section, which exists before anything is saved in it. */
const DAY_ENTRY = 'day';
function draftBlock(id, sectionId, kind, text, position) {
    const at = new Date().toISOString();
    return {
        id,
        kind,
        text,
        sectionId,
        position,
        projectId: null,
        createdAt: at,
        updatedAt: at,
        status: kind === 'task' ? 'active' : null,
        intendedDate: null,
        firstIntendedDate: null,
        postponeCount: 0,
        closedAt: null,
        lastTriagedDay: null,
    };
}
function write(work) {
    enqueue(work).catch(() => {
        // Logged by the queue; the screen shows the saved state again on its own.
    });
}
export function DayNoteScreen({ day, today, pendingDays, reminders = [], showPendingNotice = false, onSnoozePending = () => { }, }) {
    const isToday = day === today;
    const view = useLiveQuery(() => loadDayNote(reader, day), [day]);
    const priorities = useLiveQuery(() => loadDayPriorities(reader, today), [today]) ?? [];
    const [pinned, setPinned] = usePinnedPriorities();
    // The arrows page only through days that still have pending items (1b).
    const previousDay = [...pendingDays].reverse().find((pending) => pending < day) ?? null;
    const nextDay = pendingDays.find((pending) => pending > day) ?? (day < today ? today : null);
    const goToDay = (target) => navigate(target === today ? { name: 'day' } : { name: 'day', day: target });
    const [optimistic, setOptimistic] = useState([]);
    // The section created from the day's empty first section keeps its screen key, so the line
    // being typed in is not rebuilt (and does not lose focus) when the section is saved.
    const [adoptedSectionId, setAdoptedSectionId] = useState(null);
    const adoptedRef = useRef(null);
    // A new day starts with a new empty first section.
    useEffect(() => {
        adoptedRef.current = null;
        setAdoptedSectionId(null);
    }, [today]);
    const entries = useMemo(() => {
        if (!view)
            return [];
        return view.entries.map((note) => {
            const key = !note.section || note.section.id === adoptedSectionId ? DAY_ENTRY : note.section.id;
            const saved = new Set(note.blocks.map((block) => block.id));
            const drafts = optimistic.filter((item) => item.entryKey === key && !saved.has(item.block.id));
            return { key, note, blocks: [...note.blocks, ...drafts.map((item) => item.block)].sort(comparePositions) };
        });
    }, [view, optimistic, adoptedSectionId]);
    // Drop drafts once the database has them.
    useEffect(() => {
        if (!view)
            return;
        const saved = new Set(view.entries.flatMap((entry) => entry.blocks.map((block) => block.id)));
        setOptimistic((previous) => {
            const next = previous.filter((item) => !saved.has(item.block.id));
            return next.length === previous.length ? previous : next;
        });
    }, [view]);
    const lines = useMemo(() => entries.flatMap((entry) => [
        ...entry.note.carried.map((block) => ({ block, entry, ownIndex: -1 })),
        ...entry.blocks.map((block, ownIndex) => ({ block, entry, ownIndex })),
    ]), [entries]);
    // The header needs nothing from the database, so it shows at once, with a skeleton below.
    const header = (_jsx(ScreenHeader, { title: _jsxs("span", { className: "day-title", children: [_jsx("button", { type: "button", className: "icon-button day-title__arrow", disabled: !previousDay, onClick: () => previousDay && goToDay(previousDay), "aria-label": "Dia pendente anterior", children: "\u2039" }), _jsx("h1", { className: "day-title__date", children: formatLongDate(day) }), _jsx("button", { type: "button", className: "icon-button day-title__arrow", disabled: !nextDay, onClick: () => nextDay && goToDay(nextDay), "aria-label": "Pr\u00F3ximo dia pendente", children: "\u203A" })] }), primary: { label: 'Fazer checkout', onSelect: () => navigate({ name: 'checkout', day }) }, more: isToday
            ? [{ label: pinned ? 'Desafixar prioridades' : 'Fixar prioridades no topo', onSelect: () => setPinned(!pinned) }]
            : [] }));
    if (!view) {
        return (_jsxs("main", { className: "page", "aria-busy": "true", children: [header, _jsx(SkeletonLines, {})] }));
    }
    const draftIds = new Set(optimistic.map((item) => item.block.id));
    const slotOf = (block) => lines.find((line) => line.block.id === block.id);
    const isFree = (block) => draftIds.has(block.id) || canEditFreely(block, view.sectionsById.get(block.sectionId), today);
    /** Target for a new line in an entry; creates the day's first section when needed. */
    function newLineTarget(entry, position) {
        const blockId = ctx.ids.next();
        if (entry.note.section)
            return { sectionId: entry.note.section.id, position, blockId };
        // The day's first section may already be on its way to the database: reuse it. Writes run
        // in order, so it exists by the time this line is saved.
        if (adoptedRef.current)
            return { sectionId: adoptedRef.current, position, blockId };
        const newSectionId = ctx.ids.next();
        adoptedRef.current = newSectionId;
        setAdoptedSectionId(newSectionId);
        return { sectionId: null, position, blockId, newSectionId };
    }
    function showDraft(entry, target, kind, text) {
        const sectionId = target.sectionId ?? target.newSectionId ?? '';
        setOptimistic((previous) => [
            ...previous,
            { entryKey: entry.key, block: draftBlock(target.blockId, sectionId, kind, text, target.position) },
        ]);
    }
    /** Position right after a line (or at the start of its section, for carried tasks). */
    function positionAfter(slot) {
        const own = slot.entry.blocks;
        if (slot.ownIndex === -1)
            return positionBetween(null, own[0]?.position ?? null);
        return positionBetween(slot.block.position, own[slot.ownIndex + 1]?.position ?? null);
    }
    const handlers = {
        onSaveText: (block, text) => write(() => updateBlockText(ctx, block.id, text)),
        onEnter: (block, text, caret) => {
            const slot = slotOf(block);
            if (!slot)
                return;
            // Enter on an empty task line that is still free turns it into a note, like a checklist.
            if (block.kind === 'task' && text === '' && isFree(block)) {
                write(() => changeBlockKind(ctx, block.id, 'note', ''));
                return;
            }
            const target = newLineTarget(slot.entry, positionAfter(slot));
            const after = text.slice(caret);
            showDraft(slot.entry, target, splitKind(block.kind, after), detectKind(after).text);
            requestFocus(target.blockId, 0);
            write(() => splitBlock(ctx, block.id, text, caret, target));
        },
        onBackspaceAtStart: (block, text) => {
            if (block.kind === 'task') {
                write(() => changeBlockKind(ctx, block.id, 'note', text));
                return;
            }
            const index = lines.findIndex((line) => line.block.id === block.id);
            const previous = index > 0 ? lines[index - 1] : null;
            if (previous && previous.entry === lines[index].entry) {
                const caret = previous.block.text.length;
                requestFocus(previous.block.id, caret);
                write(() => mergeIntoPrevious(ctx, block.id, text, previous.block.id));
            }
            else if (text === '') {
                if (previous)
                    requestFocus(previous.block.id);
                write(() => deleteBlock(ctx, block.id));
            }
        },
        onMakeTask: (block, text) => write(() => changeBlockKind(ctx, block.id, 'task', text)),
        onToggleDone: (block, done) => write(() => setTaskDone(ctx, block.id, done)),
        onArrow: (block, direction) => {
            const index = lines.findIndex((line) => line.block.id === block.id);
            const next = lines[index + (direction === 'up' ? -1 : 1)];
            if (next)
                requestFocus(next.block.id, direction === 'up' ? 'end' : 0);
        },
        onSetDate: (block, date) => write(() => setIntendedDate(ctx, block.id, date)),
        onSetDeadline: (block, date) => write(() => setDeadline(ctx, block.id, date)),
        onTogglePriority: (block, on) => write(() => setDayPriority(ctx, block.id, on)),
    };
    const priorityIds = new Set(priorities.map((priority) => priority.task.id));
    const lineProps = { day, today, allowNewLines: isToday, handlers };
    // A past day only shows what it has; the empty first section is for writing today.
    const shown = isToday ? entries : entries.filter((entry) => entry.note.section || entry.note.carried.length > 0);
    function createFirstLine(entry, typed) {
        const target = newLineTarget(entry, positionBetween(entry.blocks.at(-1)?.position ?? null, null));
        const { kind, text } = detectKind(typed);
        showDraft(entry, target, kind, text);
        requestFocus(target.blockId);
        write(() => createBlock(ctx, target, typed));
    }
    function addSection(kind) {
        write(() => createSection(ctx, kind).then((section) => requestFocus(`ghost:${section.id}`)));
    }
    return (_jsx(_Fragment, { children: _jsxs("main", { className: "page", children: [header, isToday && (showPendingNotice || reminders.length > 0) && (_jsxs("div", { className: "screen-notices", children: [showPendingNotice && _jsx(PendingDaysBanner, { days: pendingDays, today: today, onSnooze: onSnoozePending }), _jsx(RemindersBanner, { reminders: reminders })] })), isToday && (_jsx(PrioritiesBlock, { priorities: priorities, today: today, pinned: pinned, onToggleDone: (taskId, done) => write(() => setTaskDone(ctx, taskId, done)), onDemote: (taskId) => write(() => setDayPriority(ctx, taskId, false)) })), _jsxs("div", { className: "note", children: [shown.length === 0 && _jsx("p", { className: "muted", children: "Nada pendente neste dia." }), shown.map((entry) => {
                            const section = entry.note.section;
                            const kind = section?.kind ?? 'general';
                            return (_jsxs("section", { className: `section section--${kind} ${section?.projectId ? 'section--project' : ''}`, "aria-label": kind === 'meeting' ? 'Seção de reunião' : 'Seção geral', children: [_jsx(SectionHeader, { section: section, kind: kind, projects: view.projects, onSaveTitle: (title) => section && write(() => setSectionTitle(ctx, section.id, title)), onLinkProject: (project) => section && write(() => linkSectionToProject(ctx, section.id, project.id)), onCreateProject: (name) => section && write(() => convertSectionToProject(ctx, section.id, name)) }), section?.kind === 'meeting' && (_jsx(MeetingDetails, { section: section, onSave: (details) => write(() => setSectionDetails(ctx, section.id, details)) })), entry.note.carried.map((block) => (_jsx(BlockLine, { block: block, free: false, isPriority: priorityIds.has(block.id), ...lineProps }, block.id))), entry.blocks.map((block) => (_jsx(BlockLine, { block: block, free: isFree(block), isPriority: priorityIds.has(block.id), ...lineProps }, block.id))), isToday && entry.blocks.length === 0 && (_jsx(GhostLine, { id: `ghost:${section?.id ?? DAY_ENTRY}`, placeholder: NOTE_HINT, onCreate: (text) => createFirstLine(entry, text) }))] }, entry.key));
                        }), isToday && (_jsxs("div", { className: "note__actions", children: [_jsx("button", { type: "button", className: "tertiary", onClick: () => addSection('general'), children: "+ Se\u00E7\u00E3o geral" }), _jsx("button", { type: "button", className: "tertiary", onClick: () => addSection('meeting'), children: "+ Se\u00E7\u00E3o de reuni\u00E3o" })] }))] })] }) }));
}
