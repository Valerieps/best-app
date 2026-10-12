import { AUTO_BACKUP_DELAY_MS, decideAutoBackup } from '../application/autoBackup';
import { createBackup } from '../application/backup';
import { clearAutoBackupOverwrite, isAutoBackupOverwriteAllowed, markBackupDone, readAllTables, } from './backupRepository';
import { writeBackupToHandle } from './backupFiles';
/**
 * Rewrites the chosen backup file a few seconds after the last change. Each automatic write
 * first checks the file and refuses to overwrite data the browser does not have.
 */
export class AutoBackup {
    deps;
    state = { status: 'loading' };
    listeners = new Set();
    handle = null;
    timer = null;
    running = null;
    runAgain = false;
    constructor(deps) {
        this.deps = deps;
    }
    getState = () => this.state;
    subscribe = (listener) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };
    async init() {
        if (!this.deps.supported)
            return this.setState({ status: 'unsupported' });
        this.handle = await this.deps.handles.load();
        if (!this.handle)
            return this.setState({ status: 'noFile' });
        const permission = await this.handle.queryPermission({ mode: 'readwrite' });
        if (permission !== 'granted')
            return this.setState({ status: 'needsPermission', fileName: this.handle.name });
        this.setState({ status: 'active', fileName: this.handle.name, lastSavedAt: null, saving: false });
        // Catch up on changes made after the last write, e.g. if the tab closed during the delay.
        await this.flush();
    }
    /** Call after every change. Bursts of changes become a single write. */
    schedule() {
        if (this.timer)
            clearTimeout(this.timer);
        this.timer = setTimeout(() => void this.flush(), this.deps.delayMs ?? AUTO_BACKUP_DELAY_MS);
    }
    /** Writes now if possible. Concurrent calls are merged into one more write after the current one. */
    async flush() {
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
    /** From a click: asks Chrome to allow writing to the remembered file, then writes. */
    async resume() {
        if (!this.handle)
            return;
        const permission = await this.handle.requestPermission({ mode: 'readwrite' });
        if (permission !== 'granted')
            return this.setState({ status: 'needsPermission', fileName: this.handle.name });
        await this.flush();
    }
    /**
     * From a click: the user picks the backup file. Choosing a file (and confirming Chrome's
     * "replace?" prompt) is an explicit decision, so this first write skips the overwrite check.
     */
    async chooseFile() {
        const handle = await this.deps.pick();
        const now = this.deps.now();
        await writeBackupToHandle(handle, createBackup(await readAllTables(this.deps.db), now));
        await this.deps.handles.save(handle);
        await markBackupDone(this.deps.db, now);
        await clearAutoBackupOverwrite(this.deps.db);
        this.handle = handle;
        this.setState({ status: 'active', fileName: handle.name, lastSavedAt: now.toISOString(), saving: false });
    }
    async write() {
        const handle = this.handle;
        if (!handle)
            return;
        if ((await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
            return this.setState({ status: 'needsPermission', fileName: handle.name });
        }
        const previous = this.state.status === 'active' ? this.state.lastSavedAt : null;
        this.setState({ status: 'active', fileName: handle.name, lastSavedAt: previous, saving: true });
        try {
            const fileText = await (await handle.getFile()).text();
            const current = await readAllTables(this.deps.db);
            const decision = decideAutoBackup(fileText, current, await isAutoBackupOverwriteAllowed(this.deps.db));
            if (decision.kind === 'blocked') {
                return this.setState(decision.reason === 'invalidFile'
                    ? { status: 'blocked', fileName: handle.name, reason: 'invalidFile' }
                    : { status: 'blocked', fileName: handle.name, ...decision });
            }
            const now = this.deps.now();
            await writeBackupToHandle(handle, createBackup(current, now));
            await markBackupDone(this.deps.db, now);
            await clearAutoBackupOverwrite(this.deps.db);
            this.setState({ status: 'active', fileName: handle.name, lastSavedAt: now.toISOString(), saving: false });
        }
        catch {
            this.setState({ status: 'error', fileName: handle.name });
        }
    }
    setState(next) {
        this.state = next;
        this.listeners.forEach((listener) => listener());
    }
}
