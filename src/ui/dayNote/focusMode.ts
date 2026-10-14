/**
 * Focus mode on one part of the day note (spec/nota-do-dia.md, "Modo foco"). Ctrl + Shift + Enter
 * (⌘ + Shift + Enter on the Mac), with the cursor anywhere in a part, enters and leaves it.
 */
export function isFocusToggleKey(event: {
  key: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}): boolean {
  return event.key === 'Enter' && event.shiftKey && (event.ctrlKey || event.metaKey) && !event.altKey;
}

export const FOCUS_SHORTCUT = 'Ctrl + Shift + Enter';
