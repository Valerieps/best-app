/**
 * Moves backups between the browser and the user's disk. Everything stays on the machine:
 * the File System Access API writes straight to a file the user picked (which may live in a
 * synced Google Drive folder), and the download fallback uses a local Blob URL.
 */
const FILE_HANDLE_KEY = 'backupFileHandle';
export function backupFileName(now) {
    const stamp = now.toISOString().slice(0, 10);
    return `best-app-backup-${stamp}.json`;
}
export function serializeBackup(backup) {
    return JSON.stringify(backup, null, 2);
}
export function canPickBackupFile() {
    return typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function';
}
/** Downloads the backup through a local Blob URL. Nothing leaves the machine. */
export function downloadBackup(backup, now) {
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
export async function pickBackupFile() {
    const picker = window.showSaveFilePicker;
    if (!picker)
        throw new Error('File System Access API is not available');
    const handle = await picker({
        suggestedName: 'best-app-backup.json',
        types: [{ description: 'Backup do Best App', accept: { 'application/json': ['.json'] } }],
    });
    return handle;
}
export async function writeBackupToHandle(handle, backup) {
    const writable = await handle.createWritable();
    await writable.write(serializeBackup(backup));
    await writable.close();
}
/** Remembers the handle in IndexedDB, which can store file handles natively. */
export function dexieHandleStorage(db) {
    return {
        load: async () => {
            const entry = await db.meta.get(FILE_HANDLE_KEY);
            return typeof FileSystemHandle !== 'undefined' && entry?.value instanceof FileSystemHandle
                ? entry.value
                : null;
        },
        save: async (handle) => {
            await db.meta.put({ key: FILE_HANDLE_KEY, value: handle });
        },
    };
}
export async function readBackupFile(file) {
    const text = await file.text();
    try {
        return JSON.parse(text);
    }
    catch {
        return null;
    }
}
