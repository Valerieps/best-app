import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { flushSync } from 'react-dom';
import {
  changeBlockKind,
  convertSectionToProject,
  createBlock,
  createSection,
  createSectionAfter,
  deleteBlock,
  titleSectionWithProject,
  unlinkSection,
  renameSectionProject,
  mergeIntoPrevious,
  reorderCarriedTasks,
  reorderDayParts,
  reorderSectionLines,
  setSectionTitle,
  setTaskDone,
  setTaskWaiting,
  splitBlock,
  splitKind,
  updateBlockText,
  type NewBlockTarget,
} from '../../application/notebook';
import { moveDayPriority, setDayPriority, setDeadline, setIntendedDate } from '../../application/dayTools';
import { ensurePeople } from '../../application/people';
import { setDayNoteFocus } from '../../application/settings';
import { loadDayNote, loadDayPriorities } from '../../application/queries';
import { detectKind } from '../../domain/blockKind';
import type { DayKey } from '../../domain/day';
import type { DayNoteSection } from '../../domain/dayNote';
import type { Block, BlockKind, DayNoteFocus, Reminder, SectionKind } from '../../domain/entities';
import { CARRIED_PART, FIRST_PART, moveByOne, moveItem, orderDayParts, PRIORITIES_PART } from '../../domain/order';
import { comparePositions, positionBetween } from '../../domain/position';
import { canEditFreely } from '../../domain/tasks';
import { appContext as ctx, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';
import { enqueue } from '../writeQueue';
import { BlockLine, GhostLine, NOTE_HINT, type LineDragProps, type LineHandlers } from './BlockLine';
import { requestFocus } from './focus';
import { NoteSettledContext, useEnteringKeys, useNoteSettled } from './entryMotion';
import { FOCUS_SHORTCUT, isFocusToggleKey } from './focusMode';
import { FOCUS_PART_TRANSITION, hasFocusTransition, runFocusTransition } from './focusTransition';
import { isSamePlace, isTypingKey, partMoveKey, useLineDrag } from './lineDrag';
import { PendingDaysBanner } from './PendingDaysBanner';
import { PrioritiesBlock, usePinnedPriorities } from './PrioritiesBlock';
import { useCollapsedParts } from './collapsedParts';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { SkeletonLines } from '../components/Skeleton';
import { formatLongDate } from '../format';
import { navigate } from '../hooks';
import { RemindersBanner } from '../opening/Reminders';
import { opensLineBelow } from './lineBelow';
import { SectionHeader } from './SectionHeader';
import { FormatToolbar } from './FormatToolbar';
import { useLineSelection } from './useLineSelection';

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
  /** Focus mode: only this part of the note shows, without the header or the notices. */
  focus?: DayNoteFocus | null;
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

function draftBlock(id: string, sectionId: string, kind: BlockKind, text: string, position: string, waiting?: boolean): Block {
  const at = new Date().toISOString();
  return {
    ...(kind === 'task' && waiting ? { waiting: true } : {}),
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
  focus = null,
}: Props) {
  const isToday = day === today;
  // In focus mode, a part opened on today's note keeps taking new lines past midnight: the day
  // turning never interrupts what I am writing (spec/nota-do-dia.md, "Modo foco").
  const writable = focus ? focus.writable : isToday;
  const view = useLiveQuery(() => loadDayNote(reader, day, today), [day, today]);
  const prioritiesDay = focus ? focus.day : today;
  const priorities = useLiveQuery(() => loadDayPriorities(reader, prioritiesDay), [prioritiesDay]) ?? [];
  const [pinned, setPinned] = usePinnedPriorities();
  const [collapsedParts, toggleCollapsedPart] = useCollapsedParts();
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
  // Typing hides the drag handles until the mouse moves again.
  const [typing, setTyping] = useState(false);
  // Entering and leaving focus mode is a view transition: the part glides between its place and
  // the whole screen (`focusTransition.ts`). Without one, leaving fades the whole note in, like
  // entering fades the part in.
  const glides = hasFocusTransition();
  const wasFocused = useRef(focus !== null);
  const [fromFocus, setFromFocus] = useState(false);
  useEffect(() => {
    if (wasFocused.current && !focus && !glides) setFromFocus(true);
    if (focus) setFromFocus(false);
    wasFocused.current = focus !== null;
  }, [focus, glides]);
  // The part entering or leaving focus mode, named for the transition while it runs.
  const [morphPart, setMorphPart] = useState<string | null>(null);
  // Resolves the transition's wait once the screen shows the new focus.
  const focusShown = useRef<(() => void) | null>(null);
  useLayoutEffect(() => {
    focusShown.current?.();
    focusShown.current = null;
  }, [focus]);
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
    const sections = writable ? entries : entries.filter((entry) => entry.note.section);
    const all: Part[] = [
      ...(writable && !pinned ? [{ key: PRIORITIES_PART, kind: 'priorities' as const }] : []),
      ...(host ? [{ key: CARRIED_PART, kind: 'carried' as const, entry: host }] : []),
      ...sections.map((entry) => ({ key: entry.note.section?.id ?? FIRST_PART, kind: 'section' as const, entry })),
    ];
    const byKey = new Map(all.map((part) => [part.key, part]));
    const saved = partOrder?.day === day ? partOrder.keys : view.sectionOrder;
    return orderDayParts(all.map((part) => part.key), saved).map((key) => byKey.get(key)!);
  }, [view, entries, writable, pinned, partOrder, day]);

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
  // Lines and parts that appear while the note is on screen fade in; focus mode has its own transition.
  const settled = useNoteSettled({ view: `${day}|${focus?.part ?? ''}`, shown: Boolean(view) && !focus });
  const enteringParts = useEnteringKeys(parts.map((part) => part.key), settled);

  // Several lines selected at once (spec/nota-do-dia.md, "Selecionar várias linhas").
  const noteRef = useRef<HTMLDivElement>(null);
  const lineIds = useMemo(() => new Map(lines.map((line) => [line.block.id, line.block])), [lines]);
  const lineSelection = useLineSelection({
    container: noteRef,
    isLine: (id) => lineIds.has(id),
    textOf: (id) => lineIds.get(id)?.text ?? '',
    onDelete: (ids) => {
      if (!view) return;
      const drafts = new Set(optimistic.map((item) => item.block.id));
      const doomed = new Set(
        ids.filter((id) => {
          const block = lineIds.get(id);
          return block && (drafts.has(id) || canEditFreely(block, view.sectionsById.get(block.sectionId), today));
        }),
      );
      if (doomed.size === 0) return;
      // The cursor goes to the line above the first one deleted, or below, when there is one.
      const order = lines.map((line) => line.block.id);
      const first = order.findIndex((id) => doomed.has(id));
      const above = order.slice(0, first).reverse().find((id) => !doomed.has(id));
      const below = order.slice(first).find((id) => !doomed.has(id));
      if (above) requestFocus(above, 'end');
      else if (below) requestFocus(below, 0);
      for (const id of doomed) write(() => deleteBlock(ctx, id));
    },
    onLeave: (id, direction) => requestFocus(id, direction === 'up' ? 0 : 'end'),
  });
  const selectedIds = new Set(lineSelection.selection?.ids ?? []);

  // Focusing the day's empty first section: once it is saved, the focus follows its id.
  useEffect(() => {
    if (focus?.part === FIRST_PART && adoptedSectionId) {
      write(() => setDayNoteFocus(ctx, { ...focus, part: adoptedSectionId }));
    }
  }, [focus, adoptedSectionId]);

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
    />
  );

  if (!view) {
    return (
      <main className={`page page--note ${focus ? 'page--focus' : ''}`} aria-busy="true">
        {!focus && header}
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

  function showDraft(entry: Entry, target: NewBlockTarget, kind: BlockKind, text: string, waiting?: boolean) {
    const sectionId = target.sectionId ?? target.newSectionId ?? '';
    setOptimistic((previous) => [
      ...previous,
      { entryKey: entry.key, block: draftBlock(target.blockId!, sectionId, kind, text, target.position, waiting) },
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
    onEnter: (block, text, caret, newCaret = 0) => {
      const slot = slotOf(block);
      if (!slot) return;
      // Enter on an empty task line that is still free turns it into a note, like a checklist.
      if (block.kind === 'task' && text === '' && isFree(block)) {
        write(() => changeBlockKind(ctx, block.id, 'note', ''));
        return;
      }
      const target = newLineTarget(slot.entry, positionAfter(slot));
      const after = text.slice(caret);
      const detected = detectKind(after);
      showDraft(slot.entry, target, splitKind(block.kind, after), detected.text, detected.waiting);
      requestFocus(target.blockId!, newCaret);
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
    onMakeTask: (block, text, waiting) => write(() => changeBlockKind(ctx, block.id, 'task', text, waiting)),
    onSetWaiting: (block, waiting) => write(() => setTaskWaiting(ctx, block.id, waiting)),
    onEnsurePeople: (names) => write(() => ensurePeople(ctx, names)),
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
    onSelectAll: () => lineSelection.selectAllLines(),
  };

  const priorityIds = new Set(priorities.map((priority) => priority.task.id));
  const lineProps = { day, today, allowNewLines: writable, handlers };
  const partKeys = parts.map((part) => part.key);
  const projects = view.projects;
  const onlyPriorities = parts.every((part) => part.kind === 'priorities');

  /** Creates a line at the end of a section: its first line, or the one typed after clicking below the lines. */
  function createFirstLine(entry: Entry, typed: string, caret?: number) {
    setAppendingTo(null);
    const target = newLineTarget(entry, positionBetween(entry.blocks.at(-1)?.position ?? null, null));
    const { kind, text, waiting } = detectKind(typed);
    showDraft(entry, target, kind, text, waiting);
    requestFocus(target.blockId!, caret ?? 'end');
    write(() => createBlock(ctx, target, typed));
  }

  /**
   * A click in the empty area below a section's lines, down to the next part of the day, means
   * writing something new: it opens an empty line at the end of that section, saved only on the
   * first keystroke (ADR-013). In a section with no lines yet, a click anywhere in it goes to its
   * first line. Only today's note takes new lines (ADR-018).
   */
  function openLineBelow(event: MouseEvent<HTMLElement>) {
    if (!writable || event.button !== 0) return;
    const y = event.clientY;
    const rows = [...event.currentTarget.querySelectorAll<HTMLElement>(':scope > .day-part')];
    const row = rows.filter((element) => element.getBoundingClientRect().top <= y).at(-1);
    const part = parts.find((item) => item.key === row?.dataset.dragId);
    if (!row || !part || part.kind !== 'section') return;
    const entry = part.entry;
    const empty = entry.blocks.length === 0;
    const lastLine = row.querySelectorAll('.line:not(.line--ghost)');
    const lastLineBottom = empty ? null : lastLine[lastLine.length - 1]?.getBoundingClientRect().bottom;
    if (lastLineBottom === undefined) return;
    const onControl = (event.target as HTMLElement).closest(
      'textarea, input, button, a, select, .line__rendered, .section__header, .note__actions, .part-insert',
    );
    if (!opensLineBelow({ y, lastLineBottom, onControl: onControl !== null })) return;
    // Keeps the browser from moving the focus; the empty line takes it once it shows.
    event.preventDefault();
    if (empty) {
      requestFocus(`ghost:${entry.note.section?.id ?? DAY_ENTRY}`);
      return;
    }
    setAppendingTo(entry.key);
    requestFocus(`ghost:end:${entry.key}`);
  }

  function addSection(kind: SectionKind) {
    write(() => createSection(ctx, kind).then((section) => requestFocus(`ghost:${section.id}`)));
  }

  /** A new section right after the part at `index`, from the options between two parts. */
  function insertSection(kind: SectionKind, index: number) {
    const keys = partKeys;
    write(() => createSectionAfter(ctx, kind, keys, index).then((section) => requestFocus(`ghost:${section.id}`)));
  }

  /** Focus mode is the same for every part: on, it shows only that part; off, the whole note. */
  const isFocused = (key: string, entryKey?: string) =>
    focus !== null && (focus.part === key || (focus.part === FIRST_PART && entryKey === DAY_ENTRY));
  function toggleFocus(key: string) {
    const next = focus ? null : { day, part: key, writable: isToday };
    // Named before the transition takes its picture of the screen as it is now.
    flushSync(() => setMorphPart(key));
    runFocusTransition(
      () =>
        new Promise<void>((shown) => {
          focusShown.current = shown;
          write(() => setDayNoteFocus(ctx, next));
        }),
      () => setMorphPart(null),
    );
  }
  function focusButton(key: string, label: string, entryKey?: string) {
    const on = isFocused(key, entryKey);
    return (
      <button
        type="button"
        className="icon-button part-focus"
        title={on ? `Sair do modo foco (${FOCUS_SHORTCUT})` : `Focar ${label} (${FOCUS_SHORTCUT})`}
        aria-label={on ? 'Sair do modo foco' : `Focar ${label}`}
        aria-pressed={on}
        onClick={() => toggleFocus(key)}
      >
        <Icon name={on ? 'minimize' : 'maximize'} size="sm" />
      </button>
    );
  }

  /** Collapsing a part hides its lines and keeps its header; focus mode always shows them. */
  const isCollapsed = (key: string) => !focus && collapsedParts.has(key);
  function collapseButton(key: string, label: string) {
    if (focus) return null;
    const collapsed = collapsedParts.has(key);
    return (
      <button
        type="button"
        className="icon-button part-collapse"
        title={collapsed ? `Expandir ${label}` : `Recolher ${label}`}
        aria-label={collapsed ? `Expandir ${label}` : `Recolher ${label}`}
        aria-expanded={!collapsed}
        onClick={() => toggleCollapsedPart(key)}
      >
        <Icon name={collapsed ? 'chevronRight' : 'chevronDown'} size="sm" />
      </button>
    );
  }

  const prioritiesBlock = (
    <PrioritiesBlock
      priorities={priorities}
      today={prioritiesDay}
      pinned={pinned}
      onTogglePin={isToday && !focus ? () => setPinned(!pinned) : undefined}
      onToggleDone={(taskId, done) => write(() => setTaskDone(ctx, taskId, done))}
      onDemote={(taskId) => write(() => setDayPriority(ctx, taskId, false))}
      onMoveDate={(taskId, date) => write(() => moveDayPriority(ctx, taskId, date))}
      onSetDeadline={(taskId, date) => write(() => setDeadline(ctx, taskId, date))}
      trailing={focusButton(PRIORITIES_PART, 'nas prioridades do dia')}
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
            {focusButton(part.key, 'nas tarefas de outros dias')}
            {collapseButton(part.key, 'as tarefas de outros dias')}
          </div>
          {!isCollapsed(part.key) && entry.carried.map((block, index) => (
            <BlockLine
              key={block.id}
              block={block}
              free={false}
              isPriority={priorityIds.has(block.id)}
              drag={dragProps(entry, true, block, index)}
              selected={selectedIds.has(block.id)}
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
        className={`section section--${kind} ${section?.projectId ? 'section--project' : ''} ${isCollapsed(part.key) ? 'section--collapsed' : ''}`}
        aria-label={kind === 'meeting' ? 'Seção de reunião' : 'Seção geral'}
      >
        <SectionHeader
          section={section}
          kind={kind}
          projects={projects}
          onSaveTitle={(title) => section && write(() => setSectionTitle(ctx, section.id, title))}
          onLinkProject={(project) => section && write(() => titleSectionWithProject(ctx, section.id, project.id))}
          onCreateProject={(name) => section && write(() => convertSectionToProject(ctx, section.id, name))}
          onUnlink={(title) => section && write(() => unlinkSection(ctx, section.id, title))}
          onRenameProject={(name) => section && write(() => renameSectionProject(ctx, section.id, name))}
          trailing={
            <>
              <FormatToolbar />
              {focusButton(part.key, section?.title ? `na seção "${section.title}"` : 'nesta seção', entry.key)}
              {collapseButton(part.key, section?.title ? `a seção "${section.title}"` : 'esta seção')}
            </>
          }
        />
        {!isCollapsed(part.key) && entry.blocks.map((block, index) => (
          <BlockLine
            key={block.id}
            block={block}
            free={isFree(block)}
            isPriority={priorityIds.has(block.id)}
            drag={dragProps(entry, false, block, index)}
            selected={selectedIds.has(block.id)}
            {...lineProps}
          />
        ))}
        {writable && !isCollapsed(part.key) && entry.blocks.length === 0 && (
          <GhostLine
            id={`ghost:${section?.id ?? DAY_ENTRY}`}
            placeholder={NOTE_HINT}
            onCreate={(text, caret) => createFirstLine(entry, text, caret)}
          />
        )}
        {writable && !isCollapsed(part.key) && entry.blocks.length > 0 && appendingTo === entry.key && (
          <GhostLine
            id={`ghost:end:${entry.key}`}
            placeholder={NOTE_HINT}
            onCreate={(text, caret) => createFirstLine(entry, text, caret)}
            onLeave={() => setAppendingTo(null)}
          />
        )}
      </section>
    );
  }

  /** The wrapper of a part: moving it and its focus mode work with the cursor anywhere inside. */
  function partKeyDown(event: KeyboardEvent<HTMLElement>, key: string) {
    if (isFocusToggleKey(event)) {
      event.preventDefault();
      toggleFocus(key);
      return;
    }
    if (focus) return;
    const direction = partMoveKey(event);
    if (!direction) return;
    event.preventDefault();
    moveParts(moveByOne(partKeys, key, direction));
  }

  // The note holds the focus while lines are selected, and takes their keys.
  const noteProps = {
    ref: noteRef,
    tabIndex: -1,
    onPointerDown: lineSelection.onPointerDown,
    onMouseDown: (event: MouseEvent<HTMLElement>) => {
      if (!lineSelection.onMouseDown(event)) openLineBelow(event);
    },
    onBlur: lineSelection.onBlur,
  };

  if (focus) {
    // Only the part shows, with the sidebar. The priorities can be focused even when pinned.
    const part: Part | undefined =
      focus.part === PRIORITIES_PART
        ? { key: PRIORITIES_PART, kind: 'priorities' }
        : parts.find((item) => isFocused(item.key, item.kind === 'section' ? item.entry.key : undefined));
    return (
      <main className="page page--note page--focus">
        <div className={`note note--focus ${glides ? '' : 'note--focus-fade'}`} {...noteProps} onKeyDown={lineSelection.onKeyDown}>
          {part ? (
            <div
              className={`day-part day-part--${part.kind}`}
              data-drag-id={part.key}
              style={{ viewTransitionName: FOCUS_PART_TRANSITION }}
              onKeyDown={(event) => partKeyDown(event, part.key)}
            >
              {renderPart(part)}
            </div>
          ) : (
            // Never left on its own, even when the part is gone: only I leave focus mode.
            <div className="note__focus-gone">
              {focusButton(focus.part, '')}
              <p className="muted">Esta parte da nota não existe mais.</p>
            </div>
          )}
        </div>
      </main>
    );
  }

  const typingProps = {
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      lineSelection.onKeyDown(event);
      if (!typing && isTypingKey(event)) setTyping(true);
    },
    onMouseMove: () => {
      if (typing) setTyping(false);
    },
  };

  return (
    <>
      <main className={`page page--note ${fromFocus ? 'page--from-focus' : ''}`}>
        {header}
        {isToday && (showPendingNotice || reminders.length > 0) && (
          <div className="screen-notices">
            {showPendingNotice && <PendingDaysBanner days={pendingDays} today={today} onSnooze={onSnoozePending} />}
            <RemindersBanner reminders={reminders} />
          </div>
        )}
        {/* Pinned, the priorities stay at the top and do not move with the other parts. */}
        {isToday && pinned && prioritiesBlock}
        <NoteSettledContext.Provider value={settled}>
          <div className={`note ${typing ? 'note--typing' : ''}`} {...noteProps} {...typingProps}>
            {onlyPriorities && !isToday && <p className="muted">Nada pendente neste dia.</p>}
            {parts.map((part, index) => (
              <div
                key={part.kind === 'section' ? part.entry.key : part.key}
                className={`day-part day-part--${part.kind} ${enteringParts.has(part.key) ? 'day-part--entering' : ''} ${dragClasses(part.key, index)}`}
                data-drag-group={PARTS_GROUP}
                data-drag-id={part.key}
                style={morphPart === part.key ? { viewTransitionName: FOCUS_PART_TRANSITION } : undefined}
                onKeyDown={(event) => partKeyDown(event, part.key)}
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
                {isToday && index < parts.length - 1 && (
                  <div className="part-insert">
                    <button type="button" className="tertiary" onClick={() => insertSection('general', index)}>
                      + Seção geral
                    </button>
                    <button type="button" className="tertiary" onClick={() => insertSection('meeting', index)}>
                      + Seção de reunião
                    </button>
                  </div>
                )}
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
        </NoteSettledContext.Provider>
      </main>
    </>
  );
}
