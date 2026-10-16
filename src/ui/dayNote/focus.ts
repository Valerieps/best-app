import { useEffect, useRef, useSyncExternalStore, type RefObject } from 'react';

/**
 * Moves the caret to a line that may not exist yet: after Enter creates a block, the new line
 * only appears once the database answers, and it takes the focus when it mounts.
 */

type Caret = number | 'end';

let request: { id: string; caret: Caret } | null = null;
const listeners = new Set<() => void>();

export function requestFocus(id: string, caret: Caret = 'end'): void {
  request = { id, caret };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Where the caret lands in a field of `length` that leaves out the line's first `offset` characters. */
export function caretInField(caret: Caret, length: number, offset = 0): number {
  if (caret === 'end') return length;
  return Math.max(0, Math.min(caret - offset, length));
}

/**
 * Takes the focus when asked. `offset` is how much of the line the field leaves out at its start
 * (a list item's marker), since carets are counted on the whole line.
 */
export function useFocusTarget(
  id: string,
  ref: RefObject<HTMLTextAreaElement | HTMLInputElement | null>,
  offset: () => number = () => 0,
): void {
  const pending = useSyncExternalStore(subscribe, () => request);
  const offsetRef = useRef(offset);
  offsetRef.current = offset;
  useEffect(() => {
    const element = ref.current;
    if (!pending || pending.id !== id || !element) return;
    request = null;
    element.focus();
    const position = caretInField(pending.caret, element.value.length, offsetRef.current());
    element.setSelectionRange(position, position);
  }, [pending, id, ref]);
}
