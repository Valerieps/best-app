import { afterEach, describe, expect, it } from 'vitest';
import { closeTaskDetails, currentTaskDetailsId, openTaskDetails } from './taskDetailsStore';

describe('taskDetailsStore', () => {
  afterEach(() => closeTaskDetails());

  it('opens and closes a task', () => {
    openTaskDetails('a');
    expect(currentTaskDetailsId()).toBe('a');
    closeTaskDetails();
    expect(currentTaskDetailsId()).toBeNull();
  });

  it('opening another task replaces the current one', () => {
    openTaskDetails('a');
    openTaskDetails('b');
    expect(currentTaskDetailsId()).toBe('b');
  });

});
