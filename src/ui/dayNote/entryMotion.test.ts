import { describe, expect, it } from 'vitest';
import { entersWithMotion, isSettled, nextEntries, NO_ENTRIES } from './entryMotion';

describe('isSettled', () => {
  it('is false on the first render', () => {
    expect(isSettled(null, { view: 'a', shown: true })).toBe(false);
  });

  it('is false on the render that first shows the lines', () => {
    expect(isSettled({ view: 'a', shown: false }, { view: 'a', shown: true })).toBe(false);
  });

  it('is true once the same view was already shown', () => {
    expect(isSettled({ view: 'a', shown: true }, { view: 'a', shown: true })).toBe(true);
  });

  it('is false when the view changes, such as another day or focus mode', () => {
    expect(isSettled({ view: 'a', shown: true }, { view: 'b', shown: true })).toBe(false);
  });

  it('is false while nothing is shown', () => {
    expect(isSettled({ view: 'a', shown: true }, { view: 'a', shown: false })).toBe(false);
  });
});

describe('entersWithMotion', () => {
  it('fades a line in once the note is settled', () => {
    expect(entersWithMotion(true, null, 'x')).toBe(true);
  });

  it('never fades the line about to take the caret', () => {
    expect(entersWithMotion(true, 'x', 'x')).toBe(false);
    expect(entersWithMotion(true, 'y', 'x')).toBe(true);
  });

  it('shows lines at once before the note is settled', () => {
    expect(entersWithMotion(false, null, 'x')).toBe(false);
  });
});

describe('nextEntries', () => {
  it('marks nothing on the first render', () => {
    const next = nextEntries(NO_ENTRIES, ['a', 'b'], false);
    expect([...next.entering]).toEqual([]);
    expect([...next.seen]).toEqual(['a', 'b']);
  });

  it('marks a part that appears once settled, and keeps it marked', () => {
    const first = nextEntries(NO_ENTRIES, ['a'], false);
    const second = nextEntries(first, ['a', 'b'], true);
    expect([...second.entering]).toEqual(['b']);
    const third = nextEntries(second, ['a', 'b'], true);
    expect([...third.entering]).toEqual(['b']);
  });

  it('drops a part that left, so it fades in again if it comes back', () => {
    const entering = nextEntries({ seen: new Set(['a']), entering: new Set() }, ['a', 'b'], true);
    const gone = nextEntries(entering, ['a'], true);
    expect([...gone.entering]).toEqual([]);
    const back = nextEntries(gone, ['a', 'b'], true);
    expect([...back.entering]).toEqual(['b']);
  });

  it('starts over with a new view', () => {
    const entering = nextEntries({ seen: new Set(['a']), entering: new Set() }, ['a', 'b'], true);
    expect([...nextEntries(entering, ['a', 'b'], false).entering]).toEqual([]);
  });
});
