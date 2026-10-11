import { describe, expect, it } from 'vitest';
import { note, project, section, task } from '../test/builders';
import { automaticToRow, buildDayTriage, findPendingDays, isTriagePending } from './triage';

const day = '2026-10-11';
const base = { day, today: day, sections: [], blocks: [], carried: [], projects: [] };

describe('buildDayTriage', () => {
  it('suggests "dia seguinte" for tasks not done', () => {
    const s = section({ day });
    const t = task(s.id);
    const triage = buildDayTriage({ ...base, sections: [s], blocks: [t] });

    expect(triage.nextDay).toBe('2026-10-12');
    expect(triage.rows).toContainEqual(
      expect.objectContaining({ type: 'task', task: t, suggestion: { kind: 'schedule', date: '2026-10-12' }, attention: false }),
    );
  });

  it('takes tasks given a future date during the day out of the triage (1b)', () => {
    const s = section({ day });
    const t = task(s.id, 'x', { intendedDate: '2026-10-15' });
    const triage = buildDayTriage({ ...base, sections: [s], blocks: [t] });
    expect(triage.rows.filter((row) => row.type === 'task')).toEqual([]);
    expect(triage.automatic).toEqual([{ type: 'scheduledDuringDay', task: t, section: s }]);
    expect(automaticToRow(triage.automatic[0])).toMatchObject({ suggestion: { kind: 'schedule', date: '2026-10-15' } });
  });

  it('asks for attention when the deadline comes before "dia seguinte" (1b)', () => {
    const s = section({ day });
    const late = task(s.id, 'x', { deadline: day });
    const fine = task(s.id, 'y', { deadline: '2026-10-20' });
    const triage = buildDayTriage({ ...base, sections: [s], blocks: [late, fine] });
    expect(triage.rows).toContainEqual(expect.objectContaining({ task: late, attention: true }));
    expect(triage.rows).toContainEqual(expect.objectContaining({ task: fine, attention: false }));
  });

  it('highlights tasks postponed 3 times or more', () => {
    const s = section({ day });
    const t = task(s.id, 'x', { postponeCount: 3 });
    const triage = buildDayTriage({ ...base, sections: [s], blocks: [t] });
    expect(triage.rows).toContainEqual(expect.objectContaining({ task: t, attention: true }));
  });

  it('takes tasks finished during the day out of the triage', () => {
    const s = section({ day });
    const t = task(s.id, 'x', { status: 'done', closedAt: new Date(2026, 9, 11, 15).toISOString() });
    const triage = buildDayTriage({ ...base, sections: [s], blocks: [t] });

    expect(triage.rows).toEqual([expect.objectContaining({ type: 'whiteboard' })]);
    expect(triage.automatic).toEqual([{ type: 'finishedDuringDay', task: t, section: s }]);
  });

  it('includes tasks carried from other days, first', () => {
    const old = section({ day: '2026-10-10' });
    const carried = task(old.id, 'x', { intendedDate: day, lastTriagedDay: '2026-10-10' });
    const triage = buildDayTriage({ ...base, carried: [carried] });
    expect(triage.rows).toEqual([expect.objectContaining({ type: 'task', task: carried, section: null })]);
  });

  it('sends notes of project sections to the wiki automatically', () => {
    const studio = project('Data Studios');
    const s = section({ day, projectId: studio.id });
    const triage = buildDayTriage({ ...base, sections: [s], blocks: [note(s.id)], projects: [studio] });

    expect(triage.rows).toEqual([]);
    expect(triage.automatic).toEqual([{ type: 'notesToWiki', section: s, project: studio, noteCount: 1 }]);
    expect(isTriagePending(triage)).toBe(true);
  });

  it('suggests the wiki for whiteboard notes and leaving the section unlinked', () => {
    const s = section({ day });
    const triage = buildDayTriage({ ...base, sections: [s], blocks: [note(s.id), note(s.id)] });

    expect(triage.rows).toEqual([
      expect.objectContaining({ type: 'whiteboard', suggestion: { kind: 'leaveUnlinked' }, attention: false }),
      expect.objectContaining({ type: 'notes', noteCount: 2, suggestion: 'wiki' }),
    ]);
  });

  it('suggests linking a whiteboard that cites an existing project', () => {
    const studio = project('Data Studios');
    const s = section({ day, title: 'Ideias soltas' });
    const triage = buildDayTriage({
      ...base,
      sections: [s],
      blocks: [note(s.id, 'Falar com o time do data studios amanhã')],
      projects: [studio, project('Outro')],
    });

    expect(triage.rows[0]).toMatchObject({
      type: 'whiteboard',
      suggestion: { kind: 'link', projectId: studio.id },
      citedProject: studio,
      attention: true,
    });
  });

  it('ignores empty sections and sections with only tasks in the notes triage', () => {
    const empty = section({ day });
    const onlyTasks = section({ day, projectId: 'p' });
    const triage = buildDayTriage({ ...base, sections: [empty, onlyTasks], blocks: [task(onlyTasks.id)] });
    expect(triage.rows.map((row) => row.type)).toEqual(['task']);
    expect(triage.automatic).toEqual([]);
  });

  it('is not pending when everything was decided', () => {
    const s = section({ day, notesDestination: 'wiki', whiteboardDecision: 'leftUnlinked' });
    const t = task(s.id, 'x', { intendedDate: '2026-10-12', lastTriagedDay: day });
    expect(isTriagePending(buildDayTriage({ ...base, sections: [s], blocks: [note(s.id), t] }))).toBe(false);
  });

  it('turns automatic decisions back into rows', () => {
    const s = section({ day });
    const t = task(s.id, 'x', { status: 'done' });
    expect(automaticToRow({ type: 'finishedDuringDay', task: t, section: s })).toMatchObject({
      type: 'task',
      suggestion: { kind: 'finish' },
    });
    expect(automaticToRow({ type: 'notesToWiki', section: s, project: null, noteCount: 2 })).toMatchObject({
      type: 'notes',
      noteCount: 2,
    });
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
