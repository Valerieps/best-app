import type { BackupFile } from '../application/backup';
import type { AppDatabase } from './db';

/**
 * Moves backups between the browser and the user's disk. Everything stays on the machine:
 * the File System Access API writes straight to a file the user picked (which may live in a
 * synced Google Drive folder), and the download fallback uses a local Blob URL.
 */

const FILE_HANDLE_KEY = 'backupFileHandle';

/** The parts of a FileSystemFileHandle the app uses; tests provide an in-memory version. */
export interface BackupFileHandle {
  readonly kind?: 'file';
  readonly name: string;
  queryPermission(options: { mode: 'readwrite' }): Promise<PermissionState>;
  requestPermission(options: { mode: 'readwrite' }): Promise<PermissionState>;
  getFile(): Promise<{ text(): Promise<string> }>;
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
}

/**
 * The parts of a FileSystemDirectoryHandle the app uses: the folder of the automatic backup,
 * with the backup file and the subfolder of dated copies (issue #28).
 */
export interface BackupFolderHandle {
  readonly kind: 'directory';
  readonly name: string;
  queryPermission(options: { mode: 'readwrite' }): Promise<PermissionState>;
  requestPermission(options: { mode: 'readwrite' }): Promise<PermissionState>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<BackupFileHandle>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<BackupFolderHandle>;
  removeEntry(name: string): Promise<void>;
  keys(): AsyncIterable<string>;
}

/** What the automatic backup writes to: a folder, or a single file chosen before the folders. */
export type BackupHandle = BackupFileHandle | BackupFolderHandle;

export function isFolder(handle: BackupHandle): handle is BackupFolderHandle {
  return handle.kind === 'directory';
}

/** Where the chosen backup folder (or file) is remembered between sessions. */
export interface HandleStorage {
  load(): Promise<BackupHandle | null>;
  save(handle: BackupHandle): Promise<void>;
}

/** The backup file inside the chosen folder. It has no date: it is rewritten after every change. */
export const BACKUP_FILE_NAME = 'best-app-backup.json';

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: { description: string; accept: Record<string, string[]> }[];
}

type PickerWindow = Window & {
  showSaveFilePicker?: (options: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
  showDirectoryPicker?: (options: { id?: string; mode: 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
};

export function backupFileName(now: Date): string {
  const stamp = now.toISOString().slice(0, 10);
  return `best-app-backup-${stamp}.json`;
}

export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2);
}

export function canPickBackupFolder(): boolean {
  return typeof window !== 'undefined' && typeof (window as PickerWindow).showDirectoryPicker === 'function';
}

/** Downloads the backup through a local Blob URL. Nothing leaves the machine. */
export function downloadBackup(backup: BackupFile, now: Date): void {
  const url = URL.createObjectURL(new Blob([serializeBackup(backup)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = backupFileName(now);
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Asks the user for the folder of the automatic backup, with permission to write in it. Must run
 * from a click. A folder, and not a file, so the app can also keep dated copies (issue #28).
 */
export async function pickBackupFolder(): Promise<BackupFolderHandle> {
  const picker = (window as PickerWindow).showDirectoryPicker;
  if (!picker) throw new Error('File System Access API is not available');
  const handle = await picker({ id: 'best-app-backup', mode: 'readwrite' });
  return handle as unknown as BackupFolderHandle;
}

/** The names of the files in a folder. */
export async function fileNames(folder: BackupFolderHandle): Promise<string[]> {
  const names: string[] = [];
  for await (const name of folder.keys()) names.push(name);
  return names;
}

export async function writeTextToHandle(handle: BackupFileHandle, text: string): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
}

export async function writeBackupToHandle(handle: BackupFileHandle, backup: BackupFile): Promise<void> {
  await writeTextToHandle(handle, serializeBackup(backup));
}

/** Remembers the handle in IndexedDB, which can store file handles natively. */
export function dexieHandleStorage(db: AppDatabase): HandleStorage {
  return {
    load: async () => {
      const entry = await db.meta.get(FILE_HANDLE_KEY);
      return typeof FileSystemHandle !== 'undefined' && entry?.value instanceof FileSystemHandle
        ? (entry.value as unknown as BackupHandle)
        : null;
    },
    save: async (handle) => {
      await db.meta.put({ key: FILE_HANDLE_KEY, value: handle });
    },
  };
}

export async function readBackupFile(file: File): Promise<unknown> {
  const text = await file.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
