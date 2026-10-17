import { describe, expect, it } from 'vitest';
import { dropAwaitingReflection, keepDeferredNotes } from './reviewsRemoved';

describe('dropAwaitingReflection', () => {
  it('takes the flag off a task left for the Revisão de Foco', () => {
    expect(dropAwaitingReflection({ id: 't1', intendedDate: null, awaitingReflection: true })).toEqual({ id: 't1', intendedDate: null });
  });

  it('returns other rows as they are', () => {
    const row = { id: 't2', intendedDate: '2026-10-17' };
    expect(dropAwaitingReflection(row)).toBe(row);
  });
});

describe('keepDeferredNotes', () => {
  it('keeps the notes left for the Revisão de Foco', () => {
    expect(keepDeferredNotes({ id: 's1', notesDestination: 'weeklyReflection' })).toEqual({ id: 's1', notesDestination: 'wiki' });
  });

  it('returns other sections as they are', () => {
    const pending = { id: 's2', notesDestination: 'pending' };
    expect(keepDeferredNotes(pending)).toBe(pending);
  });
});
