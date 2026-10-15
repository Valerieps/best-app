import { afterEach, describe, expect, it, vi } from 'vitest';
import { caretInField } from './focus';
import { hasFocusTransition, runFocusTransition, settleWithin } from './focusTransition';

afterEach(() => {
  vi.useRealTimers();
});

describe('settleWithin', () => {
  it('resolves when the new view shows', async () => {
    let shown = false;
    await settleWithin(
      Promise.resolve().then(() => {
        shown = true;
      }),
      1000,
    );
    expect(shown).toBe(true);
  });

  it('gives up after the wait, so the screen never stays frozen', async () => {
    vi.useFakeTimers();
    let settled = false;
    void settleWithin(new Promise<void>(() => {}), 800).then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(799);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toBe(true);
  });

  it('resolves even when the change fails', async () => {
    await expect(settleWithin(Promise.reject(new Error('no')), 1000)).resolves.toBeUndefined();
  });
});

describe('runFocusTransition without view transitions', () => {
  it('swaps the view and then finishes', async () => {
    expect(hasFocusTransition()).toBe(false);
    const steps: string[] = [];
    await new Promise<void>((resolve) => {
      runFocusTransition(
        async () => {
          steps.push('swap');
        },
        () => {
          steps.push('done');
          resolve();
        },
      );
    });
    expect(steps).toEqual(['swap', 'done']);
  });
});

describe('caretInField', () => {
  it('counts the caret on the whole line, minus what the field leaves out', () => {
    expect(caretInField(5, 10, 2)).toBe(3);
    expect(caretInField(2, 10, 2)).toBe(0);
    expect(caretInField(0, 10, 2)).toBe(0);
    expect(caretInField(40, 10, 2)).toBe(10);
    expect(caretInField('end', 10, 2)).toBe(10);
    expect(caretInField(4, 10)).toBe(4);
  });
});
