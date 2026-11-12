import { shortcutLetter } from '../dayNote/blockSelection';

/** Ctrl + A (⌘ + A on the Mac), without other modifiers: focuses "Nova tarefa" on the project page. */
export function isNewTaskKey(event: { code: string; key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean }): boolean {
  return shortcutLetter(event) === 'a' && (event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey;
}

export const NEW_TASK_SHORTCUT = 'Ctrl + A';

/** Inside a text field Ctrl + A keeps selecting its text; the shortcut only works outside of one. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as Element | null;
  if (!element || typeof element.closest !== 'function') return false;
  return element.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]') !== null;
}
