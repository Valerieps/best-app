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
    it('orders blocks by position and hides archived and abandoned tasks', () => {
        const s = section({ day });
        const second = note(s.id, 'segunda', { position: 'b' });
        const first = task(s.id, 'primeira', { position: 'a' });
        const done = task(s.id, 'feita', { position: 'c', status: 'done' });
        const archived = task(s.id, 'arquivada', { position: 'd', status: 'archived' });
        const [entry] = buildDayNote({ day, sections: [s], blocks: [second, archived, done, first], intended: [] });
        expect(entry.blocks).toEqual([first, second, done]);
    });
    it('does not repeat a task written today that is also intended for today', () => {
        const s = section({ day });
        const t = task(s.id, 'x', { intendedDate: day });
        const [entry] = buildDayNote({ day, sections: [s], blocks: [t], intended: [t] });
        expect(entry.carried).toEqual([]);
        expect(entry.blocks).toEqual([t]);
    });
});
