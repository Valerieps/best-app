import { describe, expect, it } from 'vitest';
import type { Block, Section } from './entities';
import { agendaColumns, groupProjectTasks, isDaySection, isProjectIcon, isStuckTask, projectInitial, stuckReason } from './projectPage';

const TODAY = '2026-10-12';

function task(id: string, fields: Partial<Block> = {}): Block {
  return {
    id,
    kind: 'task',
    text: id,
    sectionId: 's-1',
    position: 'a',
    projectId: 'p-1',
    createdAt: `2026-10-01T09:00:0${id.length}`,
    updatedAt: '2026-10-01T09:00:00',
    status: 'active',
    intendedDate: null,
    firstIntendedDate: null,
    postponeCount: 0,
    closedAt: null,
    lastTriagedDay: null,
    ...fields,
  };
}

describe('isStuckTask', () => {
  it('counts tasks postponed 3 times or more', () => {
    expect(isStuckTask(task('a', { postponeCount: 2 }), TODAY)).toBe(false);
    expect(isStuckTask(task('a', { postponeCount: 3 }), TODAY)).toBe(true);
  });

  it('counts active tasks whose intended date already passed, but not today', () => {
    expect(isStuckTask(task('a', { intendedDate: '2026-10-11' }), TODAY)).toBe(true);
    expect(isStuckTask(task('a', { intendedDate: TODAY }), TODAY)).toBe(false);
    expect(isStuckTask(task('a'), TODAY)).toBe(false);
  });

  it('ignores tasks that left the active list', () => {
    expect(isStuckTask(task('a', { status: 'done', postponeCount: 5 }), TODAY)).toBe(false);
    expect(isStuckTask(task('a', { status: 'abandoned', intendedDate: '2026-10-01' }), TODAY)).toBe(false);
  });
});

describe('groupProjectTasks', () => {
  it('splits stuck, upcoming and undated tasks, each by date then creation', () => {
    const groups = groupProjectTasks(
      [
        task('later', { intendedDate: '2026-10-20' }),
        task('none'),
        task('old', { intendedDate: '2026-10-01' }),
        task('today', { intendedDate: TODAY }),
        task('older', { intendedDate: '2026-09-30' }),
      ],
      TODAY,
    );
    expect(groups.stuck.map((t) => t.id)).toEqual(['older', 'old']);
    expect(groups.upcoming.map((t) => t.id)).toEqual(['today', 'later']);
    expect(groups.undated.map((t) => t.id)).toEqual(['none']);
  });

  it('shows a task postponed 3 times only among the stuck ones, even with a date ahead or none', () => {
    const groups = groupProjectTasks([task('ahead', { intendedDate: '2026-10-20', postponeCount: 3 }), task('nodate', { postponeCount: 4 })], TODAY);
    expect(groups.stuck.map((t) => t.id)).toEqual(['ahead', 'nodate']);
    expect(groups.upcoming).toEqual([]);
    expect(groups.undated).toEqual([]);
  });

  it('shows every waiting task only among the waiting ones, with a date or without', () => {
    const groups = groupProjectTasks(
      [task('dated', { intendedDate: '2026-10-20', waiting: true }), task('late', { intendedDate: '2026-10-01', waiting: true }), task('none', { waiting: true })],
      TODAY,
    );
    expect(groups.waiting.map((t) => t.id)).toEqual(['late', 'dated', 'none']);
    expect([...groups.stuck, ...groups.upcoming, ...groups.undated]).toEqual([]);
  });
});

describe('stuckReason', () => {
  it('spells out postponements and since when the task waits', () => {
    expect(stuckReason(task('a', { postponeCount: 3, firstIntendedDate: '2026-09-18', intendedDate: '2026-10-20' }), TODAY)).toEqual({
      postponed: 3,
      since: '2026-09-18',
      overdueOn: null,
    });
  });

  it('falls back to the day the task was written when it never had a date', () => {
    expect(stuckReason(task('a', { postponeCount: 3 }), TODAY)?.since).toBe('2026-10-01');
  });

  it('gives the intended date that passed', () => {
    expect(stuckReason(task('a', { intendedDate: '2026-10-09' }), TODAY)).toEqual({ postponed: null, since: null, overdueOn: '2026-10-09' });
  });

  it('is null for a task that is not stuck', () => {
    expect(stuckReason(task('a', { intendedDate: TODAY }), TODAY)).toBeNull();
  });
});

describe('agendaColumns', () => {
  // 2026-10-16 is a Friday.
  it('shows the next 3 days from today, each with its tasks; later tasks do not show', () => {
    const columns = agendaColumns(
      [task('a', { intendedDate: '2026-10-16' }), task('b', { intendedDate: '2026-10-18' }), task('c', { intendedDate: '2026-10-25' })],
      '2026-10-16',
    );
    expect(columns.map(({ day, tasks }) => [day, tasks.map((t) => t.id)])).toEqual([
      ['2026-10-16', ['a']],
      ['2026-10-17', []],
      ['2026-10-18', ['b']],
    ]);
  });

  it('skips the days that are not active', () => {
    const weekdays = [1, 2, 3, 4, 5];
    expect(agendaColumns([], '2026-10-16', weekdays).map(({ day }) => day)).toEqual(['2026-10-16', '2026-10-19', '2026-10-20']);
    expect(agendaColumns([], '2026-10-17', weekdays).map(({ day }) => day)).toEqual(['2026-10-19', '2026-10-20', '2026-10-21']);
  });
});

describe('icons and sections', () => {
  it('accepts only the icons of the collection', () => {
    expect(isProjectIcon('pot')).toBe(true);
    expect(isProjectIcon('rocket')).toBe(false);
    expect(isProjectIcon(null)).toBe(false);
  });

  it('uses the first letter of the name when there is no icon', () => {
    expect(projectInitial('  reforma da cozinha')).toBe('R');
    expect(projectInitial('')).toBe('?');
  });

  it('keeps the project page section out of the day notes', () => {
    const section = { id: 's', projectPage: true } as Section;
    expect(isDaySection(section)).toBe(false);
    expect(isDaySection({ ...section, projectPage: undefined })).toBe(true);
    expect(isDaySection({ ...section, projectPage: undefined, projectNote: true })).toBe(false);
  });
});
