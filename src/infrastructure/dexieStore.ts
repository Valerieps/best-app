import type { Table } from 'dexie';
import type { Repository, Store, StoreTransaction } from '../application/ports';
import type { AppDatabase } from './db';

function repository<T>(table: Table<T, string>): Repository<T> {
  return {
    get: (key) => table.get(key),
    put: async (entity) => {
      await table.put(entity);
    },
  };
}

export class DexieStore implements Store {
  /** @param onCommit called after every successful transaction, e.g. to schedule a backup */
  constructor(
    private readonly db: AppDatabase,
    private readonly onCommit: () => void = () => {},
  ) {}

  async transaction<T>(work: (tx: StoreTransaction) => Promise<T>): Promise<T> {
    const db = this.db;
    const result = await db.transaction('rw', [db.blocks, db.sections, db.projects, db.days, db.events], () =>
      work({
        blocks: repository(db.blocks),
        sections: repository(db.sections),
        projects: repository(db.projects),
        days: repository(db.days),
        appendEvent: async (event) => {
          // `add` (not `put`) so an existing event can never be overwritten.
          await db.events.add(event);
        },
      }),
    );
    this.onCommit();
    return result;
  }
}
