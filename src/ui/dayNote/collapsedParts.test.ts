import { describe, expect, it } from 'vitest';
import { parseCollapsed, toggleCollapsed } from './collapsedParts';

describe('toggleCollapsed', () => {
  it('collapses a part that was open', () => {
    expect(toggleCollapsed(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('opens a part that was collapsed', () => {
    expect(toggleCollapsed(['a', 'b'], 'a')).toEqual(['b']);
  });
});

describe('parseCollapsed', () => {
  it('reads a stored list', () => {
    expect(parseCollapsed('["a","b"]')).toEqual(['a', 'b']);
  });

  it('ignores missing, broken or unexpected values', () => {
    expect(parseCollapsed(null)).toEqual([]);
    expect(parseCollapsed('{')).toEqual([]);
    expect(parseCollapsed('{"a":1}')).toEqual([]);
    expect(parseCollapsed('["a",2]')).toEqual(['a']);
  });
});
