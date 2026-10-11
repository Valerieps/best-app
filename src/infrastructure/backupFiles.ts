import type { BackupFile } from '../application/backup';
import type { AppDatabase } from './db';

/**
 * Moves backups between the browser and the user's disk. Everything stays on the machine:
 * the File System Access API writes straight to a file the user picked (which may live in a
 * synced Google Drive folder), and the download fallback uses a local Blob URL.
 */

const FILE_HANDLE_KEY = 'backupFileHandle';

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: { description: string; accept: Record<string, string[]> }[];
}

interface PermissionCapableHandle extends FileSystemFileHandle {
  queryPermission(options: { mode: 'readwrite' }): Promise<PermissionState>;
  requestPermission(options: { mode: 'readwrite' }): Promise<PermissionState>;
}

type PickerWindow = Window & {
  showSaveFilePicker?: (options: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
};

export function backupFileName(now: Date): string {
  const stamp = now.toISOString().slice(0, 10);
  return `best-app-backup-${stamp}.json`;
}

function serialize(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2);
}

export function canPickBackupFile(): boolean {
  return typeof (window as PickerWindow).showSaveFilePicker === 'function';
}

/** Downloads the backup through a local Blob URL. Nothing leaves the machine. */
export function downloadBackup(backup: BackupFile, now: Date): void {
  const url = URL.createObjectURL(new Blob([serialize(backup)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = backupFileName(now);
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function writeToHandle(handle: FileSystemFileHandle, backup: BackupFile): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(serialize(backup));
  await writable.close();
}

/** Asks the user where to save, remembers the file, and writes the backup there. */
export async function saveBackupToPickedFile(db: AppDatabase, backup: BackupFile, now: Date): Promise<void> {
  const picker = (window as PickerWindow).showSaveFilePicker;
  if (!picker) throw new Error('File System Access API is not available');
  const handle = await picker({
    suggestedName: backupFileName(now),
    types: [{ description: 'Backup do Best App', accept: { 'application/json': ['.json'] } }],
  });
  await writeToHandle(handle, backup);
  await db.meta.put({ key: FILE_HANDLE_KEY, value: handle });
}

export async function getSavedBackupFileName(db: AppDatabase): Promise<string | null> {
  const entry = await db.meta.get(FILE_HANDLE_KEY);
  return entry?.value instanceof FileSystemHandle ? entry.value.name : null;
}

/**
 * Quick backup: writes to the remembered file without asking where. Chrome may ask once per
 * session to allow writing. Returns false when no file is remembered or permission is denied.
 */
export async function saveBackupToRememberedFile(db: AppDatabase, backup: BackupFile): Promise<boolean> {
  const entry = await db.meta.get(FILE_HANDLE_KEY);
  if (!(entry?.value instanceof FileSystemHandle)) return false;
  const handle = entry.value as PermissionCapableHandle;
  let permission = await handle.queryPermission({ mode: 'readwrite' });
  if (permission === 'prompt') permission = await handle.requestPermission({ mode: 'readwrite' });
  if (permission !== 'granted') return false;
  await writeToHandle(handle, backup);
  return true;
}

export async function readBackupFile(file: File): Promise<unknown> {
  const text = await file.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
