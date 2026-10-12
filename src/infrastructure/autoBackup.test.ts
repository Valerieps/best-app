import { describe, expect, it, vi } from 'vitest';
import { createBackup, emptyTables } from '../application/backup';
import { createProject } from '../application/projects';
import { createTestContext } from '../test/fixtures';
import { AutoBackup } from './autoBackup';
import { exportBackup, importBackup } from './backupRepository';
import { serializeBackup, type BackupFileHandle, type HandleStorage } from './backupFiles';

const NOW = new Date('2026-10-11T18:00:00Z');

function memoryFile(name = 'best-app-backup.json', contents = '') {
  const file = {
    contents,
    permission: 'granted' as PermissionState,
    grantOnRequest: true,
    writes: 0,
  };
  const handle: BackupFileHandle = {
    name,
    queryPermission: async () => file.permission,
    requestPermission: async () => {
      if (file.grantOnRequest) file.permission = 'granted';
      return file.permission;
    },
    getFile: async () => ({ text: async () => file.contents }),
    createWritable: async () => {
      let buffer = '';
      return {
        write: async (data: string) => {
          buffer += data;
        },
        close: async () => {
          file.contents = buffer;
          file.writes++;
        },
      };
    },
  };
  return { file, handle };
}

function memoryHandles(initial: BackupFileHandle | null = null): HandleStorage {
  let saved = initial;
  return { load: async () => saved, save: async (handle) => void (saved = handle) };
}

function setup(options: { remembered?: BackupFileHandle | null; supported?: boolean } = {}) {
  const { db, ctx } = createTestContext();
  const picked = memoryFile('picked.json');
  const auto = new AutoBackup({
    db,
    handles: memoryHandles(options.remembered ?? null),
    pick: async () => picked.handle,
    supported: options.supported ?? true,
    now: () => NOW,
    delayMs: 10,
  });
  return { db, ctx, auto, picked };
}

describe('AutoBackup', () => {
  it('reports unsupported browsers', async () => {
    const { auto } = setup({ supported: false });
    await auto.init();
    expect(auto.getState()).toEqual({ status: 'unsupported' });
  });

  it('waits for the user to choose a file, then writes everything to it', async () => {
    const { ctx, auto, picked } = setup();
    await createProject(ctx, 'Data Studios');
    await auto.init();
    expect(auto.getState()).toEqual({ status: 'noFile' });

    await auto.chooseFile();

    expect(auto.getState()).toMatchObject({ status: 'active', fileName: 'picked.json', saving: false });
    expect(JSON.parse(picked.file.contents).tables.projects).toHaveLength(1);
  });

  it('rewrites the file after changes, merging a burst into one write', async () => {
    const remembered = memoryFile();
    const { ctx, auto } = setup({ remembered: remembered.handle });
    await auto.init();
    const writesAfterInit = remembered.file.writes;

    await createProject(ctx, 'A');
    auto.schedule();
    await createProject(ctx, 'B');
    auto.schedule();
    // Wait for the outcome instead of a fixed time: under a full parallel run the write is slower.
    await vi.waitFor(() => expect(JSON.parse(remembered.file.contents || '{}').tables?.projects).toHaveLength(2), { timeout: 2000 });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(remembered.file.writes).toBe(writesAfterInit + 1);
  });

  it('pauses until the user allows writing again in a new session', async () => {
    const remembered = memoryFile();
    remembered.file.permission = 'prompt';
    const { auto } = setup({ remembered: remembered.handle });

    await auto.init();
    expect(auto.getState()).toEqual({ status: 'needsPermission', fileName: 'best-app-backup.json' });

    await auto.resume();
    expect(auto.getState()).toMatchObject({ status: 'active' });
    expect(remembered.file.writes).toBe(1);
  });

  it('stays paused if the user denies permission', async () => {
    const remembered = memoryFile();
    remembered.file.permission = 'prompt';
    remembered.file.grantOnRequest = false;
    const { auto } = setup({ remembered: remembered.handle });
    await auto.init();

    await auto.resume();

    expect(auto.getState()).toMatchObject({ status: 'needsPermission' });
    expect(remembered.file.writes).toBe(0);
  });

  it('never overwrites a backup that has data the browser lost', async () => {
    const source = createTestContext();
    await createProject(source.ctx, 'Only in the file');
    const fileContents = serializeBackup(await exportBackup(source.db, NOW));
    const remembered = memoryFile('best-app-backup.json', fileContents);
    const { auto } = setup({ remembered: remembered.handle });

    await auto.init();

    expect(auto.getState()).toMatchObject({ status: 'blocked', reason: 'fileHasMoreData' });
    expect(remembered.file.contents).toBe(fileContents);
  });

  it('overwrites after the user imports a backup on purpose', async () => {
    const source = createTestContext();
    await createProject(source.ctx, 'Only in the file');
    const remembered = memoryFile('best-app-backup.json', serializeBackup(await exportBackup(source.db, NOW)));
    const { db, auto } = setup({ remembered: remembered.handle });
    await auto.init();
    expect(auto.getState()).toMatchObject({ status: 'blocked' });

    await importBackup(db, createBackup(emptyTables(), NOW), NOW);
    await auto.flush();

    expect(auto.getState()).toMatchObject({ status: 'active' });
    expect(JSON.parse(remembered.file.contents).tables.projects).toHaveLength(0);
  });

  it('never writes into a file that is not a backup', async () => {
    const remembered = memoryFile('notes.json', '{"my": "other data"}');
    const { auto } = setup({ remembered: remembered.handle });

    await auto.init();

    expect(auto.getState()).toEqual({ status: 'blocked', fileName: 'notes.json', reason: 'invalidFile' });
    expect(remembered.file.contents).toBe('{"my": "other data"}');
  });
});
