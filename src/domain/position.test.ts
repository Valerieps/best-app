import { describe, expect, it } from 'vitest';
import { positionBetween } from './position';

describe('positionBetween', () => {
  it('creates keys that sort between their neighbors', () => {
    const first = positionBetween(null, null);
    const after = positionBetween(first, null);
    const before = positionBetween(null, first);
    const middle = positionBetween(first, after);
    expect([after, middle, before, first].sort()).toEqual([before, first, middle, after]);
  });

  it('keeps finding room when inserting repeatedly at the same spot', () => {
    const keys = [positionBetween(null, null)];
    let low = keys[0];
    let high = positionBetween(low, null);
    keys.push(high);
    for (let i = 0; i < 200; i++) {
      const next = positionBetween(low, high);
      expect(next > low && next < high).toBe(true);
      keys.push(next);
      if (i % 2 === 0) low = next;
      else high = next;
    }
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('appends and prepends many times in order', () => {
    const appended = [positionBetween(null, null)];
    for (let i = 0; i < 100; i++) appended.push(positionBetween(appended.at(-1)!, null));
    expect([...appended].sort()).toEqual(appended);

    const prepended = [positionBetween(null, null)];
    for (let i = 0; i < 100; i++) prepended.unshift(positionBetween(null, prepended[0]));
    expect([...prepended].sort()).toEqual(prepended);
  });

  it('rejects neighbors in the wrong order', () => {
    expect(() => positionBetween('b', 'a')).toThrow();
  });
});
