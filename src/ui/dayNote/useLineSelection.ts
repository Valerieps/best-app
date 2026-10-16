import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type MouseEvent, type PointerEvent, type RefObject } from 'react';
import { extendSelection, isSelectAllKey, selectAll, selectionText, selectRange, shortcutLetter, type LineSelection } from './blockSelection';

/** Lines that can be selected together: the note's own lines, never the ghost line or the priorities. */
const LINE = '.line[data-drag-id]';

/** Places in a line where a press does something else than selecting text. */
const NOT_TEXT = '.line__handle, .line__check, button, input, a, select';

/**
 * Puts plain text on the clipboard. The browser's own copy command fills it through the `copy`
 * event, which needs no permission; the Clipboard API is the fallback, since it can be denied.
 */
function copyText(text: string) {
  const fill = (event: ClipboardEvent) => {
    event.clipboardData?.setData('text/plain', text);
    event.preventDefault();
  };
  document.addEventListener('copy', fill);
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  } finally {
    document.removeEventListener('copy', fill);
  }
  if (!copied) {
    void navigator.clipboard?.writeText(text).catch(() => {
      // Nothing to undo: the lines stay as they are.
    });
  }
}

interface Options {
  /** The note: it holds the lines and keeps the focus while lines are selected. */
  container: RefObject<HTMLElement | null>;
  /** Whether an id is one of the note's lines. */
  isLine(id: string): boolean;
  /** A line's text, for copying. */
  textOf(id: string): string;
  /** Delete or Backspace (and Ctrl + X, after copying) on the selected lines. */
  onDelete(ids: string[]): void;
  /** Leaving the selection with an arrow: the cursor goes back to a line. */
  onLeave(id: string, direction: 'up' | 'down'): void;
}

/**
 * Selecting whole lines (spec/nota-do-dia.md, "Selecionar várias linhas"): dragging from one line
 * into another, Shift + click, or Ctrl + A on a line whose text is all selected.
 */
export function useLineSelection({ container, isLine, textOf, onDelete, onLeave }: Options) {
  const [selection, setSelection] = useState<LineSelection | null>(null);
  const latest = useRef({ isLine, selection });
  latest.current = { isLine, selection };
  const stopDragging = useRef<(() => void) | null>(null);
  // Shift + click selected lines: the mouse press that follows must not put the cursor in a line.
  const swallowMouseDown = useRef(false);
  useEffect(() => () => stopDragging.current?.(), []);

  /** The lines shown, in order: in focus mode, only the focused part's. */
  function order(): string[] {
    const root = container.current;
    if (!root) return [];
    return [...root.querySelectorAll<HTMLElement>(LINE)].map((element) => element.dataset.dragId ?? '').filter((id) => latest.current.isLine(id));
  }

  /** The text fields give the focus to the note, which takes the keys while lines are selected. */
  function holdFocus() {
    const root = container.current;
    if (!root) return;
    if (document.activeElement !== root) root.focus({ preventScroll: true });
    window.getSelection()?.removeAllRanges();
  }

  function select(next: LineSelection | null) {
    setSelection(next);
    if (next) holdFocus();
  }

  function selectAllLines() {
    select(selectAll(order()));
  }

  function lineAt(target: EventTarget | null): string | null {
    const element = target instanceof Element ? target.closest<HTMLElement>(LINE) : null;
    const id = element?.dataset.dragId;
    return id && latest.current.isLine(id) ? id : null;
  }

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    swallowMouseDown.current = false;
    if (event.button !== 0) return;
    const target = event.target as Element;
    const id = lineAt(target);
    const onControl = target.closest(NOT_TEXT) !== null;
    // Shift + click on another line selects from the line being edited, or from the selection's start.
    if (event.shiftKey && id && !onControl) {
      const from = lineAt(document.activeElement) ?? latest.current.selection?.anchor ?? null;
      const range = from && from !== id ? selectRange(order(), from, id) : null;
      if (range) {
        event.preventDefault();
        swallowMouseDown.current = true;
        select(range);
        return;
      }
    }
    if (latest.current.selection) setSelection(null);
    if (!id || onControl) return;
    // A press inside a line selects its text as usual; once the pointer reaches another line, the lines are selected.
    stopDragging.current?.();
    let selecting = false;
    const move = (moveEvent: globalThis.PointerEvent) => {
      const over = lineAt(document.elementFromPoint(moveEvent.clientX, moveEvent.clientY));
      if (!over || (!selecting && over === id)) return;
      const range = selectRange(order(), id, over);
      if (!range) return;
      if (!selecting) {
        selecting = true;
        container.current?.classList.add('note--selecting');
      }
      select(range);
    };
    const stop = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', stop);
      document.removeEventListener('pointercancel', stop);
      container.current?.classList.remove('note--selecting');
      stopDragging.current = null;
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', stop);
    document.addEventListener('pointercancel', stop);
    stopDragging.current = stop;
  }

  /** Keys while lines are selected; the note itself has the focus then. */
  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    const current = latest.current.selection;
    if (!current || event.target !== event.currentTarget) return;
    const modifier = event.ctrlKey || event.metaKey;
    if (isSelectAllKey(event)) {
      event.preventDefault();
      selectAllLines();
    } else if (modifier && !event.altKey && (shortcutLetter(event) === 'c' || shortcutLetter(event) === 'x')) {
      event.preventDefault();
      copyText(selectionText(current.ids.map(textOf)));
      if (shortcutLetter(event) === 'x') {
        setSelection(null);
        onDelete(current.ids);
      }
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      setSelection(null);
      onDelete(current.ids);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setSelection(null);
    } else if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && !modifier && !event.altKey) {
      event.preventDefault();
      const direction = event.key === 'ArrowUp' ? 'up' : 'down';
      if (event.shiftKey) {
        select(extendSelection(order(), current, direction));
        return;
      }
      setSelection(null);
      onLeave(direction === 'up' ? current.ids[0] : current.ids[current.ids.length - 1], direction);
    } else if (event.key.length === 1 && !modifier && !event.altKey) {
      // Typing does not replace the lines: it only lets go of them.
      setSelection(null);
    }
  }

  /** Runs before the note's own mouse press handling; true when the press was already handled. */
  function onMouseDown(event: MouseEvent<HTMLElement>): boolean {
    if (!swallowMouseDown.current) return false;
    swallowMouseDown.current = false;
    event.preventDefault();
    return true;
  }

  /** The focus left the note (another screen, the sidebar): the lines are let go. */
  function onBlur(event: FocusEvent<HTMLElement>) {
    if (event.target === event.currentTarget && latest.current.selection) setSelection(null);
  }

  return { selection, selectAllLines, onPointerDown, onMouseDown, onKeyDown, onBlur };
}
