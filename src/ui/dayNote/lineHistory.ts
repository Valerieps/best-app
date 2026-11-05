/**
 * Undo and redo for the text of one line (ADR-063). The text is controlled React state and
 * formats replace the whole value, which breaks the browser's own history, so the line keeps its
 * own: snapshots of the text and selection. Typing is grouped into steps; every other edit
 * (format, paste, mention, list exit) is a step of its own.
 */

export interface Snapshot {
  text: string;
  start: number;
  end: number;
}

export interface History {
  past: Snapshot[];
  future: Snapshot[];
  /** When the last typed edit happened; null when the next typing starts a new step. */
  typedAt: number | null;
}

/** Typing within this time of the last keystroke stays in the same undo step. */
export const TYPING_GROUP_MS = 1000;
export const MAX_STEPS = 200;

export const emptyHistory = (): History => ({ past: [], future: [], typedAt: null });

/** Records an edit: `before` is the line as it was just before it. */
export function recordEdit(history: History, before: Snapshot, kind: 'typing' | 'step', now: number): History {
  const grouped = kind === 'typing' && history.typedAt !== null && now - history.typedAt <= TYPING_GROUP_MS && history.past.length > 0;
  const past = grouped ? history.past : [...history.past, before].slice(-MAX_STEPS);
  return { past, future: [], typedAt: kind === 'typing' ? now : null };
}

export function undo(history: History, current: Snapshot): { history: History; snapshot: Snapshot } | null {
  const snapshot = history.past[history.past.length - 1];
  if (!snapshot) return null;
  return { snapshot, history: { past: history.past.slice(0, -1), future: [current, ...history.future], typedAt: null } };
}

export function redo(history: History, current: Snapshot): { history: History; snapshot: Snapshot } | null {
  const [snapshot, ...future] = history.future;
  if (!snapshot) return null;
  return { snapshot, history: { past: [...history.past, current], future, typedAt: null } };
}
