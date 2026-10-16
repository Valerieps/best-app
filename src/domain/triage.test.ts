import { describe, expect, it } from 'vitest';
import { note, project, section, task } from '../test/builders';
import { buildDayTriage, findPendingDays, isTriagePending } from './triage';

const day = '2026-10-11';
const base = { day, today: day, sections: [], blocks: [], carried: [], projects: [] };

describe('buildDayTriage', () => {
  it('never moves an open task on its own: it waits for a decision, "sem data" when untouched', () => {
    const s = section({ day, projectId: 'p' });
    const t = task(s.id);
    const triage = buildDayTriage({ ...base, sections: [s], blocks: [t] });

    expect(triage.nextDay).toBe('2026-10-12');
    expect(triage.rows).toEqual([{ type: 'task', task: t, section: s, suggestion: { kind: 'undate', untouched: true }, attention: false }]);
    expect(triage.automatic).toEqual([]);
    expect(triage.open).toEqual([{ task: t, section: s }]);
    expect(isTriagePending(triage)).toBe(true);
  });

  it('brings the tasks dated for the day itself', () => {
    const s = section({ day });
    const t = task(s.id, 'x', { intendedDate: day });
    expect(buildDayTriage({ ...base, sections: [s], blocks: [t] }).rows.map((row) => row.task)).toEqual([t]);
  });

  it('takes tasks given a future date during the day out of the triage (1b)', () => {
    const s = section({ day, projectId: 'p' });
    const t = task(s.id, 'x', { intendedDate: '2026-10-15' });
    const triage = buildDayTriage({ ...base, sections: [s], blocks: [t] });
    expect(triage.rows).toEqual([]);
    expect(triage.automatic).toEqual([{ type: 'scheduledDuringDay', task: t, section: s }]);
  });

  it('highlights a deadline before "dia seguinte" and tasks postponed 3 times or more (1b)', () => {
    const s = section({ day, projectId: 'p' });
    const late = task(s.id, 'x', { deadline: day });
    const fine = task(s.id, 'y', { deadline: '2026-10-20' });
    const often = task(s.id, 'z', { postponeCount: 3 });
    const triage = buildDayTriage({ ...base, sections: [s], blocks: [late, fine, often] });
    expect(triage.rows.map((row) => [row.task.text, row.attention])).toEqual([
      ['x', true],
      ['y', false],
      ['z', true],
    ]);
    expect(triage.rows.every((row) => row.suggestion.kind === 'undate')).toBe(true);
  });

  it('takes tasks finished during the day out of the triage', () => {
    const s = section({ day, projectId: 'p' });
    const t = task(s.id, 'x', { status: 'done', closedAt: new Date(2026, 9, 11, 15).toISOString() });
    const triage = buildDayTriage({ ...base, sections: [s], blocks: [t] });

    expect(triage.rows).toEqual([]);
    expect(triage.automatic).toEqual([{ type: 'finishedDuringDay', task: t, section: s }]);
    expect(isTriagePending(triage)).toBe(false);
  });

  it('includes tasks carried from other days', () => {
    const old = section({ day: '2026-10-10' });
    const carried = task(old.id, 'x', { intendedDate: day, lastTriagedDay: '2026-10-10', postponeCount: 1 });
    const triage = buildDayTriage({ ...base, carried: [carried] });
    expect(triage.rows).toEqual([expect.objectContaining({ task: carried, section: null })]);
  });

  it('sends the notes of every section to the wiki, linked to the project when there is one', () => {
    const studio = project('Data Studios');
    const linked = section({ day, projectId: studio.id });
    const loose = section({ day });
    const triage = buildDayTriage({
      ...base,
      sections: [linked, loose],
      blocks: [note(linked.id), note(loose.id), note(loose.id)],
      projects: [studio],
    });

    expect(triage.rows).toEqual([]);
    expect(triage.automatic).toEqual(
      expect.arrayContaining([
        { type: 'notesToWiki', section: linked, project: studio, noteCount: 1 },
        { type: 'whiteboardUnlinked', section: loose },
        { type: 'notesToWiki', section: loose, project: null, noteCount: 2 },
      ]),
    );
    expect(isTriagePending(triage)).toBe(true);
  });

  it('leaves whiteboards unlinked on its own, even when they cite a project', () => {
    const studio = project('Data Studios');
    const s = section({ day, title: 'Ideias soltas' });
    const triage = buildDayTriage({
      ...base,
      sections: [s],
      blocks: [note(s.id, 'Falar com o time do data studios')],
      projects: [studio],
    });
    expect(triage.automatic).toContainEqual({ type: 'whiteboardUnlinked', section: s });
    expect(triage.rows).toEqual([]);
  });

  it('ignores empty sections and sections with only tasks in the notes triage', () => {
    const empty = section({ day });
    const onlyTasks = section({ day, projectId: 'p' });
    const t = task(onlyTasks.id);
    const triage = buildDayTriage({ ...base, sections: [empty, onlyTasks], blocks: [t] });
    expect(triage.automatic).toEqual([]);
    expect(triage.rows.map((row) => row.task)).toEqual([t]);
  });

  it('is not pending when everything was decided', () => {
    const s = section({ day, notesDestination: 'wiki', whiteboardDecision: 'leftUnlinked' });
    const t = task(s.id, 'x', { intendedDate: '2026-10-12', lastTriagedDay: day });
    expect(isTriagePending(buildDayTriage({ ...base, sections: [s], blocks: [note(s.id), t] }))).toBe(false);
  });
});

describe('findPendingDays', () => {
  const today = '2026-10-11';

  it('lists past days with untriaged tasks or notes, oldest first, never today', () => {
    const friday = section({ day: '2026-10-09' });
    const saturday = section({ day: '2026-10-10' });
    const todaySection = section({ day: today });
    const days = findPendingDays({
      today,
      sections: [saturday, friday, todaySection],
      blocks: [note(saturday.id), note(todaySection.id)],
      activeTasks: [task(friday.id)],
      originDays: new Map([
        [friday.id, friday.day],
        [saturday.id, saturday.day],
      ]),
    });
    expect(days).toEqual(['2026-10-09', '2026-10-10']);
  });

  it('includes the intended day of a task that was never checked out', () => {
    const old = section({ day: '2026-10-05', notesDestination: 'wiki', whiteboardDecision: 'leftUnlinked' });
    const t = task(old.id, 'x', { intendedDate: '2026-10-08', lastTriagedDay: '2026-10-05' });
    const days = findPendingDays({
      today,
      sections: [],
      blocks: [],
      activeTasks: [t],
      originDays: new Map([[old.id, old.day]]),
    });
    expect(days).toEqual(['2026-10-08']);
  });
});
