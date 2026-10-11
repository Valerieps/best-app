import { useEffect, useSyncExternalStore, type RefObject } from 'react';

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

export function useFocusTarget(id: string, ref: RefObject<HTMLTextAreaElement | HTMLInputElement | null>): void {
  const pending = useSyncExternalStore(subscribe, () => request);
  useEffect(() => {
    const element = ref.current;
    if (!pending || pending.id !== id || !element) return;
    request = null;
    element.focus();
    const position = pending.caret === 'end' ? element.value.length : Math.min(pending.caret, element.value.length);
    element.setSelectionRange(position, position);
  }, [pending, id, ref]);
}
