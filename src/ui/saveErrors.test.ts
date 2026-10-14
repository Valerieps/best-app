import { afterEach, describe, expect, it, vi } from 'vitest';
import { dismissSaveErrors, saveErrorCount } from './saveErrors';
import { enqueue } from './writeQueue';

describe('save errors', () => {
  afterEach(() => {
    dismissSaveErrors();
    vi.restoreAllMocks();
  });

  it('counts a failed write of the queue, which keeps running', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(enqueue(() => Promise.reject(new Error('disk full')))).rejects.toThrow('disk full');
    expect(await enqueue(() => Promise.resolve('next write'))).toBe('next write');
    expect(saveErrorCount()).toBe(1);
  });

  it('does not count writes that succeed', async () => {
    await enqueue(() => Promise.resolve());
    expect(saveErrorCount()).toBe(0);
  });

  it('starts over when the notice is closed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await enqueue(() => Promise.reject(new Error('x'))).catch(() => {});
    await enqueue(() => Promise.resolve());
    dismissSaveErrors();
    expect(saveErrorCount()).toBe(0);
  });
});
