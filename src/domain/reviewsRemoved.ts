/**
 * Version 10: the Revisão de Foco and the Revisão de Rumo were removed (ADR-060). What was left
 * for the Revisão de Foco goes back to where it would be without it. Both work on stored rows,
 * as read from an old database or backup, and return the row itself when nothing changes.
 */

/** A task left for the review loses the flag: it is a task without a date again. */
export function dropAwaitingReflection<T extends object>(row: T): T {
  if (!('awaitingReflection' in row)) return row;
  const { awaitingReflection: _dropped, ...rest } = row as T & { awaitingReflection?: unknown };
  return rest as T;
}

/** Notes left for the review are kept, as notes are when a day closes. */
export function keepDeferredNotes<T extends { notesDestination?: unknown }>(row: T): T {
  return row.notesDestination === 'weeklyReflection' ? { ...row, notesDestination: 'wiki' } : row;
}
