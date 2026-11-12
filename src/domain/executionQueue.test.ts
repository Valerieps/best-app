import { describe, expect, it } from 'vitest';
import { recordedQueue, reorderedQueue, withQueued, withoutQueued } from './executionQueue';

describe('execution queue lists', () => {
  it('adds at the end, once', () => {
    expect(withQueued(['a'], 'b')).toEqual(['a', 'b']);
    expect(withQueued(['a', 'b'], 'a')).toBeNull();
  });

  it('removes only what is there', () => {
    expect(withoutQueued(['a', 'b'], 'a')).toEqual(['b']);
    expect(withoutQueued(['a'], 'x')).toBeNull();
  });

  it('drops repeats from what was recorded', () => {
    expect(recordedQueue({ itemIds: ['a', 'b', 'a'] })).toEqual(['a', 'b']);
    expect(recordedQueue(undefined)).toEqual([]);
  });

  it('reorders as shown', () => {
    expect(reorderedQueue(['a', 'b', 'c'], ['c', 'a', 'b'], 'c')).toEqual(['c', 'a', 'b']);
    expect(reorderedQueue(['a', 'b', 'c'], ['b', 'a', 'c'], 'a')).toEqual(['b', 'a', 'c']);
    expect(reorderedQueue(['a', 'b', 'c'], ['a', 'b', 'c'], 'b')).toBeNull();
  });

  it('keeps hidden ids in the list when reordering, right after what precedes the moved one', () => {
    // "x" is recorded but no longer shown (a task turned waiting).
    expect(reorderedQueue(['a', 'x', 'b', 'c'], ['a', 'c', 'b'], 'c')).toEqual(['a', 'c', 'x', 'b']);
    expect(reorderedQueue(['x', 'a', 'b'], ['b', 'a'], 'b')).toEqual(['x', 'b', 'a']);
  });

  it('ignores a task not in the queue', () => {
    expect(reorderedQueue(['a', 'b'], ['z', 'a', 'b'], 'z')).toBeNull();
  });
});
