import { describe, expect, it } from 'vitest';
import { section, task, note } from '../test/builders';
import { buildDayNote } from './dayNote';

const day = '2026-10-11';

describe('buildDayNote', () => {
  it('opens the day with an empty general section', () => {
    expect(buildDayNote({ day, sections: [], blocks: [], intended: [] })).toEqual([
      { section: null, carried: [], blocks: [] },
    ]);
  });

  it('puts tasks intended for the day at the top of the first general section', () => {
    const meeting = section({ day, kind: 'meeting', createdAt: `${day}T08:00:00Z` });
    const general = section({ day, createdAt: `${day}T09:00:00Z` });
    const old = section({ day: '2026-10-10' });
    const carried = task(old.id, 'Revisar a spec', { intendedDate: day });

    const note_ = buildDayNote({ day, sections: [general, meeting], blocks: [], intended: [carried] });

    expect(note_.map((entry) => entry.section?.id)).toEqual([meeting.id, general.id]);
    expect(note_[1].carried).toEqual([carried]);
    expect(note_[0].carried).toEqual([]);
  });

  it('creates a virtual general section for carried tasks when there is none', () => {
    const meeting = section({ day, kind: 'meeting' });
    const carried = task(section({ day: '2026-10-10' }).id, 'x', { intendedDate: day });

    const note_ = buildDayNote({ day, sections: [meeting], blocks: [], intended: [carried] });

    expect(note_[0]).toEqual({ section: null, carried: [carried], blocks: [] });
  });

  it('orders blocks by position and hides abandoned tasks', () => {
    const s = section({ day });
    const second = note(s.id, 'segunda', { position: 'b' });
    const first = task(s.id, 'primeira', { position: 'a' });
    const done = task(s.id, 'feita', { position: 'c', status: 'done' });
    const abandoned = task(s.id, 'abandonada', { position: 'd', status: 'abandoned' });

    const [entry] = buildDayNote({ day, sections: [s], blocks: [second, abandoned, done, first], intended: [] });

    expect(entry.blocks).toEqual([first, second, done]);
  });

  it('does not repeat a task written today that is also intended for today', () => {
    const s = section({ day });
    const t = task(s.id, 'x', { intendedDate: day });

    const [entry] = buildDayNote({ day, sections: [s], blocks: [t], intended: [t] });

    expect(entry.carried).toEqual([]);
    expect(entry.blocks).toEqual([t]);
  });

  it('starts over after closing today: only the tasks kept on the day and what came later stay (spec/checkout.md)', () => {
    const closedAt = `${day}T18:00:00.000Z`;
    const morning = section({ day, projectId: 'p' });
    const evening = section({ day, createdAt: `${day}T19:00:00.000Z` });
    const empty = section({ day, kind: 'meeting', createdAt: `${day}T20:00:00.000Z` });
    const old = section({ day: '2026-10-10' });
    const kept = task(morning.id, 'fica hoje', { intendedDate: day, lastTriagedDay: day });
    const undated = task(morning.id, 'sem data', { lastTriagedDay: day });
    const tomorrow = task(morning.id, 'amanhã', { intendedDate: '2026-10-12', lastTriagedDay: day });
    const finished = task(morning.id, 'feita', { status: 'done', closedAt: `${day}T15:00:00.000Z` });
    const doneLater = task(morning.id, 'feita depois', { intendedDate: day, status: 'done', closedAt: `${day}T19:30:00.000Z` });
    const oldNote = note(morning.id, 'nota da manhã');
    const later = note(evening.id, 'depois do fechamento', { createdAt: `${day}T19:05:00.000Z` });
    const carried = task(old.id, 'veio de ontem', { intendedDate: day, lastTriagedDay: day, createdAt: '2026-10-10T09:00:00.000Z' });

    const entries = buildDayNote({
      day,
      sections: [morning, evening, empty],
      blocks: [kept, undated, tomorrow, finished, doneLater, oldNote, later],
      intended: [kept, doneLater, carried],
      closedAt,
    });

    expect(entries.map((entry) => [entry.section?.id, entry.blocks.map((block) => block.text)])).toEqual([
      [morning.id, ['fica hoje', 'feita depois']],
      [evening.id, ['depois do fechamento']],
      [empty.id, []],
    ]);
    expect(entries[0].carried.map((block) => block.text)).toEqual(['veio de ontem']);
  });

  it('drops the sections the closing emptied', () => {
    const s = section({ day });
    const entries = buildDayNote({ day, sections: [s], blocks: [note(s.id)], intended: [], closedAt: `${day}T18:00:00.000Z` });
    expect(entries).toEqual([{ section: null, carried: [], blocks: [] }]);
  });
});
