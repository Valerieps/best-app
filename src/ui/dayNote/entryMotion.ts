import { createContext, useEffect, useRef } from 'react';

/**
 * Lines and parts that appear while the note is on screen fade in (issue #120), instead of
 * showing all at once. The note's first render, a new day and entering or leaving focus mode
 * (whose transition is ADR-051's) show at once, and so does the line about to take the caret:
 * nothing fades while I type. The fade itself is CSS (`.line--entering`, `.day-part--entering`)
 * and is off with reduced motion.
 */

/** What the note showed at a render: `view` names the day and focus, `shown` whether its lines were up. */
export interface NoteShown {
  view: string;
  shown: boolean;
}

/** Whether the note was already on screen, showing the same view, before this render. */
export function isSettled(previous: NoteShown | null, current: NoteShown): boolean {
  return previous !== null && previous.shown && current.shown && previous.view === current.view;
}

/** Whether a line mounting now fades in: only once the note is settled, and never the line about to take the focus. */
export function entersWithMotion(settled: boolean, focusTarget: string | null, id: string): boolean {
  return settled && focusTarget !== id;
}

export interface Entries {
  seen: ReadonlySet<string>;
  entering: ReadonlySet<string>;
}

export const NO_ENTRIES: Entries = { seen: new Set(), entering: new Set() };

/**
 * The parts shown now (`keys`) that fade in: the ones new since the last render, once the note is
 * settled, plus the ones still entering, so their class does not drop on the next render. A new
 * view starts over, with nothing entering.
 */
export function nextEntries(previous: Entries, keys: readonly string[], settled: boolean): Entries {
  const entering = new Set<string>();
  for (const key of keys) {
    if (settled && (previous.entering.has(key) || !previous.seen.has(key))) entering.add(key);
  }
  return { seen: new Set(keys), entering };
}

/** Whether the note was on screen, with the same view, before this render. */
export function useNoteSettled(current: NoteShown): boolean {
  const last = useRef<NoteShown | null>(null);
  const settled = isSettled(last.current, current);
  useEffect(() => {
    last.current = current;
  });
  return settled;
}

/** The keys of the parts that fade in at this render. */
export function useEnteringKeys(keys: readonly string[], settled: boolean): ReadonlySet<string> {
  const last = useRef<Entries>(NO_ENTRIES);
  const next = nextEntries(last.current, keys, settled);
  useEffect(() => {
    last.current = next;
  });
  return next.entering;
}

/** Whether the day note around a line is settled; lines elsewhere never fade in. */
export const NoteSettledContext = createContext(false);
