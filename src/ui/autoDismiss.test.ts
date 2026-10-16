import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAutoDismiss } from './autoDismiss';

describe('auto-dismiss timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('expires after the full time, not before', () => {
    const onExpire = vi.fn();
    const timer = createAutoDismiss(8000, onExpire);
    timer.restart();
    vi.advanceTimersByTime(7999);
    expect(onExpire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(timer.running()).toBe(false);
  });

  it('starts the time over on each restart', () => {
    const onExpire = vi.fn();
    const timer = createAutoDismiss(8000, onExpire);
    timer.restart();
    vi.advanceTimersByTime(6000);
    timer.restart();
    vi.advanceTimersByTime(6000);
    expect(onExpire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('waits while held and gives the full time again once released', () => {
    const onExpire = vi.fn();
    const timer = createAutoDismiss(8000, onExpire);
    timer.restart();
    vi.advanceTimersByTime(7000);
    timer.hold('hover');
    vi.advanceTimersByTime(60_000);
    expect(onExpire).not.toHaveBeenCalled();
    timer.release('hover');
    vi.advanceTimersByTime(7999);
    expect(onExpire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('keeps waiting until every reason is released', () => {
    const onExpire = vi.fn();
    const timer = createAutoDismiss(8000, onExpire);
    timer.restart();
    timer.hold('hover');
    timer.hold('focus');
    timer.release('hover');
    vi.advanceTimersByTime(20_000);
    expect(onExpire).not.toHaveBeenCalled();
    timer.release('focus');
    vi.advanceTimersByTime(8000);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('does not start the time on a restart while held', () => {
    const onExpire = vi.fn();
    const timer = createAutoDismiss(8000, onExpire);
    timer.restart();
    timer.hold('hover');
    timer.restart();
    expect(timer.running()).toBe(false);
    vi.advanceTimersByTime(20_000);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('stops for good when closed, and a late release does not start it again', () => {
    const onExpire = vi.fn();
    const timer = createAutoDismiss(8000, onExpire);
    timer.restart();
    timer.hold('focus');
    timer.stop();
    timer.release('focus');
    vi.advanceTimersByTime(20_000);
    expect(onExpire).not.toHaveBeenCalled();
    expect(timer.running()).toBe(false);
  });

  it('runs on injected timers', () => {
    const scheduled: Array<{ callback: () => void; ms: number }> = [];
    const cleared: unknown[] = [];
    const onExpire = vi.fn();
    const timer = createAutoDismiss(8000, onExpire, {
      setTimeout: (callback, ms) => scheduled.push({ callback, ms }),
      clearTimeout: (handle) => cleared.push(handle),
    });
    timer.restart();
    timer.restart();
    expect(scheduled.map((entry) => entry.ms)).toEqual([8000, 8000]);
    expect(cleared).toEqual([1]);
    scheduled[1].callback();
    expect(onExpire).toHaveBeenCalledTimes(1);
  });
});
