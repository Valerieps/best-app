import { describe, expect, it } from 'vitest';
import { createProject } from '../application/projects';
import { createTestContext } from '../test/fixtures';
import {
  exportBackup,
  getImportSnapshotDate,
  importBackup,
  previewImport,
  undoImport,
} from './backupRepository';

const NOW = new Date('2026-10-11T18:00:00Z');

describe('backup repository', () => {
  it('round-trips all data through a backup', async () => {
    const source = createTestContext();
    await createProject(source.ctx, 'Data Studios');
    const backup = await exportBackup(source.db, NOW);

    const target = createTestContext();
    await importBackup(target.db, JSON.parse(JSON.stringify(backup)), NOW, 'import-event');

    const exported = await exportBackup(target.db, NOW);
    const imported = exported.tables.events.find((event) => event.id === 'import-event');
    exported.tables.events = exported.tables.events.filter((event) => event !== imported);
    expect(exported).toEqual(backup);
  });

  it('leaves an event of the import, and of its undo, in the history (issue #37)', async () => {
    const { db } = createTestContext();
    const backup = await exportBackup(db, NOW);

    await importBackup(db, backup, NOW, 'import-event');
    expect(await db.events.get('import-event')).toMatchObject({
      type: 'backup.imported',
      entityType: 'backup',
      at: NOW.toISOString(),
      data: { exportedAt: backup.exportedAt, schemaVersion: backup.schemaVersion },
    });

    const later = new Date('2026-10-11T18:30:00Z');
    await undoImport(db, later, 'undo-event');
    // The undo restores the history from before the import, plus the event of the undo.
    expect(await db.events.get('import-event')).toBeUndefined();
    expect(await db.events.get('undo-event')).toMatchObject({ type: 'backup.importUndone', data: { importedAt: NOW.toISOString() } });
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

    await undoImport(db, NOW, 'undo-event');
    const restored = await exportBackup(db, NOW);
    restored.tables.events = restored.tables.events.filter((event) => event.id !== 'undo-event');
    expect(restored).toEqual(before);
    expect(await getImportSnapshotDate(db)).toBeNull();
  });

  it('refuses to undo when there was no import', async () => {
    const { db } = createTestContext();
    await expect(undoImport(db)).rejects.toThrow();
  });
});
