import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

/**
 * Dragging a line or a part of the day note by its handle to reorder it. Pointer events instead
 * of the HTML drag and drop API, so it also works with a finger. Items only move inside their
 * group: the lines of one section, the tasks carried from other days, or the day's parts.
 */

export interface LineDrag {
  id: string;
  group: string;
  /** Insertion point among the group's lines, counted before the move (0 to length). */
  toIndex: number;
}

/** Where a line dropped at `y` goes, given the vertical middle of each line of the group. */
export function dropIndex(middles: readonly number[], y: number): number {
  const index = middles.findIndex((middle) => y < middle);
  return index === -1 ? middles.length : index;
}

/** Whether dropping at `toIndex` leaves the line where it was. */
export function isSamePlace(fromIndex: number, toIndex: number): boolean {
  return toIndex === fromIndex || toIndex === fromIndex + 1;
}

/** Items of a group, marked with `data-drag-group` and `data-drag-id` on their elements. */
function groupLines(group: string): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(`[data-drag-group="${CSS.escape(group)}"]`)];
}

/**
 * Ctrl + Shift + ↑/↓ (⌘ + Shift on a Mac) moves a whole part of the day note; Alt + ↑/↓ moves a
 * line. Returns the direction, or null for any other key.
 */
export function partMoveKey(event: {
  key: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}): 'up' | 'down' | null {
  if (!event.shiftKey || !(event.ctrlKey || event.metaKey) || event.altKey) return null;
  return event.key === 'ArrowUp' ? 'up' : event.key === 'ArrowDown' ? 'down' : null;
}

export function useLineDrag(onDrop: (group: string, id: string, toIndex: number) => void) {
  const [drag, setDrag] = useState<LineDrag | null>(null);
  const dropRef = useRef(onDrop);
  dropRef.current = onDrop;
  const cancelRef = useRef<(() => void) | null>(null);
  useEffect(() => () => cancelRef.current?.(), []);

  function start(event: ReactPointerEvent<HTMLElement>, group: string, id: string) {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget;
    const pointerId = event.pointerId;
    handle.setPointerCapture(pointerId);
    let toIndex = groupLines(group).findIndex((line) => line.dataset.dragId === id);
    setDrag({ id, group, toIndex });

    const middles = () =>
      groupLines(group).map((line) => {
        const rect = line.getBoundingClientRect();
        return rect.top + rect.height / 2;
      });
    const onMove = (move: PointerEvent) => {
      toIndex = dropIndex(middles(), move.clientY);
      setDrag({ id, group, toIndex });
    };
    const finish = (commit: boolean) => {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey);
      if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
      cancelRef.current = null;
      setDrag(null);
      if (commit) dropRef.current(group, id, toIndex);
    };
    const onUp = () => finish(true);
    const onCancel = () => finish(false);
    const onKey = (key: KeyboardEvent) => {
      if (key.key === 'Escape') finish(false);
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey);
    cancelRef.current = onCancel;
  }

  return { drag, start };
}

/** A key that writes or erases text, so the drag handles hide while I type. */
export function isTypingKey(event: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean }): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  return event.key.length === 1 || event.key === 'Backspace' || event.key === 'Delete' || event.key === 'Enter';
}
