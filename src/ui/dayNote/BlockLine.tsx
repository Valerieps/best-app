import { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import { detectKind } from '../../domain/blockKind';
import type { DayKey } from '../../domain/day';
import type { Block } from '../../domain/entities';
import { completeMention, mentionAt, personOptions, unknownNames, type PersonOption } from '../../domain/people';
import { relativeDay } from '../format';
import { usePeople } from '../people/PeopleContext';
import { useSaveOnPageLeave } from '../pageLeave';
import { rememberUnsavedLine } from '../unsavedLines';
import { pendingFocusId, useFocusTarget } from './focus';
import { entersWithMotion, NoteSettledContext } from './entryMotion';
import { partMoveKey } from './lineDrag';
import { isSelectAllKey, selectsAllLines } from './blockSelection';
import { isPriorityKey, PRIORITY_SHORTCUT } from './priorityShortcut';
import {
  applyFormat,
  FORMAT_EVENT,
  formatShortcut,
  hasMarkdown,
  listOnEnter,
  listPrefixLength,
  normalizeBullet,
  parseLine,
  type FormatCommand,
  type LineEdit,
} from './markdown';
import { ListMarker, MarkdownText } from './MarkdownText';

/** Wait after the last keystroke before saving the text. */
const SAVE_DELAY_MS = 400;

export interface LineHandlers {
  onSaveText(block: Block, text: string): void;
  /** Splits the line at `caret`; the new line takes the focus at `newCaret` (0 by default). */
  onEnter(block: Block, text: string, caret: number, newCaret?: number): void;
  onBackspaceAtStart(block: Block, text: string): void;
  /** `waiting` when the line started with "[a] ": something a person owes me (spec/pessoas.md). */
  onMakeTask(block: Block, text: string, waiting?: boolean): void;
  /** Marks a task as something a person owes me, or back as mine. Absent hides the action. */
  onSetWaiting?(block: Block, waiting: boolean): void;
  /** Creates the people the line cites who do not exist yet (spec/pessoas.md). */
  onEnsurePeople?(names: string[]): void;
  onToggleDone(block: Block, done: boolean): void;
  onArrow(block: Block, direction: 'up' | 'down'): void;
  onSetDate(block: Block, date: DayKey | null): void;
  onSetDeadline(block: Block, date: DayKey | null): void;
  onTogglePriority(block: Block, on: boolean): void;
  /** Alt + ↑/↓: moves the line inside its group (request 2). Absent where lines keep their order. */
  onMove?(block: Block, direction: 'up' | 'down'): void;
  /** Ctrl + A with the line's whole text already selected: selects every line. Absent where lines are not selectable. */
  onSelectAll?(block: Block): void;
}

/** Reordering by dragging the line's handle (request 2). */
export interface LineDragProps {
  /** The lines that can trade places: one section's own lines, or the carried tasks. */
  group: string;
  onStart(event: PointerEvent<HTMLElement>): void;
  dragging: boolean;
  /** Where the dragged line would land, drawn as a bar above or below this line. */
  mark: 'before' | 'after' | null;
}

interface Props {
  block: Block;
  /** Whether the line can be deleted or change kind (written today, not triaged). */
  free: boolean;
  /**
   * The day this note shows; dates equal to it are not repeated on the line. Null outside a
   * day note (the project page), where every date shows.
   */
  day: DayKey | null;
  today: DayKey;
  isPriority: boolean;
  /** False when looking at a past day: Enter does not create lines there. */
  allowNewLines: boolean;
  handlers: LineHandlers;
  /** More metadata before the dates, like "adiada 3×" on the project page. */
  extraMeta?: ReactNode;
  /** The intended date is shown elsewhere, like the project agenda's date block: no chip, only the hover shortcut. */
  hideDate?: boolean;
  drag?: LineDragProps;
  /** Part of the lines selected together (spec/nota-do-dia.md, "Selecionar várias linhas"). */
  selected?: boolean;
  /** The line stays a note: "[] " does not make it a task (a kept note on a project page). */
  notesOnly?: boolean;
}

/** Hint on an empty line, shown only while the line is being written (P3 in the UX review of 2026-10-12, issue #19). */
export const NOTE_HINT = 'Escreva, ou comece com [] e espaço para criar uma tarefa';

/** A hidden date field opened by a button: a shortcut, or the chip of a date already set. */
export function DatePicker({
  label,
  value,
  min,
  onChange,
  className,
  children,
  clearLabel,
}: {
  label: string;
  value: DayKey | null;
  min?: DayKey;
  onChange(date: DayKey | null): void;
  className: string;
  children: string;
  /** With a date set, shows a × that clears it, instead of relying on the calendar's own button (issue #70). */
  clearLabel?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <span className="line__picker">
      <button
        type="button"
        className={className}
        title={label}
        aria-label={label}
        onClick={() => {
          const input = ref.current;
          if (!input) return;
          if (typeof input.showPicker === 'function') input.showPicker();
          else input.focus();
        }}
      >
        {children}
      </button>
      <input
        ref={ref}
        type="date"
        className="line__date-input"
        tabIndex={-1}
        aria-hidden="true"
        min={min}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
      />
      {clearLabel && value && (
        <button type="button" className="line__clear line__reveal" title={clearLabel} aria-label={clearLabel} onClick={() => onChange(null)}>
          ×
        </button>
      )}
    </span>
  );
}

export function BlockLine({ block, free, day, today, isPriority, allowNewLines, handlers, extraMeta, hideDate = false, drag, selected = false, notesOnly = false }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState(block.text);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ block, text, handlers });
  latest.current = { block, text, handlers };
  // While the line is not being edited, its Markdown shows formatted.
  const [editing, setEditing] = useState(false);
  // A line that appears while the note is on screen fades in, unless it is about to take the caret.
  const settled = useContext(NoteSettledContext);
  const [entering] = useState(() => entersWithMotion(settled, pendingFocusId(), block.id));
  // The selection to restore once a formatted text renders.
  const selectionAfter = useRef<[number, number] | null>(null);
  // The `@` suggestions follow the caret; Escape closes them for the mention being typed.
  const people = usePeople();
  const [caret, setCaret] = useState<number | null>(null);
  const [highlight, setHighlight] = useState(0);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  // The text when the line got the focus: leaving it creates only the people cited since then.
  const textAtFocus = useRef(block.text);

  // A list item's marker is drawn beside the field, which holds only the text after it. Carets and
  // selections handed around are counted on the whole line, so they move by this offset.
  const prefixOf = () => listPrefixLength(latest.current.text);
  useFocusTarget(block.id, ref, prefixOf);

  /** The line's whole text and selection, from the field that holds only the text after a list marker. */
  function readEdit(element: HTMLTextAreaElement): LineEdit {
    const prefix = latest.current.text.slice(0, prefixOf());
    return { text: prefix + element.value, start: element.selectionStart + prefix.length, end: element.selectionEnd + prefix.length };
  }

  // Follow changes made elsewhere (another tab, a merge) unless there are unsaved local edits.
  const synced = useRef(block.text);
  useEffect(() => {
    setText((current) => (current === synced.current ? block.text : current));
    synced.current = block.text;
  }, [block.text]);

  // Reads only refs, so one function serves every render.
  const flush = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    const { block: current, text: value, handlers: h } = latest.current;
    if (value !== current.text) h.onSaveText(current, value);
  }, []);

  // Save what is pending when the line goes away.
  useEffect(() => flush, [flush]);
  // The tab may be about to close: the save may not finish in time, so the text is also kept
  // aside, to be put back at the next start (`unsavedLines.ts`).
  const keepAndFlush = useCallback(() => {
    const { block: current, text: value } = latest.current;
    if (value !== current.text) rememberUnsavedLine(current.id, value, current.updatedAt);
    flush();
  }, [flush]);
  useSaveOnPageLeave(keepAndFlush);

  // Formatting from the toolbar or a shortcut: the new text is saved like typing.
  const format = useCallback(
    (command: FormatCommand) => {
      const element = ref.current;
      if (!element) return;
      const edit = readEdit(element);
      const next = applyFormat(command, edit);
      if (next.text === edit.text && next.start === edit.start && next.end === edit.end) return;
      setText(next.text);
      latest.current.text = next.text;
      selectionAfter.current = [next.start, next.end];
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush],
  );
  useLayoutEffect(() => {
    const element = ref.current;
    const selection = selectionAfter.current;
    if (!element || !selection) return;
    selectionAfter.current = null;
    const offset = listPrefixLength(text);
    element.setSelectionRange(Math.max(0, selection[0] - offset), Math.max(0, selection[1] - offset));
  }, [text]);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const listener = (event: Event) => format((event as CustomEvent<FormatCommand>).detail);
    element.addEventListener(FORMAT_EVENT, listener);
    return () => element.removeEventListener(FORMAT_EVENT, listener);
  }, [format]);

  const mention = editing && caret !== null ? mentionAt(text, caret) : null;
  const options: PersonOption[] = mention && mention.start !== dismissedAt ? personOptions(mention.query, people) : [];
  const active = Math.min(highlight, Math.max(options.length - 1, 0));

  function chooseOption(option: PersonOption) {
    if (!mention) return;
    const name = option.type === 'person' ? option.person.name : option.name;
    const next = completeMention(text, mention, name);
    setText(next.text);
    latest.current.text = next.text;
    selectionAfter.current = [next.caret, next.caret];
    setCaret(next.caret);
    if (option.type === 'create') handlers.onEnsurePeople?.([name]);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, SAVE_DELAY_MS);
  }

  /** Leaving the line without choosing anyone creates the people typed there (spec/pessoas.md). */
  function createTypedPeople() {
    const before = new Set(unknownNames(textAtFocus.current, people));
    const names = unknownNames(latest.current.text, people).filter((name) => !before.has(name));
    if (names.length > 0) handlers.onEnsurePeople?.(names);
  }

  function onChange(field: HTMLTextAreaElement) {
    const before = listPrefixLength(text);
    // Typing `- ` or `* ` at the start makes a list item right away: the marker moves out of the field.
    const value = normalizeBullet(text.slice(0, before) + field.value);
    if (listPrefixLength(value) !== before) {
      const caret = field.selectionStart + before;
      selectionAfter.current = [caret, caret];
    }
    if (block.kind === 'note' && free && !notesOnly) {
      const detected = detectKind(value);
      if (detected.kind === 'task') {
        setText(detected.text);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        handlers.onMakeTask(block, detected.text, detected.waiting);
        return;
      }
    }
    // "[a] " at the start of one of my tasks makes it something a person owes me.
    if (block.kind === 'task' && block.status === 'active' && !block.waiting && handlers.onSetWaiting) {
      const detected = detectKind(value);
      if (detected.waiting) {
        setText(detected.text);
        latest.current.text = detected.text;
        handlers.onSetWaiting(block, true);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(flush, SAVE_DELAY_MS);
        return;
      }
    }
    setText(value);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, SAVE_DELAY_MS);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const element = event.currentTarget;
    const atStart = element.selectionStart === 0 && element.selectionEnd === 0;
    const atEnd = element.selectionStart === element.value.length;
    const edit = readEdit(element);
    const list = parseLine(edit.text).list;
    // Moving the whole section is handled by the section around the line.
    if (partMoveKey(event)) return;
    if (options.length > 0 && !event.nativeEvent.isComposing) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setHighlight((active + step + options.length) % options.length);
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        chooseOption(options[active]);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setDismissedAt(mention?.start ?? null);
        return;
      }
    }
    if (isSelectAllKey(event) && handlers.onSelectAll && selectsAllLines(element)) {
      event.preventDefault();
      handlers.onSelectAll(block);
      return;
    }
    const command = event.nativeEvent.isComposing ? null : formatShortcut(event);
    // Tab only indents a list item; elsewhere it still moves the focus.
    if (command && (event.key !== 'Tab' || list)) {
      event.preventDefault();
      format(command);
      return;
    }
    if (isPriorityKey(event)) {
      event.preventDefault();
      if (block.kind === 'task' && block.status === 'active' && !block.waiting) handlers.onTogglePriority(block, !isPriority);
      return;
    }
    if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown') && handlers.onMove) {
      event.preventDefault();
      handlers.onMove(block, event.key === 'ArrowUp' ? 'up' : 'down');
    } else if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (!allowNewLines) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const caret = edit.start;
      let value = edit.text;
      // In a list, the new line continues it; Enter on an empty item leaves the list instead.
      const next = edit.end === caret ? listOnEnter(value, caret) : null;
      if (next?.type === 'exit') {
        setText(next.text);
        latest.current.text = next.text;
        flush();
        return;
      }
      if (next?.type === 'continue') value = value.slice(0, caret) + next.prefix + value.slice(caret);
      // The rest of the line moves to the new line right away; the split is saved after.
      setText(value.slice(0, caret));
      latest.current.text = value.slice(0, caret);
      handlers.onEnter(block, value, caret, next?.type === 'continue' ? next.prefix.length : 0);
    } else if (event.key === 'Backspace' && atStart && list) {
      // Backspace right after the marker takes the line out of the list, like a text editor.
      event.preventDefault();
      format(list.kind);
    } else if (event.key === 'Backspace' && atStart && free) {
      event.preventDefault();
      if (saveTimer.current) clearTimeout(saveTimer.current);
      // The line is merged or deleted; its text travels with the handler, nothing to save here.
      latest.current.text = latest.current.block.text;
      handlers.onBackspaceAtStart(block, element.value);
    } else if (event.key === 'ArrowUp' && atStart) {
      event.preventDefault();
      handlers.onArrow(block, 'up');
    } else if (event.key === 'ArrowDown' && atEnd) {
      event.preventDefault();
      handlers.onArrow(block, 'down');
    }
  }

  const isTask = block.kind === 'task';
  const done = isTask && block.status === 'done';
  const open = isTask && block.status === 'active';
  // Something a person owes me: its date is the day to follow up (spec/pessoas.md).
  const waiting = isTask && block.waiting === true;
  const deadline = block.deadline ?? null;
  const showDate = isTask && !hideDate && block.intendedDate !== null && block.intendedDate !== day;
  const dateLabel = showDate ? `${waiting ? 'cobrar ' : ''}${relativeDay(block.intendedDate!, today)}` : '';
  const deadlineLabel = deadline ? `prazo ${relativeDay(deadline, today)}` : '';
  const pickDate = (label: string, className: string, children: string, clearLabel?: string) => (
    <DatePicker
      label={label}
      className={className}
      value={block.intendedDate}
      min={today}
      onChange={(date) => handlers.onSetDate(block, date)}
      clearLabel={clearLabel}
    >
      {children}
    </DatePicker>
  );
  const pickDeadline = (label: string, className: string, children: string, clearLabel?: string) => (
    <DatePicker label={label} className={className} value={deadline} onChange={(date) => handlers.onSetDeadline(block, date)} clearLabel={clearLabel}>
      {children}
    </DatePicker>
  );
  const priorityLabel = `${isPriority ? 'Tirar das prioridades do dia' : 'Promover a prioridade do dia'} (${PRIORITY_SHORTCUT})`;
  const starButton = () => (
    <button
      type="button"
      className={`line__star ${isPriority ? 'line__star--on' : ''}`}
      title={priorityLabel}
      aria-label={priorityLabel}
      aria-pressed={isPriority}
      onClick={() => handlers.onTogglePriority(block, !isPriority)}
    >
      {isPriority ? '★' : '☆'}
    </button>
  );
  const convertible = block.kind === 'note' && free && !notesOnly;
  const hasActions = open || convertible;

  const structure = parseLine(text);
  const prefixLength = structure.list ? structure.prefixLength : 0;
  const headingClass = structure.heading ? `line--h${structure.heading}` : '';
  const preview = !editing && hasMarkdown(text);

  /** A click on the formatted text edits the line, unless it lands on a link, which opens. */
  function editFromPreview(event: MouseEvent<HTMLElement>) {
    if (event.button !== 0 || (event.target as HTMLElement).closest('a')) return;
    event.preventDefault();
    const element = ref.current;
    if (!element) return;
    element.focus();
    element.setSelectionRange(element.value.length, element.value.length);
  }

  /** The text takes only its own width: a click on the empty row beside it edits the line too. */
  function editFromRow(event: MouseEvent<HTMLElement>) {
    if (event.target !== event.currentTarget) return;
    editFromPreview(event);
  }

  const dragClasses = drag ? `${drag.dragging ? 'line--dragging' : ''} ${drag.mark ? `line--drop-${drag.mark}` : ''}` : '';

  return (
    <div
      className={`line line--${block.kind} ${done ? 'line--done' : ''} ${headingClass} ${preview ? 'line--preview' : ''} ${selected ? 'line--selected' : ''} ${entering ? 'line--entering' : ''} ${dragClasses}`}
      data-drag-group={drag?.group}
      data-drag-id={block.id}
      onMouseDown={editFromRow}
    >
      {drag && (
        <span className="line__handle" title="Arraste para mudar a ordem (ou Alt + ↑/↓)" aria-hidden="true" onPointerDown={drag.onStart}>
          ⠿
        </span>
      )}
      {isTask && (
        <input
          type="checkbox"
          className="line__check"
          checked={done}
          onChange={(event) => handlers.onToggleDone(block, event.target.checked)}
          aria-label={done ? 'Reabrir tarefa' : 'Finalizar tarefa'}
        />
      )}
      {/* Always wrapped, so the field is never rebuilt (and never loses the focus) when the line becomes a list item. */}
      <div className="line__field">
        {structure.list && !preview && <ListMarker list={structure.list} />}
        <textarea
          ref={ref}
          className="line__text"
          rows={1}
          value={text.slice(prefixLength)}
          spellCheck
          onChange={(event) => {
            setCaret(event.target.selectionStart + prefixLength);
            setHighlight(0);
            onChange(event.target);
          }}
          onKeyDown={onKeyDown}
          onSelect={(event) => setCaret(event.currentTarget.selectionStart + prefixLength)}
          onFocus={(event) => {
            setEditing(true);
            setCaret(event.currentTarget.selectionStart + prefixLength);
            textAtFocus.current = latest.current.text;
          }}
          onBlur={() => {
            setEditing(false);
            setDismissedAt(null);
            flush();
            createTypedPeople();
          }}
          placeholder={block.kind === 'note' && free && !notesOnly && allowNewLines && !structure.list ? NOTE_HINT : undefined}
          aria-label={isTask ? 'Tarefa' : 'Nota'}
          aria-expanded={options.length > 0}
          aria-autocomplete="list"
        />
      </div>
      {options.length > 0 && (
        <ul className="suggestions line__suggestions" role="listbox" aria-label="Pessoas">
          {options.map((option, index) => (
            <li
              key={option.type === 'person' ? option.person.id : 'create'}
              role="option"
              aria-selected={index === active}
              className={`suggestions__item ${index === active ? 'suggestions__item--active' : ''}`}
              onMouseDown={(event) => {
                // Keeps the focus in the line, so the choice lands where I was typing.
                event.preventDefault();
                chooseOption(option);
              }}
            >
              {option.type === 'person' ? `@${option.person.name}` : <>Criar a pessoa “{option.name}”</>}
            </li>
          ))}
        </ul>
      )}
      {preview && (
        <div className="line__rendered" onMouseDown={editFromPreview} aria-hidden="true">
          <MarkdownText text={text} />
        </div>
      )}
      {/* Dates already set are chips; an active task's chip changes the date. */}
      <span className="line__meta">
        {extraMeta}
        {waiting && <span className="chip chip--waiting">aguardando</span>}
        {showDate &&
          (open
            ? waiting
              ? pickDate('Mudar a data para cobrar', 'line__chip', dateLabel, 'Tirar a data para cobrar')
              : pickDate('Mudar a data de intenção', 'line__chip', dateLabel, 'Tirar a data de intenção')
            : <span className="muted">{dateLabel}</span>)}
        {deadline &&
          (open ? pickDeadline('Mudar o prazo máximo', 'line__chip', deadlineLabel, 'Tirar o prazo máximo') : <span className="chip chip--muted">{deadlineLabel}</span>)}
      </span>
      {open && !waiting && isPriority && starButton()}
      {/* Shortcuts on hover and focus, right after the text. They float over what follows instead of
          taking room, so showing them never rewraps the text. The checkbox finalizes, so there is no
          separate button for it. */}
      {hasActions && (
        <span className="line__tail">
          <span className="line__actions">
            {open && !waiting && !isPriority && starButton()}
            {open && !showDate && (waiting
              ? pickDate('Data para cobrar', 'line__action', 'Cobrar')
              : pickDate(hideDate ? 'Mudar a data de intenção' : 'Data de intenção', 'line__action', 'Data'))}
            {open && !waiting && !deadline && pickDeadline('Prazo máximo', 'line__action', 'Prazo')}
            {open && handlers.onSetWaiting && (
              <button
                type="button"
                className="line__action"
                title={waiting ? 'Voltar a ser uma tarefa minha' : 'Marcar como algo que alguém me deve'}
                onClick={() => handlers.onSetWaiting?.(block, !waiting)}
              >
                {waiting ? 'Não é aguardando' : 'Aguardando'}
              </button>
            )}
            {convertible && (
              <button type="button" className="line__action" onClick={() => handlers.onMakeTask(block, text)}>
                Converter em tarefa
              </button>
            )}
          </span>
        </span>
      )}
    </div>
  );
}

interface GhostProps {
  id: string;
  placeholder: string;
  /**
   * Called on the first keystroke, or on formatting the empty line; the new line replaces this one
   * right away and takes the focus, at `caret` when given.
   */
  onCreate(text: string, caret?: number): void;
  /** Called when the focus leaves the line before anything was typed. */
  onLeave?(): void;
}

/**
 * Empty line that is not saved yet: the first line of a section with no blocks, or a new line
 * at the end of a section. Typing in it creates the block.
 */
export function GhostLine({ id, placeholder, onCreate, onLeave }: GhostProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useFocusTarget(id, ref);
  const latestCreate = useRef(onCreate);
  latestCreate.current = onCreate;
  function formatEmpty(command: FormatCommand) {
    const next = applyFormat(command, { text: '', start: 0, end: 0 });
    if (next.text) latestCreate.current(next.text, next.end);
  }
  // Formatting the empty line, like choosing a heading before writing, creates it already formatted.
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const listener = (event: Event) => formatEmpty((event as CustomEvent<FormatCommand>).detail);
    element.addEventListener(FORMAT_EVENT, listener);
    return () => element.removeEventListener(FORMAT_EVENT, listener);
  }, []);
  return (
    <div className="line line--ghost">
      <textarea
        ref={ref}
        className="line__text"
        rows={1}
        value=""
        placeholder={placeholder}
        onChange={(event) => {
          if (event.target.value) onCreate(event.target.value);
        }}
        onKeyDown={(event) => {
          const command = event.nativeEvent.isComposing ? null : formatShortcut(event);
          if (!command || event.key === 'Tab') return;
          event.preventDefault();
          formatEmpty(command);
        }}
        onBlur={onLeave}
        aria-label="Nova linha"
      />
    </div>
  );
}
