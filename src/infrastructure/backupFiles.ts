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
  readonly name: string;
  queryPermission(options: { mode: 'readwrite' }): Promise<PermissionState>;
  requestPermission(options: { mode: 'readwrite' }): Promise<PermissionState>;
  getFile(): Promise<{ text(): Promise<string> }>;
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
}

/** Where the chosen backup file is remembered between sessions. */
export interface HandleStorage {
  load(): Promise<BackupFileHandle | null>;
  save(handle: BackupFileHandle): Promise<void>;
}

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: { description: string; accept: Record<string, string[]> }[];
}

type PickerWindow = Window & {
  showSaveFilePicker?: (options: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
};

export function backupFileName(now: Date): string {
  const stamp = now.toISOString().slice(0, 10);
  return `best-app-backup-${stamp}.json`;
}

export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2);
}

export function canPickBackupFile(): boolean {
  return typeof window !== 'undefined' && typeof (window as PickerWindow).showSaveFilePicker === 'function';
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
 * Asks the user where the automatic backup goes. Must run from a click. The name has no date
 * because the same file is rewritten after every change.
 */
export async function pickBackupFile(): Promise<BackupFileHandle> {
  const picker = (window as PickerWindow).showSaveFilePicker;
  if (!picker) throw new Error('File System Access API is not available');
  const handle = await picker({
    suggestedName: 'best-app-backup.json',
    types: [{ description: 'Backup do Best App', accept: { 'application/json': ['.json'] } }],
  });
  return handle as unknown as BackupFileHandle;
}

export async function writeBackupToHandle(handle: BackupFileHandle, backup: BackupFile): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(serializeBackup(backup));
  await writable.close();
}

/** Remembers the handle in IndexedDB, which can store file handles natively. */
export function dexieHandleStorage(db: AppDatabase): HandleStorage {
  return {
    load: async () => {
      const entry = await db.meta.get(FILE_HANDLE_KEY);
      return typeof FileSystemHandle !== 'undefined' && entry?.value instanceof FileSystemHandle
        ? (entry.value as unknown as BackupFileHandle)
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
