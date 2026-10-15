import { describe, expect, it } from 'vitest';
import type { DayRecord, Reminder } from './entities';
import { askAgainAt, dayStage, dueReminders, nextActiveDay } from './dayFlow';

const items = [
  { id: 'agua', text: 'Beber água' },
  { id: 'agenda', text: 'Olhar a agenda' },
];
const record = (overrides: Partial<DayRecord> = {}): DayRecord => ({
  day: '2026-10-12',
  lastCheckoutAt: null,
  updatedAt: '',
  ...overrides,
});

describe('dayStage', () => {
  it('opens straight on the day note while there is no warm-up checklist', () => {
    expect(dayStage(undefined, [])).toBe('execution');
    expect(dayStage(record({ startedAt: 'x' }), [])).toBe('execution');
  });

  it('goes start → warm up → dashboard → execution', () => {
    expect(dayStage(undefined, items)).toBe('start');
    expect(dayStage(record({ startedAt: 'x' }), items)).toBe('warmup');
    expect(dayStage(record({ startedAt: 'x', warmup: { agua: 'done' } }), items)).toBe('warmup');
    expect(dayStage(record({ startedAt: 'x', warmup: { agua: 'done', agenda: 'later' } }), items)).toBe('dashboard');
    expect(dayStage(record({ startedAt: 'x', executionStartedAt: 'y' }), items)).toBe('execution');
  });
});

describe('nextActiveDay', () => {
  const weekdays = [1, 2, 3, 4, 5];
  it('skips days off: on Friday, the next day is Monday', () => {
    expect(nextActiveDay('2026-10-16', weekdays)).toBe('2026-10-19');
    expect(nextActiveDay('2026-10-13', weekdays)).toBe('2026-10-14');
  });

  it('treats every day as active by default', () => {
    expect(nextActiveDay('2026-10-16')).toBe('2026-10-17');
    expect(nextActiveDay('2026-10-16', [])).toBe('2026-10-17');
  });
});

describe('reminders', () => {
  const reminder = (id: string, dueAt: string, status: Reminder['status'] = 'pending'): Reminder => ({
    id,
    source: 'warmup',
    sourceId: id,
    day: '2026-10-12',
    text: id,
    dueAt,
    status,
    createdAt: '',
    updatedAt: '',
  });

  it('only pending reminders whose time has come are due, oldest first', () => {
    const now = new Date('2026-10-12T15:00:00Z');
    const due = dueReminders(
      [
        reminder('b', '2026-10-12T14:00:00Z'),
        reminder('a', '2026-10-12T10:00:00Z'),
        reminder('later', '2026-10-12T16:00:00Z'),
        reminder('done', '2026-10-12T09:00:00Z', 'done'),
      ],
      now,
    );
    expect(due.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('"perguntar de novo às" a time already past means tomorrow', () => {
    const now = new Date(2026, 9, 12, 15, 30);
    expect(askAgainAt(now, '17:00')).toEqual(new Date(2026, 9, 12, 17, 0));
    expect(askAgainAt(now, '09:00')).toEqual(new Date(2026, 9, 13, 9, 0));
  });
});
