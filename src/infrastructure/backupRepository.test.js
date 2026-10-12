import { describe, expect, it } from 'vitest';
import { createProject } from '../application/projects';
import { createTestContext } from '../test/fixtures';
import { exportBackup, getImportSnapshotDate, importBackup, previewImport, undoImport, } from './backupRepository';
const NOW = new Date('2026-10-11T18:00:00Z');
describe('backup repository', () => {
    it('round-trips all data through a backup', async () => {
        const source = createTestContext();
        await createProject(source.ctx, 'Data Studios');
        const backup = await exportBackup(source.db, NOW);
        const target = createTestContext();
        await importBackup(target.db, JSON.parse(JSON.stringify(backup)), NOW);
        expect(await exportBackup(target.db, NOW)).toEqual(backup);
    });
    it('warns about what an import would delete', async () => {
        const { db, ctx } = createTestContext();
        const backup = await exportBackup(db, NOW);
        await createProject(ctx, 'Created after the backup');
        const loss = await previewImport(db, backup);
        expect(loss.hasLoss).toBe(true);
        expect(loss.projects.removed).toBe(1);
        expect(loss.missingEvents).toBe(1);
    });
    it('replaces everything and can undo the import', async () => {
        const { db, ctx } = createTestContext();
        const empty = await exportBackup(db, NOW);
        await createProject(ctx, 'Kept by undo');
        const before = await exportBackup(db, NOW);
        await importBackup(db, empty, NOW);
        expect(await db.projects.count()).toBe(0);
        expect(await getImportSnapshotDate(db)).toBe(NOW.toISOString());
        await undoImport(db);
        expect(await exportBackup(db, NOW)).toEqual(before);
        expect(await getImportSnapshotDate(db)).toBeNull();
    });
    it('refuses to undo when there was no import', async () => {
        const { db } = createTestContext();
        await expect(undoImport(db)).rejects.toThrow();
    });
});
