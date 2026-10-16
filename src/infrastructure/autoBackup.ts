import { autoBackupWait, decideAutoBackup, DEFAULT_AUTO_BACKUP_INTERVAL } from '../application/autoBackup';
import type { AutoBackupInterval } from '../domain/entities';
import { BACKUP_SCHEMA_VERSION, createBackup, parseBackup, type BackupFile, type ImportLoss } from '../application/backup';
import { COPIES_FOLDER, copiesToDelete, copyBeforeOverwrite, copyName, listCopies, needsNewCopy } from '../application/backupCopies';
import {
  clearAutoBackupOverwrite,
  isAutoBackupOverwriteAllowed,
  markBackupDone,
  readAllTables,
} from './backupRepository';
import {
  BACKUP_FILE_NAME,
  fileNames,
  isFolder,
  serializeBackup,
  writeTextToHandle,
  type BackupFileHandle,
  type BackupFolderHandle,
  type BackupHandle,
  type HandleStorage,
} from './backupFiles';
import type { AppDatabase } from './db';

/**
 * How the dated copies are doing: kept in the backup folder, failing, or off because the backup
 * still goes to a single file chosen before the folders (issue #28).
 */
export type CopiesStatus = 'ok' | 'failed' | 'off';

export type AutoBackupState =
  | { status: 'loading' }
  /** The browser has no File System Access API (not Chrome on desktop). */
  | { status: 'unsupported' }
  | { status: 'noFile' }
  /** Chrome needs a click to allow writing to the folder again in this session. */
  | { status: 'needsPermission'; fileName: string }
  | { status: 'active'; fileName: string; lastSavedAt: string | null; saving: boolean; copies: CopiesStatus }
  | { status: 'blocked'; fileName: string; reason: 'invalidFile' }
  | { status: 'blocked'; fileName: string; reason: 'fileHasMoreData'; fileBackup: BackupFile; loss: ImportLoss }
  | { status: 'error'; fileName: string };

export interface AutoBackupDeps {
  db: AppDatabase;
  handles: HandleStorage;
  pick: () => Promise<BackupFolderHandle>;
  supported: boolean;
  now: () => Date;
  /** Replaces every wait, for tests. */
  delayMs?: number;
}

/** A dated copy, newest first in the lists. */
export interface BackupCopy {
  name: string;
  at: Date;
}

function parseText(text: string): BackupFile | null {
  if (text.trim() === '') return null;
  try {
    const result = parseBackup(JSON.parse(text));
    return result.ok ? result.backup : null;
  } catch {
    return null;
  }
}

/**
 * Rewrites the backup file in the chosen folder a few seconds after the last change, and keeps
 * dated copies in its subfolder (`application/backupCopies.ts`). Each automatic write first checks
 * the file and refuses to overwrite data the browser does not have.
 */
export class AutoBackup {
  private state: AutoBackupState = { status: 'loading' };
  private readonly listeners = new Set<() => void>();
  private handle: BackupHandle | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running: Promise<void> | null = null;
  private runAgain = false;
  private interval: AutoBackupInterval = DEFAULT_AUTO_BACKUP_INTERVAL;

  constructor(private readonly deps: AutoBackupDeps) {}

  getState = (): AutoBackupState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  async init(): Promise<void> {
    if (!this.deps.supported) return this.setState({ status: 'unsupported' });
    this.handle = await this.deps.handles.load();
    if (!this.handle) return this.setState({ status: 'noFile' });
    const permission = await this.handle.queryPermission({ mode: 'readwrite' });
    if (permission !== 'granted') return this.setState({ status: 'needsPermission', fileName: this.handle.name });
    this.setState(this.activeState(null, false, isFolder(this.handle) ? 'ok' : 'off'));
    // Catch up on changes made after the last write, e.g. if the tab closed during the delay.
    await this.flush();
  }

  /** The interval chosen in the settings. A change already waiting keeps waiting, with the new interval. */
  setInterval(interval: AutoBackupInterval): void {
    if (interval === this.interval) return;
    this.interval = interval;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      this.schedule();
    }
  }

  /** Call after every change. Bursts of changes become a single write. */
  schedule(): void {
    const wait = autoBackupWait(this.interval);
    if (this.timer) {
      if (!wait.restartOnChange) return;
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => void this.flush(), this.deps.delayMs ?? wait.ms);
  }

  /**
   * When the app is hidden or closed. After every change, it writes right away, so a closed tab
   * loses nothing. With an interval it waits: the data is still in the browser, and the next
   * opening catches up.
   */
  onHidden(): void {
    if (autoBackupWait(this.interval).restartOnChange) void this.flush();
  }

  /** Writes now if possible. Concurrent calls are merged into one more write after the current one. */
  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.running) {
      this.runAgain = true;
      return this.running;
    }
    this.running = (async () => {
      do {
        this.runAgain = false;
        await this.write();
      } while (this.runAgain);
    })().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  /** From a click: asks Chrome to allow writing to the remembered folder, then writes. */
  async resume(): Promise<void> {
    if (!this.handle) return;
    const permission = await this.handle.requestPermission({ mode: 'readwrite' });
    if (permission !== 'granted') return this.setState({ status: 'needsPermission', fileName: this.handle.name });
    await this.flush();
  }

  /**
   * From a click: the user picks the backup folder. A backup file already in it goes through the
   * same check as any automatic write, since picking a folder, unlike saving over a file, shows
   * no "replace?" prompt: a folder with more data than the browser blocks instead of losing it.
   */
  async chooseFolder(): Promise<void> {
    const folder = await this.deps.pick();
    await this.deps.handles.save(folder);
    this.handle = folder;
    this.setState(this.activeState(null, false, 'ok'));
    await this.flush();
  }

  /** The dated copies in the backup folder, newest first; empty without a folder or permission. */
  async listCopies(): Promise<BackupCopy[]> {
    const folder = this.handle && isFolder(this.handle) ? this.handle : null;
    if (!folder || (await folder.queryPermission({ mode: 'readwrite' })) !== 'granted') return [];
    try {
      return listCopies(await fileNames(await folder.getDirectoryHandle(COPIES_FOLDER)));
    } catch {
      // No copies folder yet.
      return [];
    }
  }

  /** The contents of one dated copy, to restore it through the import. */
  async readCopy(name: string): Promise<string> {
    if (!this.handle || !isFolder(this.handle)) throw new Error('There is no backup folder');
    const copies = await this.handle.getDirectoryHandle(COPIES_FOLDER);
    return (await (await copies.getFileHandle(name)).getFile()).text();
  }

  private async write(): Promise<void> {
    const handle = this.handle;
    if (!handle) return;
    if ((await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
      return this.setState({ status: 'needsPermission', fileName: handle.name });
    }

    const previous = this.state.status === 'active' ? this.state.lastSavedAt : null;
    const copiesBefore: CopiesStatus = isFolder(handle) ? 'ok' : 'off';
    this.setState(this.activeState(previous, true, this.state.status === 'active' ? this.state.copies : copiesBefore));
    try {
      const file: BackupFileHandle = isFolder(handle) ? await handle.getFileHandle(BACKUP_FILE_NAME, { create: true }) : handle;
      const fileText = await (await file.getFile()).text();
      const current = await readAllTables(this.deps.db);
      const decision = decideAutoBackup(fileText, current, await isAutoBackupOverwriteAllowed(this.deps.db));
      if (decision.kind === 'blocked') {
        return this.setState(
          decision.reason === 'invalidFile'
            ? { status: 'blocked', fileName: handle.name, reason: 'invalidFile' }
            : { status: 'blocked', fileName: handle.name, ...decision },
        );
      }
      const now = this.deps.now();
      const backup = createBackup(current, now);
      const text = serializeBackup(backup);
      // The copies never stop the backup itself: a failure only shows in "Dados e backup".
      const copies = isFolder(handle) ? await this.keepCopies(handle, fileText, text, now) : 'off';
      await writeTextToHandle(file, text);
      await markBackupDone(this.deps.db, now);
      await clearAutoBackupOverwrite(this.deps.db);
      this.setState(this.activeState(now.toISOString(), false, copies));
    } catch {
      this.setState({ status: 'error', fileName: handle.name });
    }
  }

  /**
   * Keeps the dated copies: the file's previous contents when they are an earlier day's last
   * version (or older data, before a migration), a copy of what is about to be written every
   * two hours, and deletes the copies beyond the limits.
   */
  private async keepCopies(folder: BackupFolderHandle, previousText: string, text: string, now: Date): Promise<CopiesStatus> {
    try {
      const copies = await folder.getDirectoryHandle(COPIES_FOLDER, { create: true });
      const names = await fileNames(copies);
      const before = copyBeforeOverwrite(parseText(previousText), names, now, BACKUP_SCHEMA_VERSION);
      if (before) {
        await writeTextToHandle(await copies.getFileHandle(before, { create: true }), previousText);
        names.push(before);
      }
      if (needsNewCopy(names, now)) {
        const name = copyName(now);
        await writeTextToHandle(await copies.getFileHandle(name, { create: true }), text);
        if (!names.includes(name)) names.push(name);
      }
      for (const name of copiesToDelete(names, now)) await copies.removeEntry(name);
      return 'ok';
    } catch {
      return 'failed';
    }
  }

  private activeState(lastSavedAt: string | null, saving: boolean, copies: CopiesStatus): AutoBackupState {
    return { status: 'active', fileName: this.handle?.name ?? '', lastSavedAt, saving, copies };
  }

  private setState(next: AutoBackupState): void {
    this.state = next;
    this.listeners.forEach((listener) => listener());
  }
}
