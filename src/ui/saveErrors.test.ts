import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  dismissSaveErrors,
  holdSaveErrors,
  releaseSaveErrors,
  reportSaveError,
  SAVE_ERROR_NOTICE_MS,
  saveErrorCount,
} from './saveErrors';
import { enqueue } from './writeQueue';

describe('save errors', () => {
  afterEach(() => {
    dismissSaveErrors();
    vi.restoreAllMocks();
    vi.useRealTimers();
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

  describe('going away by itself (issue #121)', () => {
    it('goes away 8 seconds after the failure', () => {
      vi.useFakeTimers();
      reportSaveError();
      vi.advanceTimersByTime(SAVE_ERROR_NOTICE_MS - 1);
      expect(saveErrorCount()).toBe(1);
      vi.advanceTimersByTime(1);
      expect(saveErrorCount()).toBe(0);
    });

    it('counts a new failure and starts the 8 seconds over', () => {
      vi.useFakeTimers();
      reportSaveError();
      vi.advanceTimersByTime(5000);
      reportSaveError();
      expect(saveErrorCount()).toBe(2);
      vi.advanceTimersByTime(5000);
      expect(saveErrorCount()).toBe(2);
      vi.advanceTimersByTime(SAVE_ERROR_NOTICE_MS - 5000);
      expect(saveErrorCount()).toBe(0);
    });

    it('waits with the mouse over it, then gives the full time again', () => {
      vi.useFakeTimers();
      reportSaveError();
      holdSaveErrors('hover');
      vi.advanceTimersByTime(60_000);
      reportSaveError();
      expect(saveErrorCount()).toBe(2);
      releaseSaveErrors('hover');
      vi.advanceTimersByTime(SAVE_ERROR_NOTICE_MS - 1);
      expect(saveErrorCount()).toBe(2);
      vi.advanceTimersByTime(1);
      expect(saveErrorCount()).toBe(0);
    });

    it('waits while the focus is inside it', () => {
      vi.useFakeTimers();
      reportSaveError();
      holdSaveErrors('focus');
      vi.advanceTimersByTime(60_000);
      expect(saveErrorCount()).toBe(1);
      releaseSaveErrors('focus');
      vi.advanceTimersByTime(SAVE_ERROR_NOTICE_MS);
      expect(saveErrorCount()).toBe(0);
    });

    it('closing it early leaves no hold behind for the next notice', () => {
      vi.useFakeTimers();
      reportSaveError();
      holdSaveErrors('hover');
      dismissSaveErrors();
      reportSaveError();
      vi.advanceTimersByTime(SAVE_ERROR_NOTICE_MS);
      expect(saveErrorCount()).toBe(0);
    });

    it('ignores a hold when no notice is on screen', () => {
      vi.useFakeTimers();
      holdSaveErrors('hover');
      reportSaveError();
      vi.advanceTimersByTime(SAVE_ERROR_NOTICE_MS);
      expect(saveErrorCount()).toBe(0);
    });
  });
});
