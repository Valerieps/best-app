import { describe, expect, it } from 'vitest';
import { DEFAULT_VIEW, activeFilterCount, parseView, sortByColumn, toggleColumn } from './taskTableView';

describe('reading the saved view of the tasks table', () => {
  it('falls back to the default on nothing or broken JSON', () => {
    expect(parseView(null)).toEqual(DEFAULT_VIEW);
    expect(parseView('{oops')).toEqual(DEFAULT_VIEW);
    expect(parseView('null')).toEqual(DEFAULT_VIEW);
  });

  it('keeps valid values and drops invalid ones', () => {
    const view = parseView(
      JSON.stringify({ groupBy: 'project', sortBy: 'deadline', direction: 'desc', project: 'project:p1', nextOnly: true, columns: ['project', 'bogus', 'intendedDate'] }),
    );
    expect(view).toEqual({ groupBy: 'project', sortBy: 'deadline', direction: 'desc', project: 'project:p1', nextOnly: true, columns: ['intendedDate', 'project'] });
    expect(parseView(JSON.stringify({ sortBy: 'nope', project: 'project:', groupBy: 'text' }))).toEqual(DEFAULT_VIEW);
  });

  it('turns the old "Só projetos em foco" into the focus filter', () => {
    expect(parseView(JSON.stringify({ focusOnly: true })).project).toBe('focus');
  });

  it('can hide every optional column', () => {
    expect(parseView(JSON.stringify({ columns: [] })).columns).toEqual([]);
  });
});

describe('sorting by a column header', () => {
  it('flips the direction on the same column and starts ascending on another', () => {
    const desc = sortByColumn(DEFAULT_VIEW, 'intendedDate');
    expect(desc).toMatchObject({ sortBy: 'intendedDate', direction: 'desc' });
    expect(sortByColumn(desc, 'intendedDate').direction).toBe('asc');
    expect(sortByColumn(desc, 'text')).toMatchObject({ sortBy: 'text', direction: 'asc' });
  });
});

describe('showing and hiding columns', () => {
  it('keeps the table order', () => {
    const hidden = toggleColumn(DEFAULT_VIEW, 'deadline');
    expect(hidden.columns).toEqual(['intendedDate', 'project']);
    expect(toggleColumn(toggleColumn(hidden, 'postponeCount'), 'deadline').columns).toEqual(['intendedDate', 'deadline', 'project', 'postponeCount']);
  });
});

describe('the filter count', () => {
  it('counts what differs from the default', () => {
    expect(activeFilterCount(DEFAULT_VIEW, 'open')).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_VIEW, project: 'focus', nextOnly: true }, 'all')).toBe(3);
  });
});
