import { describe, expect, it } from 'vitest';
import { extendSelection, isSelectAllKey, selectAll, selectionText, selectRange, selectsAllLines } from './blockSelection';

const order = ['a', 'b', 'c', 'd'];

describe('selectRange', () => {
  it('selects the lines between anchor and head, in the order shown', () => {
    expect(selectRange(order, 'b', 'd')?.ids).toEqual(['b', 'c', 'd']);
  });

  it('works upwards too, keeping where it started', () => {
    expect(selectRange(order, 'c', 'a')).toEqual({ anchor: 'c', head: 'a', ids: ['a', 'b', 'c'] });
  });

  it('is null when a line is not shown', () => {
    expect(selectRange(order, 'a', 'z')).toBeNull();
  });
});

describe('selectAll', () => {
  it('selects every line shown', () => {
    expect(selectAll(order)).toEqual({ anchor: 'a', head: 'd', ids: order });
  });

  it('is null with no lines', () => {
    expect(selectAll([])).toBeNull();
  });
});

describe('extendSelection', () => {
  it('moves the head and keeps the anchor', () => {
    const start = selectRange(order, 'b', 'b')!;
    const down = extendSelection(order, start, 'down');
    expect(down.ids).toEqual(['b', 'c']);
    expect(extendSelection(order, down, 'up').ids).toEqual(['b']);
    expect(extendSelection(order, start, 'up').ids).toEqual(['a', 'b']);
  });

  it('stops at the first and the last line', () => {
    expect(extendSelection(order, selectRange(order, 'd', 'd')!, 'down').ids).toEqual(['d']);
    expect(extendSelection(order, selectRange(order, 'a', 'a')!, 'up').ids).toEqual(['a']);
  });
});

describe('Ctrl + A', () => {
  const keys = { code: 'KeyA', ctrlKey: true, metaKey: false, shiftKey: false, altKey: false };

  it('is Ctrl + A or ⌘ + A, on any layout', () => {
    expect(isSelectAllKey(keys)).toBe(true);
    expect(isSelectAllKey({ ...keys, ctrlKey: false, metaKey: true })).toBe(true);
    expect(isSelectAllKey({ ...keys, ctrlKey: false })).toBe(false);
    expect(isSelectAllKey({ ...keys, shiftKey: true })).toBe(false);
    expect(isSelectAllKey({ ...keys, code: 'KeyB' })).toBe(false);
  });

  it('selects every line only once the line text is all selected, or empty', () => {
    expect(selectsAllLines({ value: 'abc', selectionStart: 1, selectionEnd: 1 })).toBe(false);
    expect(selectsAllLines({ value: 'abc', selectionStart: 0, selectionEnd: 2 })).toBe(false);
    expect(selectsAllLines({ value: 'abc', selectionStart: 0, selectionEnd: 3 })).toBe(true);
    expect(selectsAllLines({ value: '', selectionStart: 0, selectionEnd: 0 })).toBe(true);
  });
});

describe('selectionText', () => {
  it('puts each line on its own line', () => {
    expect(selectionText(['- one', 'two'])).toBe('- one\ntwo');
  });
});
