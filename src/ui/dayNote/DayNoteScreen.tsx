import { useEffect, useMemo, useRef, useState } from 'react';
import {
  changeBlockKind,
  convertSectionToProject,
  createBlock,
  createSection,
  deleteBlock,
  linkSectionToProject,
  mergeIntoPrevious,
  setSectionTitle,
  setTaskDone,
  splitBlock,
  splitKind,
  updateBlockText,
  type NewBlockTarget,
} from '../../application/notebook';
import { setDayPriority, setDeadline, setIntendedDate, setSectionDetails } from '../../application/dayTools';
import { loadDayNote, loadDayPriorities, loadPendingDays } from '../../application/queries';
import { detectKind } from '../../domain/blockKind';
import type { DayKey } from '../../domain/day';
import type { DayNoteSection } from '../../domain/dayNote';
import type { Block, BlockKind, Reminder, SectionKind } from '../../domain/entities';
import { comparePositions, positionBetween } from '../../domain/position';
import { canEditFreely } from '../../domain/tasks';
import { appContext as ctx, reader } from '../services';
import { useLiveQuery } from '../useLiveQuery';
import { enqueue } from '../writeQueue';
import { BlockLine, GhostLine, type LineHandlers } from './BlockLine';
import { requestFocus } from './focus';
import { MeetingDetails } from './MeetingDetails';
import { PendingDaysBanner } from './PendingDaysBanner';
import { PrioritiesBlock } from './PrioritiesBlock';
import { ReflectionBanner } from '../reflection/ReflectionBanner';
import { MonthlyReflectionBanner } from '../reflection/MonthlyReflectionScreen';
import { RemindersBanner } from '../opening/Reminders';
import { SectionHeader } from './SectionHeader';

interface Props {
  /** The day shown: today, or a past day with pending items (1b). */
  day: DayKey;
  today: DayKey;
  /** Section 3: reminders that came back, shown in a discreet band at the top. */
  reminders?: Reminder[];
}

/** A section of the screen, with its stable key and the lines shown in it. */
interface Entry {
  key: string;
  note: DayNoteSection;
  /** Own blocks, including new lines not saved yet. */
  blocks: Block[];
}

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

export function DayNoteScreen({ day, today, reminders = [] }: Props) {
  const isToday = day === today;
  const view = useLiveQuery(() => loadDayNote(reader, day), [day]);
  const priorities = useLiveQuery(() => loadDayPriorities(reader, today), [today]) ?? [];
  const pendingDays = useLiveQuery(() => loadPendingDays(reader, today), [today]) ?? [];
  const [optimistic, setOptimistic] = useState<Optimistic[]>([]);
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
      return { key, note, blocks: [...note.blocks, ...drafts.map((item) => item.block)].sort(comparePositions) };
    });
  }, [view, optimistic, adoptedSectionId]);

  // Drop drafts once the database has them.
  useEffect(() => {
    if (!view) return;
    const saved = new Set(view.entries.flatMap((entry) => entry.blocks.map((block) => block.id)));
    setOptimistic((previous) => {
      const next = previous.filter((item) => !saved.has(item.block.id));
      return next.length === previous.length ? previous : next;
    });
  }, [view]);

  const lines = useMemo<LineSlot[]>(
    () =>
      entries.flatMap((entry) => [
        ...entry.note.carried.map((block) => ({ block, entry, ownIndex: -1 })),
        ...entry.blocks.map((block, ownIndex) => ({ block, entry, ownIndex })),
      ]),
    [entries],
  );

  if (!view) return null;

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
      if (previous && previous.entry === lines[index].entry) {
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
  };

  const priorityIds = new Set(priorities.map((priority) => priority.task.id));
  const lineProps = { day, today, allowNewLines: isToday, handlers };
  // A past day only shows what it has; the empty first section is for writing today.
  const shown = isToday ? entries : entries.filter((entry) => entry.note.section || entry.note.carried.length > 0);

  function createFirstLine(entry: Entry, typed: string) {
    const target = newLineTarget(entry, positionBetween(entry.blocks.at(-1)?.position ?? null, null));
    const { kind, text } = detectKind(typed);
    showDraft(entry, target, kind, text);
    requestFocus(target.blockId!);
    write(() => createBlock(ctx, target, typed));
  }

  function addSection(kind: SectionKind) {
    write(() => createSection(ctx, kind).then((section) => requestFocus(`ghost:${section.id}`)));
  }

  return (
    <>
      {isToday && <PendingDaysBanner days={pendingDays} today={today} />}
      {isToday && <ReflectionBanner />}
      {isToday && <MonthlyReflectionBanner today={today} />}
      {isToday && <RemindersBanner reminders={reminders} />}
      <main className="page">
        {isToday && (
          <PrioritiesBlock
            priorities={priorities}
            today={today}
            onToggleDone={(taskId, done) => write(() => setTaskDone(ctx, taskId, done))}
            onDemote={(taskId) => write(() => setDayPriority(ctx, taskId, false))}
          />
        )}
        <div className="note">
          {shown.length === 0 && <p className="muted">Nada pendente neste dia.</p>}
          {shown.map((entry) => {
            const section = entry.note.section;
            const kind = section?.kind ?? 'general';
            return (
              <section
                key={entry.key}
                className={`section section--${kind} ${section?.projectId ? 'section--project' : ''}`}
                aria-label={kind === 'meeting' ? 'Seção de reunião' : 'Seção geral'}
              >
                <SectionHeader
                  section={section}
                  kind={kind}
                  projects={view.projects}
                  onSaveTitle={(title) => section && write(() => setSectionTitle(ctx, section.id, title))}
                  onLinkProject={(project) => section && write(() => linkSectionToProject(ctx, section.id, project.id))}
                  onCreateProject={(name) => section && write(() => convertSectionToProject(ctx, section.id, name))}
                />
                {section?.kind === 'meeting' && (
                  <MeetingDetails section={section} onSave={(details) => write(() => setSectionDetails(ctx, section.id, details))} />
                )}
                {entry.note.carried.map((block) => (
                  <BlockLine key={block.id} block={block} free={false} isPriority={priorityIds.has(block.id)} {...lineProps} />
                ))}
                {entry.blocks.map((block) => (
                  <BlockLine key={block.id} block={block} free={isFree(block)} isPriority={priorityIds.has(block.id)} {...lineProps} />
                ))}
                {isToday && entry.blocks.length === 0 && (
                  <GhostLine
                    id={`ghost:${section?.id ?? DAY_ENTRY}`}
                    placeholder="Escreva aqui. [] e espaço no começo da linha viram tarefa"
                    onCreate={(text) => createFirstLine(entry, text)}
                  />
                )}
              </section>
            );
          })}
        </div>
        {isToday && (
          <div className="note__actions">
            <button type="button" onClick={() => addSection('general')}>
              + Seção geral
            </button>
            <button type="button" onClick={() => addSection('meeting')}>
              + Seção de reunião
            </button>
          </div>
        )}
      </main>
    </>
  );
}
