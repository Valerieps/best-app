import { describe, expect, it } from 'vitest';
import type { Block, Section } from './entities';
import { groupProjectTasks, isDaySection, isProjectIcon, projectInitial } from './projectPage';

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

describe('groupProjectTasks', () => {
  it('puts the queued tasks in their own group, in the queue order, outside the other tasks', () => {
    const groups = groupProjectTasks([task('a'), task('b'), task('cc'), task('ddd', { postponeCount: 3 })], ['other-project', 'b', 'ddd', 'a']);
    expect(groups.queued.map((t) => t.id)).toEqual(['b', 'ddd', 'a']);
    expect(groups.open.map((t) => t.id)).toEqual(['cc']);
  });

  it('keeps the other tasks by creation, whatever date or postponements they have', () => {
    const groups = groupProjectTasks([task('ccc', { intendedDate: '2026-09-30' }), task('a', { postponeCount: 4 }), task('bb', { intendedDate: '2026-10-20' })]);
    expect(groups.open.map((t) => t.id)).toEqual(['a', 'bb', 'ccc']);
  });

  it('shows every waiting task only among the waiting ones, even when queued', () => {
    const groups = groupProjectTasks([task('a', { waiting: true }), task('bb', { waiting: true, intendedDate: TODAY }), task('ccc')], ['a']);
    expect(groups.waiting.map((t) => t.id)).toEqual(['a', 'bb']);
    expect(groups.queued).toEqual([]);
    expect(groups.open.map((t) => t.id)).toEqual(['ccc']);
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
