import { useEffect, useSyncExternalStore } from 'react';
let request = null;
const listeners = new Set();
export function requestFocus(id, caret = 'end') {
    request = { id, caret };
    listeners.forEach((listener) => listener());
}
function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
export function useFocusTarget(id, ref) {
    const pending = useSyncExternalStore(subscribe, () => request);
    useEffect(() => {
        const element = ref.current;
        if (!pending || pending.id !== id || !element)
            return;
        request = null;
        element.focus();
        const position = pending.caret === 'end' ? element.value.length : Math.min(pending.caret, element.value.length);
        element.setSelectionRange(position, position);
    }, [pending, id, ref]);
}
