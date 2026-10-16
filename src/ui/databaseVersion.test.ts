import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { databaseVersionStatus, setDatabaseVersionStatus, watchDatabaseVersion } from './databaseVersion';

afterEach(() => setDatabaseVersionStatus('ok'));

describe('database version status', () => {
  it('stays ok when the database matches this code', async () => {
    const name = 'best-app-version-ok';
    const db = new Dexie(name);
    db.version(2).stores({ items: 'id' });
    await watchDatabaseVersion(db, 2);
    expect(databaseVersionStatus()).toBe('ok');
    db.close();
    await Dexie.delete(name);
  });

  it('asks for a reload when another tab upgrades the database', async () => {
    const name = 'best-app-version-replaced';
    const current = new Dexie(name);
    current.version(1).stores({ items: 'id' });
    await watchDatabaseVersion(current, 1);

    const newer = new Dexie(name);
    newer.version(2).stores({ items: 'id', more: 'id' });
    await newer.open();

    expect(databaseVersionStatus()).toBe('replaced');
    newer.close();
    await Dexie.delete(name);
  });

  it('stops when the database is newer than this code', async () => {
    const name = 'best-app-version-newer';
    const newer = new Dexie(name);
    newer.version(3).stores({ items: 'id' });
    await newer.open();
    newer.close();

    const older = new Dexie(name);
    older.version(1).stores({ items: 'id' });
    await watchDatabaseVersion(older, 1);

    expect(databaseVersionStatus()).toBe('newer');
    expect(older.isOpen()).toBe(false);
    await Dexie.delete(name);
  });
});
