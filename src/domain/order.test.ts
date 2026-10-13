import { describe, expect, it } from 'vitest';
import { section, task } from '../test/builders';
import {
  adoptFirstPart,
  CARRIED_PART,
  FIRST_PART,
  moveByOne,
  moveItem,
  orderDayParts,
  placeInOrder,
  PRIORITIES_PART,
  sortCarried,
} from './order';

const day = '2026-10-11';

describe('moveItem', () => {
  it('moves a line to an insertion point counted before the move', () => {
    expect(moveItem(['a', 'b', 'c'], 'a', 3)).toEqual(['b', 'c', 'a']);
    expect(moveItem(['a', 'b', 'c'], 'c', 0)).toEqual(['c', 'a', 'b']);
    expect(moveItem(['a', 'b', 'c'], 'a', 2)).toEqual(['b', 'a', 'c']);
  });

  it('leaves the order when the line drops where it was or is not in the list', () => {
    expect(moveItem(['a', 'b', 'c'], 'b', 1)).toEqual(['a', 'b', 'c']);
    expect(moveItem(['a', 'b', 'c'], 'b', 2)).toEqual(['a', 'b', 'c']);
    expect(moveItem(['a', 'b'], 'x', 0)).toEqual(['a', 'b']);
  });
});

describe('moveByOne', () => {
  it('swaps with the neighbor and stops at the edges', () => {
    expect(moveByOne(['a', 'b', 'c'], 'b', 'up')).toEqual(['b', 'a', 'c']);
    expect(moveByOne(['a', 'b', 'c'], 'b', 'down')).toEqual(['a', 'c', 'b']);
    expect(moveByOne(['a', 'b', 'c'], 'a', 'up')).toEqual(['a', 'b', 'c']);
    expect(moveByOne(['a', 'b', 'c'], 'c', 'down')).toEqual(['a', 'b', 'c']);
  });
});

describe('placeInOrder', () => {
  it('writes only the moved line, between its new neighbors', () => {
    const changes = placeInOrder(
      [
        { id: 'b', position: 'm' },
        { id: 'a', position: 'g' },
        { id: 'c', position: 't' },
      ],
      'a',
    );
    expect(changes).toHaveLength(1);
    expect(changes[0].id).toBe('a');
    expect(changes[0].position > 'm' && changes[0].position < 't').toBe(true);
  });

  it('writes nothing when the order already holds', () => {
    expect(placeInOrder([{ id: 'a', position: 'a' }, { id: 'b', position: 'b' }], 'a')).toEqual([]);
  });

  it('gives every line a new key when the others have none or repeat one', () => {
    const items = [
      { id: 'c', position: null },
      { id: 'a', position: 'a' },
      { id: 'b', position: 'a' },
    ];
    const changes = placeInOrder(items, 'c');
    const keys = items.map((item) => changes.find((change) => change.id === item.id)?.position ?? item.position!);
    expect([...keys].sort()).toEqual(keys);
    expect(new Set(keys).size).toBe(3);
  });
});

describe('sortCarried', () => {
  const origin = section({ day: '2026-10-10' });
  const first = task(origin.id, 'primeira', { createdAt: '2026-10-10T08:00:00Z', intendedDate: day });
  const second = task(origin.id, 'segunda', { createdAt: '2026-10-10T09:00:00Z', intendedDate: day });
  const third = task(origin.id, 'terceira', { createdAt: '2026-10-10T10:00:00Z', intendedDate: day });

  it('keeps the order of creation until the tasks are reordered', () => {
    expect(sortCarried([third, first, second], day)).toEqual([first, second, third]);
  });

  it('follows the order chosen for the day, with new arrivals last', () => {
    const b = { ...second, carriedOrder: { day, position: 'a' } };
    const a = { ...first, carriedOrder: { day, position: 'b' } };
    expect(sortCarried([a, third, b], day)).toEqual([b, a, third]);
  });

  it('ignores an order chosen for another day', () => {
    const moved = { ...third, carriedOrder: { day: '2026-10-09', position: 'a' } };
    expect(sortCarried([moved, second, first], day)).toEqual([first, second, moved]);
  });
});

describe('orderDayParts', () => {
  const defaults = [PRIORITIES_PART, CARRIED_PART, 's1', 's2'];

  it('keeps the default order on a day never reordered', () => {
    expect(orderDayParts(defaults, undefined)).toEqual(defaults);
  });

  it('follows the order chosen for the day', () => {
    expect(orderDayParts(defaults, ['s2', CARRIED_PART, 's1', PRIORITIES_PART])).toEqual(['s2', CARRIED_PART, 's1', PRIORITIES_PART]);
  });

  it('puts a new section last, and priorities or carried tasks that were missing first', () => {
    expect(orderDayParts([...defaults, 's3'], ['s2', 's1'])).toEqual([PRIORITIES_PART, CARRIED_PART, 's2', 's1', 's3']);
  });

  it('drops parts no longer shown, like priorities pinned to the top', () => {
    expect(orderDayParts([CARRIED_PART, 's1'], ['s1', PRIORITIES_PART, CARRIED_PART])).toEqual(['s1', CARRIED_PART]);
  });
});

describe('adoptFirstPart', () => {
  it('gives the day first section its id once it is saved', () => {
    expect(adoptFirstPart(['s2', FIRST_PART], 's9')).toEqual(['s2', 's9']);
  });
});
