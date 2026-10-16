/**
 * Selecting whole lines of the day note (spec/nota-do-dia.md, "Selecionar várias linhas"). Each
 * line is its own text field, so the browser's selection never crosses lines: dragging from one
 * line to another, Shift + click or a second Ctrl + A select the lines themselves instead.
 */

/** Lines selected, from the one where the selection started (`anchor`) to where it is now (`head`). */
export interface LineSelection {
  anchor: string;
  head: string;
  /** The selected line ids, in the order shown. */
  ids: string[];
}

/** The lines from `anchor` to `head`, in the order shown; null when either is not shown. */
export function selectRange(order: readonly string[], anchor: string, head: string): LineSelection | null {
  const from = order.indexOf(anchor);
  const to = order.indexOf(head);
  if (from === -1 || to === -1) return null;
  const [first, last] = from <= to ? [from, to] : [to, from];
  return { anchor, head, ids: order.slice(first, last + 1) };
}

/** Every line shown; null when there is none. */
export function selectAll(order: readonly string[]): LineSelection | null {
  if (order.length === 0) return null;
  return { anchor: order[0], head: order[order.length - 1], ids: [...order] };
}

/** Shift + ↑/↓ with lines selected: the head moves one line, the anchor stays. */
export function extendSelection(order: readonly string[], selection: LineSelection, direction: 'up' | 'down'): LineSelection {
  const at = order.indexOf(selection.head);
  if (at === -1) return selection;
  const next = order[Math.max(0, Math.min(order.length - 1, at + (direction === 'up' ? -1 : 1)))];
  return selectRange(order, selection.anchor, next) ?? selection;
}

/** Ctrl + A (⌘ + A on the Mac), without other modifiers. */
export function isSelectAllKey(event: { code: string; key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean }): boolean {
  return shortcutLetter(event) === 'a' && (event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey;
}

/** The letter of a shortcut: by the key's position, so it works on any layout, or by the key when the position is missing. */
export function shortcutLetter(event: { code: string; key: string }): string {
  const position = /^Key([A-Z])$/.exec(event.code);
  return position ? position[1].toLowerCase() : event.key.toLowerCase();
}

/**
 * Ctrl + A inside a line first selects the line's text, as usual; once the whole text is selected
 * (or the line is empty), it selects every line of the note.
 */
export function selectsAllLines(field: { value: string; selectionStart: number; selectionEnd: number }): boolean {
  return field.selectionStart === 0 && field.selectionEnd === field.value.length;
}

/** The text copied from the selected lines: one line of text per line, in the order shown. */
export function selectionText(texts: readonly string[]): string {
  return texts.join('\n');
}
