import type { AppContext } from '../application/ports';
import { AppDatabase } from '../infrastructure/db';
import { DexieReader } from '../infrastructure/dexieReader';
import { DexieStore } from '../infrastructure/dexieStore';

let databaseCounter = 0;

/** A fresh, isolated database per test. */
export function createTestDatabase(): AppDatabase {
  databaseCounter++;
  return new AppDatabase(`best-app-test-${databaseCounter}`);
}

export function fixedClock(iso: string) {
  let current = new Date(iso);
  return {
    now: () => new Date(current),
    set: (next: string) => {
      current = new Date(next);
    },
  };
}

export function sequentialIds(prefix = 'id') {
  let counter = 0;
  return { next: () => `${prefix}-${++counter}` };
}

/** Times are local (no Z), so day keys match what a user in any time zone would see. */
export function createTestContext(db = createTestDatabase(), now = '2026-10-11T12:00:00') {
  const clock = fixedClock(now);
  const ctx: AppContext = {
    store: new DexieStore(db),
    clock,
    ids: sequentialIds(),
  };
  return { db, ctx, clock, reader: new DexieReader(db) };
}
