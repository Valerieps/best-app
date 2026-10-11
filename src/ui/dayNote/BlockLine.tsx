import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { detectKind } from '../../domain/blockKind';
import type { DayKey } from '../../domain/day';
import type { Block } from '../../domain/entities';
import { relativeDay } from '../format';
import { useFocusTarget } from './focus';

/** Wait after the last keystroke before saving the text. */
const SAVE_DELAY_MS = 400;

export interface LineHandlers {
  onSaveText(block: Block, text: string): void;
  onEnter(block: Block, text: string, caret: number): void;
  onBackspaceAtStart(block: Block, text: string): void;
  onMakeTask(block: Block, text: string): void;
  onToggleDone(block: Block, done: boolean): void;
  onArrow(block: Block, direction: 'up' | 'down'): void;
  onSetDate(block: Block, date: DayKey | null): void;
  onSetDeadline(block: Block, date: DayKey | null): void;
  onTogglePriority(block: Block, on: boolean): void;
}

interface Props {
  block: Block;
  /** Whether the line can be deleted or change kind (written today, not triaged). */
  free: boolean;
  /** The day this note shows; dates equal to it are not repeated on the line. */
  day: DayKey;
  today: DayKey;
  isPriority: boolean;
  /** False when looking at a past day: Enter does not create lines there. */
  allowNewLines: boolean;
  handlers: LineHandlers;
}

/** A hidden date field opened by a shortcut button. */
function DatePicker({
  label,
  value,
  min,
  onChange,
  children,
}: {
  label: string;
  value: DayKey | null;
  min?: DayKey;
  onChange(date: DayKey | null): void;
  children: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <span className="line__picker">
      <button
        type="button"
        className="line__action"
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
    </span>
  );
}

export function BlockLine({ block, free, day, today, isPriority, allowNewLines, handlers }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState(block.text);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ block, text, handlers });
  latest.current = { block, text, handlers };

  useFocusTarget(block.id, ref);

  // Follow changes made elsewhere (another tab, a merge) unless there are unsaved local edits.
  const synced = useRef(block.text);
  useEffect(() => {
    setText((current) => (current === synced.current ? block.text : current));
    synced.current = block.text;
  }, [block.text]);

  const flush = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    const { block: current, text: value, handlers: h } = latest.current;
    if (value !== current.text) h.onSaveText(current, value);
  };

  // Save what is pending when the line goes away.
  useEffect(() => flush, []);

  function onChange(value: string) {
    if (block.kind === 'note' && free) {
      const detected = detectKind(value);
      if (detected.kind === 'task') {
        setText(detected.text);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        handlers.onMakeTask(block, detected.text);
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
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (!allowNewLines) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const caret = element.selectionStart;
      const value = element.value;
      // The rest of the line moves to the new line right away; the split is saved after.
      setText(value.slice(0, caret));
      latest.current.text = value.slice(0, caret);
      handlers.onEnter(block, value, caret);
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
  const active = isTask && block.status === 'active';
  const deadline = block.deadline ?? null;
  const showDate = isTask && block.intendedDate !== null && block.intendedDate !== day;

  return (
    <div className={`line line--${block.kind} ${done ? 'line--done' : ''}`}>
      {isTask && (
        <input
          type="checkbox"
          className="line__check"
          checked={done}
          onChange={(event) => handlers.onToggleDone(block, event.target.checked)}
          aria-label={done ? 'Reabrir tarefa' : 'Finalizar tarefa'}
        />
      )}
      <textarea
        ref={ref}
        className="line__text"
        rows={1}
        value={text}
        spellCheck
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={flush}
        aria-label={isTask ? 'Tarefa' : 'Nota'}
      />
      <span className="line__meta">
        {isPriority && <span className="line__star" title="Prioridade do dia">★</span>}
        {showDate && <span className="muted">{relativeDay(block.intendedDate!, today)}</span>}
        {deadline && <span className="chip chip--muted">prazo {relativeDay(deadline, today)}</span>}
      </span>
      <span className="line__actions">
        {active && (
          <>
            <button type="button" className="line__action" title="Finalizar" aria-label="Finalizar" onClick={() => handlers.onToggleDone(block, true)}>
              ✓
            </button>
            <DatePicker label="Data de intenção" value={block.intendedDate} min={today} onChange={(date) => handlers.onSetDate(block, date)}>
              Data
            </DatePicker>
            <DatePicker label="Prazo máximo" value={deadline} onChange={(date) => handlers.onSetDeadline(block, date)}>
              Prazo
            </DatePicker>
            <button
              type="button"
              className={`line__action ${isPriority ? 'line__action--on' : ''}`}
              title={isPriority ? 'Tirar das prioridades do dia' : 'Promover a prioridade do dia'}
              aria-label={isPriority ? 'Tirar das prioridades do dia' : 'Promover a prioridade do dia'}
              aria-pressed={isPriority}
              onClick={() => handlers.onTogglePriority(block, !isPriority)}
            >
              ★
            </button>
          </>
        )}
        {block.kind === 'note' && free && (
          <button type="button" className="line__action" onClick={() => handlers.onMakeTask(block, text)}>
            Converter em tarefa
          </button>
        )}
      </span>
    </div>
  );
}

interface GhostProps {
  id: string;
  placeholder: string;
  /** Called on the first keystroke; the new line replaces this one right away and takes the focus. */
  onCreate(text: string): void;
}

/** Empty line of a section with no blocks: typing in it creates the first block. */
export function GhostLine({ id, placeholder, onCreate }: GhostProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useFocusTarget(id, ref);
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
        aria-label="Nova linha"
      />
    </div>
  );
}
