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
      JSON.stringify({ groupBy: 'project', sortBy: 'deadline', direction: 'desc', project: 'project:p1', nextOnly: true, columns: ['project', 'bogus', 'intendedDate', 'deadline'] }),
    );
    // The old "Data" column is gone (ADR-072): a saved one is dropped.
    expect(view).toEqual({ groupBy: 'project', sortBy: 'deadline', direction: 'desc', project: 'project:p1', columns: ['deadline', 'project'] });
    expect(parseView(JSON.stringify({ sortBy: 'intendedDate', groupBy: 'intendedDate' }))).toEqual(DEFAULT_VIEW);
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
    const desc = sortByColumn(DEFAULT_VIEW, 'createdDate');
    expect(desc).toMatchObject({ sortBy: 'createdDate', direction: 'desc' });
    expect(sortByColumn(desc, 'createdDate').direction).toBe('asc');
    expect(sortByColumn(desc, 'text')).toMatchObject({ sortBy: 'text', direction: 'asc' });
  });
});

describe('showing and hiding columns', () => {
  it('keeps the table order', () => {
    const hidden = toggleColumn(DEFAULT_VIEW, 'deadline');
    expect(hidden.columns).toEqual(['project']);
    expect(toggleColumn(toggleColumn(hidden, 'createdDate'), 'deadline').columns).toEqual(['deadline', 'project', 'createdDate']);
  });
});

describe('the filter count', () => {
  it('counts what differs from the default', () => {
    expect(activeFilterCount(DEFAULT_VIEW, 'open')).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_VIEW, project: 'focus' }, 'all')).toBe(2);
  });
});

describe('a view saved before postponements were deprecated', () => {
  it('drops the old column, grouping and sorting', () => {
    const view = parseView(JSON.stringify({ groupBy: 'postponeCount', sortBy: 'postponeCount', columns: ['project', 'postponeCount'] }));
    expect(view.groupBy).toBe(DEFAULT_VIEW.groupBy);
    expect(view.sortBy).toBe(DEFAULT_VIEW.sortBy);
    expect(view.columns).toEqual(['project']);
  });
});
