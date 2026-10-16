/**
 * Promoting a task to day priority, and back, from the keyboard (spec/nota-do-dia.md, "Seções e
 * atalhos"): Alt + S (Option + S on the Mac), reachable with the left hand alone. Matched on the
 * physical key, since Option + S types "ß" on the Mac.
 */
export function isPriorityKey(event: { code: string; altKey: boolean; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }): boolean {
  return event.code === 'KeyS' && event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
}

export const PRIORITY_SHORTCUT = 'Alt + S';
