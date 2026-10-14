import { describe, expect, it, vi } from 'vitest';
import { loadLatest } from './loadLatest';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe('loadLatest', () => {
  it('hands over the answer while not cancelled', async () => {
    const onValue = vi.fn();
    loadLatest(() => Promise.resolve('day 1'), onValue, vi.fn());
    await Promise.resolve();
    expect(onValue).toHaveBeenCalledWith('day 1');
  });

  it('drops an answer that arrives after it was cancelled', async () => {
    const old = deferred<string>();
    const onValue = vi.fn();
    const cancel = loadLatest(() => old.promise, onValue, vi.fn());
    cancel();
    loadLatest(() => Promise.resolve('day 2'), onValue, vi.fn());
    old.resolve('day 1');
    await old.promise;
    await Promise.resolve();
    expect(onValue.mock.calls).toEqual([['day 2']]);
  });

  it('reports a failure, but not after it was cancelled', async () => {
    const failing = deferred<string>();
    const onError = vi.fn();
    loadLatest(() => Promise.reject(new Error('broken')), vi.fn(), onError);
    const cancel = loadLatest(() => failing.promise, vi.fn(), onError);
    cancel();
    failing.reject(new Error('late'));
    await failing.promise.catch(() => {});
    await Promise.resolve();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toEqual(new Error('broken'));
  });
});
