import { describe, expect, it } from 'vitest';
import type { Block } from './entities';
import { canBeNextStep, nextStepIds, nextStepsListId, recordedNextSteps, withNextStep, withoutNextStep } from './nextSteps';

function task(id: string, overrides: Partial<Block> = {}): Block {
  return { id, kind: 'task', status: 'active', projectId: 'p1', ...overrides } as Block;
}

describe('next steps', () => {
  it('has one list per project', () => {
    expect(nextStepsListId('p1')).toBe('next:p1');
  });

  it('only an open task of a project can be one', () => {
    expect(canBeNextStep(task('a'))).toBe(true);
    expect(canBeNextStep(task('a', { projectId: null }))).toBe(false);
    expect(canBeNextStep(task('a', { status: 'done' }))).toBe(false);
    expect(canBeNextStep(task('a', { kind: 'note', status: null }))).toBe(false);
    expect(canBeNextStep(undefined)).toBe(false);
  });

  it('marks up to 3; the fourth takes the place of the third', () => {
    let ids: string[] = [];
    for (const id of ['a', 'b', 'c']) ids = withNextStep(ids, id)!;
    expect(ids).toEqual(['a', 'b', 'c']);
    expect(withNextStep(ids, 'd')).toEqual(['a', 'b', 'd']);
    expect(withNextStep(ids, 'a')).toBeNull();
  });

  it('unmarks and frees the place', () => {
    expect(withoutNextStep(['a', 'b'], 'a')).toEqual(['b']);
    expect(withoutNextStep(['a', 'b'], 'z')).toBeNull();
  });

  it('shows only tasks still open and still in the project', () => {
    const list = { itemIds: ['a', 'b', 'c', 'd'] };
    const tasks = [task('a'), task('b', { status: 'done' }), task('c', { projectId: 'p2' })];
    expect(nextStepIds(list, tasks, 'p1')).toEqual(['a']);
    expect(recordedNextSteps({ itemIds: ['a', 'a', 'b', 'c', 'd'] })).toEqual(['a', 'b', 'c']);
    expect(nextStepIds(undefined, tasks, 'p1')).toEqual([]);
  });
});
