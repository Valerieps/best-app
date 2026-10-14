import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import {
  changeBlockKind,
  convertSectionToProject,
  createBlock,
  createSection,
  deleteBlock,
  linkSectionToProject,
  mergeIntoPrevious,
  reorderCarriedTasks,
  reorderDayParts,
  reorderSectionLines,
  setSectionTitle,
  setTaskDone,
  splitBlock,
  splitKind,
  updateBlockText,
  type NewBlockTarget,
} from '../../application/notebook';
import { setDayPriority, setDeadline, setIntendedDate, setSectionDetails } from '../../application/dayTools';
import { loadDayNote, loadDayPriorities } from '../../application/queries';
import { detectKind } from '../../domain/blockKind';
import type { DayKey } from '../../domain/day';
import type { DayNoteSection } from '../../domain/dayNote';
import type { Block, BlockKind, Reminder, SectionKind } from '../../domain/entities';
import { CARRIED_PART, FIRST_PART, moveByOne, moveItem, orderDayParts, PRIORITIES_PART } from '../../domain/order';
import { comparePositions, positionBetween } from '../../domain/position';
import { canEditFreely } from '../../domain/tasks';
import { appContext as ctx, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';
import { enqueue } from '../writeQueue';
import { BlockLine, GhostLine, NOTE_HINT, type LineDragProps, type LineHandlers } from './BlockLine';
import { requestFocus } from './focus';
import { isSamePlace, partMoveKey, useLineDrag } from './lineDrag';
import { MeetingDetails } from './MeetingDetails';
import { PendingDaysBanner } from './PendingDaysBanner';
import { PrioritiesBlock, usePinnedPriorities } from './PrioritiesBlock';
import { ScreenHeader } from '../components/ScreenHeader';
import { SkeletonLines } from '../components/Skeleton';
import { formatLongDate } from '../format';
import { navigate } from '../hooks';
import { RemindersBanner } from '../opening/Reminders';
import { ReviewBanner } from '../reviews/ReviewBanner';
import type { ReviewNotice } from '../reviews/reviewNotice';
import { opensLineBelow } from './lineBelow';
import { SectionHeader } from './SectionHeader';

interface Props {
  /** The day shown: today, or a past day with pending items (1b). */
  day: DayKey;
  today: DayKey;
  /** Past days with pending items, for the arrows (1b). */
  pendingDays: DayKey[];
  /** Section 3: reminders that came back, shown in a discreet band at the top. */
  reminders?: Reminder[];
  /** Whether the pending checkout band is the one warning shown now (see `pickTopNotice`). */
  showPendingNotice?: boolean;
  /** "Lembrar depois" on the pending checkout band. */
  onSnoozePending?(): void;
  /** The available review, when its band is the one warning shown now. */
  reviewNotice?: ReviewNotice | null;
  /** "Lembrar depois" on the review band. */
  onSnoozeReview?(): void;
}

/** A section of the screen, with its stable key and the lines shown in it. */
interface Entry {
  key: string;
  note: DayNoteSection;
  /** Tasks carried from other days, in the order shown. */
  carried: Block[];
  /** Own blocks, including new lines not saved yet. */
  blocks: Block[];
}

/**
 * A part of the note that can be moved as a whole: a section, the tasks carried from other days
 * (shown as a section of their own) or the day priorities, while they are not pinned.
 */
type Part =
  | { key: string; kind: 'priorities' }
  | { key: string; kind: 'carried'; entry: Entry }
  | { key: string; kind: 'section'; entry: Entry };

/** Drag group of the day's parts; line groups are named after their entry. */
const PARTS_GROUP = 'parts';

/** Where a line lives: its entry and its index among that entry's own blocks. */
interface LineSlot {
  block: Block;
  entry: Entry;
  /** -1 for tasks carried from other days. */
  ownIndex: number;
}

/** A line shown before the database confirms it, so typing right after Enter lands in it. */
interface Optimistic {
  entryKey: string;
  block: Block;
}

/** Key of the day's first general section, which exists before anything is saved in it. */
const DAY_ENTRY = 'day';

/** Lines that trade places when reordering (request 2): an entry's own lines, or its carried tasks. */
function groupKey(entryKey: string, carried: boolean): string {
  return `${entryKey}:${carried ? 'carried' : 'own'}`;
}

/** The lines in the order just chosen, while the database has not answered yet. */
function inOrder(blocks: Block[], ids: readonly string[] | undefined): Block[] {
  if (!ids) return blocks;
  const index = new Map(ids.map((id, at) => [id, at]));
  const rank = (block: Block) => index.get(block.id) ?? ids.length;
  return [...blocks].sort((a, b) => rank(a) - rank(b));
}

function sameIds(blocks: readonly Block[], ids: readonly string[]): boolean {
  return blocks.length === ids.length && blocks.every((block, at) => block.id === ids[at]);
}

function draftBlock(id: string, sectionId: string, kind: BlockKind, text: string, position: string): Block {
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

function write(work: () => Promise<unknown>) {
  enqueue(work).catch(() => {
    // Logged by the queue; the screen shows the saved state again on its own.
  });
}

export function DayNoteScreen({
  day,
  today,
  pendingDays,
  reminders = [],
  showPendingNotice = false,
  onSnoozePending = () => {},
  reviewNotice = null,
  onSnoozeReview,
}: Props) {
  const isToday = day === today;
  const view = useLiveQuery(() => loadDayNote(reader, day), [day]);
  const priorities = useLiveQuery(() => loadDayPriorities(reader, today), [today]) ?? [];
  const [pinned, setPinned] = usePinnedPriorities();
  // The arrows page only through days that still have pending items (1b).
  const previousDay = [...pendingDays].reverse().find((pending) => pending < day) ?? null;
  const nextDay = pendingDays.find((pending) => pending > day) ?? (day < today ? today : null);
  const goToDay = (target: DayKey) => navigate(target === today ? { name: 'day' } : { name: 'day', day: target });
  const [optimistic, setOptimistic] = useState<Optimistic[]>([]);
  // Order chosen by moving a line, per group, until the database shows it.
  const [orders, setOrders] = useState<Record<string, string[]>>({});
  // Order chosen by moving a part, until the database shows it. `base` is the saved order then.
  const [partOrder, setPartOrder] = useState<{ day: DayKey; keys: string[]; base: string } | null>(null);
  // Section whose empty area below the lines was clicked: it shows an empty line at its end.
  const [appendingTo, setAppendingTo] = useState<string | null>(null);
  const dropItem = useRef<(group: string, id: string, toIndex: number) => void>(() => {});
  const { drag, start: startDrag } = useLineDrag((group, id, toIndex) => dropItem.current(group, id, toIndex));
  // The section created from the day's empty first section keeps its screen key, so the line
  // being typed in is not rebuilt (and does not lose focus) when the section is saved.
  const [adoptedSectionId, setAdoptedSectionId] = useState<string | null>(null);
  const adoptedRef = useRef<string | null>(null);
  // A new day starts with a new empty first section.
  useEffect(() => {
    adoptedRef.current = null;
    setAdoptedSectionId(null);
  }, [today]);

  const entries = useMemo<Entry[]>(() => {
    if (!view) return [];
    return view.entries.map((note) => {
      const key = !note.section || note.section.id === adoptedSectionId ? DAY_ENTRY : note.section.id;
      const saved = new Set(note.blocks.map((block) => block.id));
      const drafts = optimistic.filter((item) => item.entryKey === key && !saved.has(item.block.id));
      const blocks = [...note.blocks, ...drafts.map((item) => item.block)].sort(comparePositions);
      return {
        key,
        note,
        carried: inOrder(note.carried, orders[groupKey(key, true)]),
        blocks: inOrder(blocks, orders[groupKey(key, false)]),
      };
    });
  }, [view, optimistic, adoptedSectionId, orders]);

  // Drop drafts once the database has them.
  useEffect(() => {
    if (!view) return;
    const saved = new Set(view.entries.flatMap((entry) => entry.blocks.map((block) => block.id)));
    setOptimistic((previous) => {
      const next = previous.filter((item) => !saved.has(item.block.id));
      return next.length === previous.length ? previous : next;
    });
  }, [view]);

  // Drop a chosen order once the database shows the lines that way.
  useEffect(() => {
    if (!view) return;
    setOrders((previous) => {
      const keys = Object.keys(previous);
      if (keys.length === 0) return previous;
      const saved = new Map<string, Block[]>();
      for (const note of view.entries) {
        const key = !note.section || note.section.id === adoptedSectionId ? DAY_ENTRY : note.section.id;
        saved.set(groupKey(key, true), note.carried);
        saved.set(groupKey(key, false), note.blocks);
      }
      const next = Object.fromEntries(
        Object.entries(previous).filter(([key, ids]) => !sameIds(saved.get(key) ?? [], ids)),
      );
      return Object.keys(next).length === keys.length ? previous : next;
    });
  }, [view, adoptedSectionId]);

  // The saved order changed, so the one chosen on screen is in the database.
  const savedOrder = view?.sectionOrder?.join() ?? '';
  useEffect(() => {
    setPartOrder((previous) => (previous && previous.base !== savedOrder ? null : previous));
  }, [savedOrder]);

  const parts = useMemo<Part[]>(() => {
    if (!view) return [];
    const host = entries.find((entry) => entry.carried.length > 0);
    // A past day only shows what it has; the empty first section is for writing today.
    const sections = isToday ? entries : entries.filter((entry) => entry.note.section);
    const all: Part[] = [
      ...(isToday && !pinned ? [{ key: PRIORITIES_PART, kind: 'priorities' as const }] : []),
      ...(host ? [{ key: CARRIED_PART, kind: 'carried' as const, entry: host }] : []),
      ...sections.map((entry) => ({ key: entry.note.section?.id ?? FIRST_PART, kind: 'section' as const, entry })),
    ];
    const byKey = new Map(all.map((part) => [part.key, part]));
    const saved = partOrder?.day === day ? partOrder.keys : view.sectionOrder;
    return orderDayParts(all.map((part) => part.key), saved).map((key) => byKey.get(key)!);
  }, [view, entries, isToday, pinned, partOrder, day]);

  // Lines in the order shown, for the arrows and Backspace.
  const lines = useMemo<LineSlot[]>(
    () =>
      parts.flatMap((part): LineSlot[] => {
        if (part.kind === 'carried') return part.entry.carried.map((block) => ({ block, entry: part.entry, ownIndex: -1 }));
        if (part.kind === 'section') return part.entry.blocks.map((block, ownIndex) => ({ block, entry: part.entry, ownIndex }));
        return [];
      }),
    [parts],
  );

  // The header needs nothing from the database, so it shows at once, with a skeleton below.
  const header = (
    <ScreenHeader
      title={
        <span className="day-title">
          <button
            type="button"
            className="icon-button day-title__arrow"
            disabled={!previousDay}
            onClick={() => previousDay && goToDay(previousDay)}
            aria-label="Dia pendente anterior"
          >
            ‹
          </button>
          <h1 className="day-title__date">{formatLongDate(day)}</h1>
          <button
            type="button"
            className="icon-button day-title__arrow"
            disabled={!nextDay}
            onClick={() => nextDay && goToDay(nextDay)}
            aria-label="Próximo dia pendente"
          >
            ›
          </button>
        </span>
      }
      primary={{ label: 'Fechar o dia', onSelect: () => navigate({ name: 'checkout', day }) }}
      more={
        isToday
          ? [{ label: pinned ? 'Desafixar prioridades' : 'Fixar prioridades no topo', onSelect: () => setPinned(!pinned) }]
          : []
      }
    />
  );

  if (!view) {
    return (
      <main className="page" aria-busy="true">
        {header}
        <SkeletonLines />
      </main>
    );
  }

  const draftIds = new Set(optimistic.map((item) => item.block.id));
  const slotOf = (block: Block) => lines.find((line) => line.block.id === block.id);
  const isFree = (block: Block) =>
    draftIds.has(block.id) || canEditFreely(block, view.sectionsById.get(block.sectionId), today);

  /** Target for a new line in an entry; creates the day's first section when needed. */
  function newLineTarget(entry: Entry, position: string): NewBlockTarget {
    const blockId = ctx.ids.next();
    if (entry.note.section) return { sectionId: entry.note.section.id, position, blockId };
    // The day's first section may already be on its way to the database: reuse it. Writes run
    // in order, so it exists by the time this line is saved.
    if (adoptedRef.current) return { sectionId: adoptedRef.current, position, blockId };
    const newSectionId = ctx.ids.next();
    adoptedRef.current = newSectionId;
    setAdoptedSectionId(newSectionId);
    return { sectionId: null, position, blockId, newSectionId };
  }

  function showDraft(entry: Entry, target: NewBlockTarget, kind: BlockKind, text: string) {
    const sectionId = target.sectionId ?? target.newSectionId ?? '';
    setOptimistic((previous) => [
      ...previous,
      { entryKey: entry.key, block: draftBlock(target.blockId!, sectionId, kind, text, target.position) },
    ]);
  }

  /** Position right after a line (or at the start of its section, for carried tasks). */
  function positionAfter(slot: LineSlot): string {
    const own = slot.entry.blocks;
    if (slot.ownIndex === -1) return positionBetween(null, own[0]?.position ?? null);
    return positionBetween(slot.block.position, own[slot.ownIndex + 1]?.position ?? null);
  }

  /** The lines that trade places with this one: the carried tasks, or the section's own lines. */
  function groupOf(slot: LineSlot) {
    const carried = slot.ownIndex === -1;
    const blocks = carried ? slot.entry.carried : slot.entry.blocks;
    return { key: groupKey(slot.entry.key, carried), carried, ids: blocks.map((block) => block.id) };
  }

  /** Request 2: shows the new order at once and saves it after the writes already queued. */
  function reorder(slot: LineSlot, ids: string[]) {
    const group = groupOf(slot);
    if (ids.join() === group.ids.join()) return;
    setOrders((previous) => ({ ...previous, [group.key]: ids }));
    const movedId = slot.block.id;
    enqueue(() =>
      group.carried ? reorderCarriedTasks(ctx, day, ids, movedId) : reorderSectionLines(ctx, ids, movedId),
    ).catch(() => {
      // Logged by the queue; go back to the saved order.
      setOrders(({ [group.key]: _dropped, ...rest }) => rest);
    });
  }

  /** Moves the parts of the day: shows the new order at once and saves it for this day. */
  function moveParts(keys: string[]) {
    if (keys.join() === parts.map((part) => part.key).join()) return;
    setPartOrder({ day, keys, base: savedOrder });
    enqueue(() => reorderDayParts(ctx, day, keys)).catch(() => {
      // Logged by the queue; go back to the saved order.
      setPartOrder(null);
    });
  }

  dropItem.current = (group, id, toIndex) => {
    if (group === PARTS_GROUP) {
      moveParts(moveItem(parts.map((part) => part.key), id, toIndex));
      return;
    }
    const slot = lines.find((line) => line.block.id === id);
    if (slot) reorder(slot, moveItem(groupOf(slot).ids, id, toIndex));
  };

  /** Where a dragged item would land among `keys`, drawn on the item at `index`. */
  function dropMark(group: string, keys: readonly string[], index: number): LineDragProps['mark'] {
    const active = drag?.group === group ? drag : null;
    if (!active || isSamePlace(keys.indexOf(active.id), active.toIndex)) return null;
    if (active.toIndex === index) return 'before';
    if (active.toIndex === keys.length && index === keys.length - 1) return 'after';
    return null;
  }

  function dragProps(entry: Entry, carried: boolean, block: Block, index: number): LineDragProps | undefined {
    const blocks = carried ? entry.carried : entry.blocks;
    if (blocks.length < 2) return undefined;
    const group = groupKey(entry.key, carried);
    const ids = blocks.map((line) => line.id);
    return {
      group,
      onStart: (event) => startDrag(event, group, block.id),
      dragging: drag?.group === group && drag.id === block.id,
      mark: dropMark(group, ids, index),
    };
  }

  const handlers: LineHandlers = {
    onSaveText: (block, text) => write(() => updateBlockText(ctx, block.id, text)),
    onEnter: (block, text, caret) => {
      const slot = slotOf(block);
      if (!slot) return;
      // Enter on an empty task line that is still free turns it into a note, like a checklist.
      if (block.kind === 'task' && text === '' && isFree(block)) {
        write(() => changeBlockKind(ctx, block.id, 'note', ''));
        return;
      }
      const target = newLineTarget(slot.entry, positionAfter(slot));
      const after = text.slice(caret);
      showDraft(slot.entry, target, splitKind(block.kind, after), detectKind(after).text);
      requestFocus(target.blockId!, 0);
      write(() => splitBlock(ctx, block.id, text, caret, target));
    },
    onBackspaceAtStart: (block, text) => {
      if (block.kind === 'task') {
        write(() => changeBlockKind(ctx, block.id, 'note', text));
        return;
      }
      const index = lines.findIndex((line) => line.block.id === block.id);
      const previous = index > 0 ? lines[index - 1] : null;
      if (previous && previous.entry === lines[index].entry && previous.ownIndex !== -1) {
        const caret = previous.block.text.length;
        requestFocus(previous.block.id, caret);
        write(() => mergeIntoPrevious(ctx, block.id, text, previous.block.id));
      } else if (text === '') {
        if (previous) requestFocus(previous.block.id);
        write(() => deleteBlock(ctx, block.id));
      }
    },
    onMakeTask: (block, text) => write(() => changeBlockKind(ctx, block.id, 'task', text)),
    onToggleDone: (block, done) => write(() => setTaskDone(ctx, block.id, done)),
    onArrow: (block, direction) => {
      const index = lines.findIndex((line) => line.block.id === block.id);
      const next = lines[index + (direction === 'up' ? -1 : 1)];
      if (next) requestFocus(next.block.id, direction === 'up' ? 'end' : 0);
    },
    onSetDate: (block, date) => write(() => setIntendedDate(ctx, block.id, date)),
    onSetDeadline: (block, date) => write(() => setDeadline(ctx, block.id, date)),
    onTogglePriority: (block, on) => write(() => setDayPriority(ctx, block.id, on)),
    onMove: (block, direction) => {
      const slot = slotOf(block);
      if (slot) reorder(slot, moveByOne(groupOf(slot).ids, block.id, direction));
    },
  };

  const priorityIds = new Set(priorities.map((priority) => priority.task.id));
  const lineProps = { day, today, allowNewLines: isToday, handlers };
  const partKeys = parts.map((part) => part.key);
  const projects = view.projects;
  const onlyPriorities = parts.every((part) => part.kind === 'priorities');

  /** Creates a line at the end of a section: its first line, or the one typed after clicking below the lines. */
  function createFirstLine(entry: Entry, typed: string) {
    setAppendingTo(null);
    const target = newLineTarget(entry, positionBetween(entry.blocks.at(-1)?.position ?? null, null));
    const { kind, text } = detectKind(typed);
    showDraft(entry, target, kind, text);
    requestFocus(target.blockId!);
    write(() => createBlock(ctx, target, typed));
  }

  /**
   * A click in the empty area below a section's lines, down to the next part of the day, means
   * writing something new: it opens an empty line at the end of that section, saved only on the
   * first keystroke (ADR-013). Only today's note takes new lines (ADR-018).
   */
  function openLineBelow(event: MouseEvent<HTMLElement>) {
    if (!isToday || event.button !== 0) return;
    const y = event.clientY;
    const rows = [...event.currentTarget.querySelectorAll<HTMLElement>(':scope > .day-part')];
    const row = rows.filter((element) => element.getBoundingClientRect().top <= y).at(-1);
    const part = parts.find((item) => item.key === row?.dataset.dragId);
    if (!row || !part || part.kind !== 'section' || part.entry.blocks.length === 0) return;
    const entry = part.entry;
    const lines = row.querySelectorAll('.line');
    const lastLine = lines[lines.length - 1];
    if (!lastLine) return;
    const onControl = (event.target as HTMLElement).closest('textarea, input, button, a, select, .line, .section__header, .note__actions');
    if (!opensLineBelow({ y, lastLineBottom: lastLine.getBoundingClientRect().bottom, onControl: onControl !== null })) return;
    // Keeps the browser from moving the focus; the empty line takes it once it shows.
    event.preventDefault();
    setAppendingTo(entry.key);
    requestFocus(`ghost:end:${entry.key}`);
  }

  function addSection(kind: SectionKind) {
    write(() => createSection(ctx, kind).then((section) => requestFocus(`ghost:${section.id}`)));
  }

  const prioritiesBlock = (
    <PrioritiesBlock
      priorities={priorities}
      today={today}
      pinned={pinned}
      onToggleDone={(taskId, done) => write(() => setTaskDone(ctx, taskId, done))}
      onDemote={(taskId) => write(() => setDayPriority(ctx, taskId, false))}
    />
  );

  function partLabel(part: Part): string {
    if (part.kind === 'priorities') return 'as prioridades do dia';
    if (part.kind === 'carried') return 'as tarefas de outros dias';
    const section = part.entry.note.section;
    const name = section?.title ? ` "${section.title}"` : '';
    return `a seção${name}`;
  }

  function dragClasses(key: string, index: number): string {
    const mark = dropMark(PARTS_GROUP, partKeys, index);
    const dragging = drag?.group === PARTS_GROUP && drag.id === key;
    return `${dragging ? 'day-part--dragging' : ''} ${mark ? `day-part--drop-${mark}` : ''}`;
  }

  function renderPart(part: Part) {
    if (part.kind === 'priorities') return prioritiesBlock;
    if (part.kind === 'carried') {
      const entry = part.entry;
      return (
        <section className="section section--general section--carried" aria-label="Tarefas de outros dias">
          <div className="section__header">
            <span className="section__carried-title">De outros dias</span>
          </div>
          {entry.carried.map((block, index) => (
            <BlockLine
              key={block.id}
              block={block}
              free={false}
              isPriority={priorityIds.has(block.id)}
              drag={dragProps(entry, true, block, index)}
              {...lineProps}
            />
          ))}
        </section>
      );
    }
    const entry = part.entry;
    const section = entry.note.section;
    const kind = section?.kind ?? 'general';
    return (
      <section
        className={`section section--${kind} ${section?.projectId ? 'section--project' : ''}`}
        aria-label={kind === 'meeting' ? 'Seção de reunião' : 'Seção geral'}
      >
        <SectionHeader
          section={section}
          kind={kind}
          projects={projects}
          onSaveTitle={(title) => section && write(() => setSectionTitle(ctx, section.id, title))}
          onLinkProject={(project) => section && write(() => linkSectionToProject(ctx, section.id, project.id))}
          onCreateProject={(name) => section && write(() => convertSectionToProject(ctx, section.id, name))}
        />
        {section?.kind === 'meeting' && (
          <MeetingDetails section={section} onSave={(details) => write(() => setSectionDetails(ctx, section.id, details))} />
        )}
        {entry.blocks.map((block, index) => (
          <BlockLine
            key={block.id}
            block={block}
            free={isFree(block)}
            isPriority={priorityIds.has(block.id)}
            drag={dragProps(entry, false, block, index)}
            {...lineProps}
          />
        ))}
        {isToday && entry.blocks.length === 0 && (
          <GhostLine
            id={`ghost:${section?.id ?? DAY_ENTRY}`}
            placeholder={NOTE_HINT}
            onCreate={(text) => createFirstLine(entry, text)}
          />
        )}
        {isToday && entry.blocks.length > 0 && appendingTo === entry.key && (
          <GhostLine
            id={`ghost:end:${entry.key}`}
            placeholder={NOTE_HINT}
            onCreate={(text) => createFirstLine(entry, text)}
            onLeave={() => setAppendingTo(null)}
          />
        )}
      </section>
    );
  }

  return (
    <>
      <main className="page">
        {header}
        {isToday && (showPendingNotice || reviewNotice || reminders.length > 0) && (
          <div className="screen-notices">
            {showPendingNotice && <PendingDaysBanner days={pendingDays} today={today} onSnooze={onSnoozePending} />}
            {reviewNotice && <ReviewBanner notice={reviewNotice} onSnooze={() => onSnoozeReview?.()} />}
            <RemindersBanner reminders={reminders} />
          </div>
        )}
        {/* Pinned, the priorities stay at the top and do not move with the other parts. */}
        {isToday && pinned && prioritiesBlock}
        <div className="note" onMouseDown={openLineBelow}>
          {onlyPriorities && !isToday && <p className="muted">Nada pendente neste dia.</p>}
          {parts.map((part, index) => (
            <div
              key={part.kind === 'section' ? part.entry.key : part.key}
              className={`day-part day-part--${part.kind} ${dragClasses(part.key, index)}`}
              data-drag-group={PARTS_GROUP}
              data-drag-id={part.key}
              onKeyDown={(event) => {
                const direction = partMoveKey(event);
                if (!direction) return;
                event.preventDefault();
                moveParts(moveByOne(partKeys, part.key, direction));
              }}
            >
              {parts.length > 1 && (
                <button
                  type="button"
                  className="day-part__handle"
                  title="Arraste para mudar a ordem (ou Ctrl + Shift + ↑/↓)"
                  aria-label={`Mover ${partLabel(part)} (Ctrl + Shift + ↑/↓)`}
                  onPointerDown={(event) => startDrag(event, PARTS_GROUP, part.key)}
                >
                  ⠿
                </button>
              )}
              {renderPart(part)}
            </div>
          ))}
          {isToday && (
            <div className="note__actions">
              <button type="button" className="tertiary" onClick={() => addSection('general')}>
                + Seção geral
              </button>
              <button type="button" className="tertiary" onClick={() => addSection('meeting')}>
                + Seção de reunião
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
