import { afterEach, describe, expect, it, vi } from 'vitest';
import { dismissSaveErrors, saveErrorCount } from './saveErrors';
import { enqueue, runAfterPendingWrites } from './writeQueue';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => (resolve = done));
  return { promise, resolve };
}

describe('write queue', () => {
  afterEach(() => {
    dismissSaveErrors();
    vi.restoreAllMocks();
  });

  it('runs an import only after the editor writes already queued', async () => {
    const order: string[] = [];
    const slowSave = deferred();
    const save = enqueue(async () => {
      await slowSave.promise;
      order.push('line saved');
    });
    const importing = runAfterPendingWrites(async () => {
      order.push('import');
    });
    await Promise.resolve();
    expect(order).toEqual([]);
    slowSave.resolve();
    await Promise.all([save, importing]);
    expect(order).toEqual(['line saved', 'import']);
  });

  it('holds editor writes queued during an import until it ends', async () => {
    const order: string[] = [];
    const slowImport = deferred();
    const importing = runAfterPendingWrites(async () => {
      await slowImport.promise;
      order.push('import');
    });
    const save = enqueue(async () => {
      order.push('line saved');
    });
    slowImport.resolve();
    await Promise.all([importing, save]);
    expect(order).toEqual(['import', 'line saved']);
  });

  it('gives a failed import back to the caller without counting a failed save', async () => {
    await expect(runAfterPendingWrites(() => Promise.reject(new Error('bad file')))).rejects.toThrow('bad file');
    expect(await enqueue(() => Promise.resolve('next write'))).toBe('next write');
    expect(saveErrorCount()).toBe(0);
  });
});
