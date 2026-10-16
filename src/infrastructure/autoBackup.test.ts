import { describe, expect, it, vi } from 'vitest';
import { createBackup, emptyTables } from '../application/backup';
import { createProject } from '../application/projects';
import { createTestContext } from '../test/fixtures';
import { AutoBackup } from './autoBackup';
import { exportBackup, importBackup } from './backupRepository';
import { serializeBackup, type BackupFileHandle, type BackupFolderHandle, type BackupHandle, type HandleStorage } from './backupFiles';

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

interface MemoryFolder {
  handle: BackupFolderHandle;
  files: Map<string, ReturnType<typeof memoryFile>>;
  folders: Map<string, MemoryFolder>;
  state: { permission: PermissionState };
}

/** An in-memory folder with files and subfolders, like the Drive folder of the backup. */
function memoryFolder(name = 'Backup', initial: Record<string, string> = {}): MemoryFolder {
  const files = new Map<string, ReturnType<typeof memoryFile>>();
  const folders = new Map<string, MemoryFolder>();
  for (const [fileName, contents] of Object.entries(initial)) files.set(fileName, memoryFile(fileName, contents));
  const state: { permission: PermissionState } = { permission: 'granted' };
  const handle: BackupFolderHandle = {
    kind: 'directory',
    name,
    queryPermission: async () => state.permission,
    requestPermission: async () => (state.permission = 'granted'),
    getFileHandle: async (fileName, options) => {
      if (!files.has(fileName)) {
        if (!options?.create) throw new DOMException('Not found', 'NotFoundError');
        files.set(fileName, memoryFile(fileName));
      }
      return files.get(fileName)!.handle;
    },
    getDirectoryHandle: async (folderName, options) => {
      if (!folders.has(folderName)) {
        if (!options?.create) throw new DOMException('Not found', 'NotFoundError');
        folders.set(folderName, memoryFolder(folderName));
      }
      return folders.get(folderName)!.handle;
    },
    removeEntry: async (fileName) => {
      files.delete(fileName);
    },
    keys: async function* () {
      yield* files.keys();
    },
  };
  return { handle, files, folders, state };
}

function memoryHandles(initial: BackupHandle | null = null): HandleStorage {
  let saved = initial;
  return { load: async () => saved, save: async (handle) => void (saved = handle) };
}

function setup(options: { remembered?: BackupHandle | null; supported?: boolean; delayMs?: number; picked?: MemoryFolder } = {}) {
  const { db, ctx } = createTestContext();
  const picked = options.picked ?? memoryFolder('Backup');
  const clock = { now: NOW };
  const auto = new AutoBackup({
    db,
    handles: memoryHandles(options.remembered ?? null),
    pick: async () => picked.handle,
    supported: options.supported ?? true,
    now: () => clock.now,
    delayMs: options.delayMs ?? 10,
  });
  return { db, ctx, auto, picked, clock };
}

/** The names of the dated copies in a backup folder, sorted. */
function copyNames(folder: MemoryFolder): string[] {
  return [...(folder.folders.get('copias')?.files.keys() ?? [])].sort();
}

describe('AutoBackup', () => {
  it('reports unsupported browsers', async () => {
    const { auto } = setup({ supported: false });
    await auto.init();
    expect(auto.getState()).toEqual({ status: 'unsupported' });
  });

  it('waits for the user to choose a folder, then writes everything to it, with a first dated copy', async () => {
    const { ctx, auto, picked } = setup();
    await createProject(ctx, 'Data Studios');
    await auto.init();
    expect(auto.getState()).toEqual({ status: 'noFile' });

    await auto.chooseFolder();

    expect(auto.getState()).toMatchObject({ status: 'active', fileName: 'Backup', saving: false, copies: 'ok' });
    expect(JSON.parse(picked.files.get('best-app-backup.json')!.file.contents).tables.projects).toHaveLength(1);
    expect(copyNames(picked)).toHaveLength(1);
  });

  it('keeps one copy every two hours today, and the last version of each earlier day', async () => {
    const { ctx, auto, picked, clock } = setup();
    clock.now = new Date(2026, 9, 13, 9, 0);
    await auto.init();
    await auto.chooseFolder();
    await createProject(ctx, 'A');
    clock.now = new Date(2026, 9, 13, 10, 0);
    await auto.flush();
    // Within two hours of the first copy: only the backup file changes.
    expect(copyNames(picked)).toEqual(['best-app-2026-10-13-09h00.json']);

    await createProject(ctx, 'B');
    clock.now = new Date(2026, 9, 13, 23, 30);
    await auto.flush();
    expect(copyNames(picked)).toEqual(['best-app-2026-10-13-09h00.json', 'best-app-2026-10-13-23h30.json']);

    // The next morning, the night's version is kept as the day's last, and only it stays.
    await createProject(ctx, 'C');
    clock.now = new Date(2026, 9, 14, 8, 0);
    await auto.flush();
    expect(copyNames(picked)).toEqual(['best-app-2026-10-13-23h30.json', 'best-app-2026-10-14-08h00.json']);
    const lastOfYesterday = picked.folders.get('copias')!.files.get('best-app-2026-10-13-23h30.json')!.file.contents;
    expect(JSON.parse(lastOfYesterday).tables.projects).toHaveLength(2);
  });

  it('lists the copies and reads one back, to restore it', async () => {
    const { ctx, auto } = setup();
    await createProject(ctx, 'A');
    await auto.init();
    await auto.chooseFolder();

    const [copy] = await auto.listCopies();
    expect(JSON.parse(await auto.readCopy(copy.name)).tables.projects).toHaveLength(1);
  });

  it('checks a backup already in the chosen folder before writing over it', async () => {
    const source = createTestContext();
    await createProject(source.ctx, 'Only in the folder');
    const contents = serializeBackup(await exportBackup(source.db, NOW));
    const folder = memoryFolder('Drive', { 'best-app-backup.json': contents });
    const { auto } = setup({ picked: folder });
    await auto.init();

    await auto.chooseFolder();

    expect(auto.getState()).toMatchObject({ status: 'blocked', reason: 'fileHasMoreData' });
    expect(folder.files.get('best-app-backup.json')!.file.contents).toBe(contents);
  });

  it('keeps writing to a single file chosen before the folders, without copies', async () => {
    const remembered = memoryFile();
    const { auto } = setup({ remembered: remembered.handle });

    await auto.init();

    expect(auto.getState()).toMatchObject({ status: 'active', copies: 'off' });
    expect(remembered.file.writes).toBe(1);
    expect(await auto.listCopies()).toEqual([]);
  });

  it('rewrites the file after changes, merging a burst into one write', async () => {
    const remembered = memoryFile();
    // A delay long enough that both changes land in it even under a full parallel run, where
    // saving a project can take longer than the 10 ms the other tests use.
    const { ctx, auto } = setup({ remembered: remembered.handle, delayMs: 300 });
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

  it('with an interval, keeps writing while changes never stop', async () => {
    const remembered = memoryFile();
    const { auto } = setup({ remembered: remembered.handle, delayMs: 100 });
    await auto.init();
    auto.setInterval('hour');
    const writesAfterInit = remembered.file.writes;

    // A change every 20 ms would postpone a restarting wait forever.
    for (let i = 0; i < 30; i++) {
      auto.schedule();
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    expect(remembered.file.writes).toBeGreaterThan(writesAfterInit);
  });

  it('writes when the app is hidden only after every change, not with an interval', async () => {
    const remembered = memoryFile();
    const { auto } = setup({ remembered: remembered.handle, delayMs: 60_000 });
    await auto.init();
    const writesAfterInit = remembered.file.writes;

    auto.setInterval('hour');
    auto.schedule();
    auto.onHidden();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(remembered.file.writes).toBe(writesAfterInit);

    auto.setInterval('afterChange');
    auto.onHidden();
    await vi.waitFor(() => expect(remembered.file.writes).toBe(writesAfterInit + 1), { timeout: 2000 });
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
