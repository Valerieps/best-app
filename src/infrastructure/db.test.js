import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { AppDatabase } from './db';
describe('database version 6', () => {
    it('turns the month priority projects of a version 5 database into week lists', async () => {
        const name = 'best-app-upgrade-test';
        // A version 5 database, as the app left it before the priority projects moved to the week.
        const old = new Dexie(name);
        old.version(5).stores({ priorities: 'id' });
        await old.open();
        await old.table('priorities').bulkPut([
            { id: 'month:2026-10', scope: 'month', period: '2026-10', itemIds: ['p1', 'p2'], updatedAt: '2026-10-02T10:00:00.000Z' },
            { id: 'day:2026-10-11', scope: 'day', period: '2026-10-11', itemIds: ['t1'], updatedAt: '' },
        ]);
        old.close();
        const db = new AppDatabase(name);
        const rows = await db.priorities.toArray();
        expect(rows).toEqual([
            { id: 'day:2026-10-11', scope: 'day', period: '2026-10-11', itemIds: ['t1'], updatedAt: '' },
            { id: 'weekProjects:2026-W40', scope: 'weekProjects', period: '2026-W40', itemIds: ['p1', 'p2'], updatedAt: '2026-10-02T10:00:00.000Z' },
        ]);
        db.close();
    });
});
