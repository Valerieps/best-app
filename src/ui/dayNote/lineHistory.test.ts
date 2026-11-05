import { describe, expect, it } from 'vitest';
import { emptyHistory, recordEdit, redo, TYPING_GROUP_MS, undo, type Snapshot } from './lineHistory';

const snap = (text: string): Snapshot => ({ text, start: text.length, end: text.length });

describe('line history', () => {
  it('groups typing into one step', () => {
    let h = recordEdit(emptyHistory(), snap(''), 'typing', 0);
    h = recordEdit(h, snap('a'), 'typing', 100);
    h = recordEdit(h, snap('ab'), 'typing', 200);
    expect(undo(h, snap('abc'))?.snapshot).toEqual(snap(''));
  });

  it('starts a new step after a pause', () => {
    let h = recordEdit(emptyHistory(), snap(''), 'typing', 0);
    h = recordEdit(h, snap('a'), 'typing', TYPING_GROUP_MS + 1);
    expect(undo(h, snap('ab'))?.snapshot).toEqual(snap('a'));
  });

  it('makes a format its own step, even right after typing', () => {
    let h = recordEdit(emptyHistory(), snap(''), 'typing', 0);
    h = recordEdit(h, snap('abc'), 'step', 50);
    const first = undo(h, snap('**abc**'))!;
    expect(first.snapshot).toEqual(snap('abc'));
    expect(undo(first.history, snap('abc'))?.snapshot).toEqual(snap(''));
  });

  it('redoes what was undone, and a new edit clears the redo', () => {
    let h = recordEdit(emptyHistory(), snap('abc'), 'step', 0);
    const undone = undo(h, snap('**abc**'))!;
    const redone = redo(undone.history, snap('abc'))!;
    expect(redone.snapshot).toEqual(snap('**abc**'));
    h = recordEdit(undone.history, snap('abc'), 'step', 10);
    expect(redo(h, snap('x'))).toBeNull();
  });

  it('has nothing to undo or redo when empty', () => {
    expect(undo(emptyHistory(), snap('a'))).toBeNull();
    expect(redo(emptyHistory(), snap('a'))).toBeNull();
  });
});
