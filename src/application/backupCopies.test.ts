import { describe, expect, it } from 'vitest';
import type { BackupFile } from './backup';
import { copiesToDelete, copyBeforeOverwrite, copyName, listCopies, needsNewCopy, parseCopyName } from './backupCopies';

const at = (day: string, time: string) => new Date(`${day}T${time}:00`);
const name = (day: string, time: string) => copyName(at(day, time));

function backupAt(exportedAt: Date, schemaVersion = 7): BackupFile {
  return { format: 'best-app-backup', schemaVersion, exportedAt: exportedAt.toISOString(), tables: {} } as unknown as BackupFile;
}

describe('copy names', () => {
  it('names a copy after its local day and time, and reads it back', () => {
    expect(copyName(at('2026-10-14', '09:05'))).toBe('best-app-2026-10-14-09h05.json');
    expect(parseCopyName('best-app-2026-10-14-09h05.json')).toEqual(at('2026-10-14', '09:05'));
  });

  it('ignores any other file', () => {
    expect(parseCopyName('best-app-backup.json')).toBeNull();
    expect(parseCopyName('notas-2026-10-14-09h05.json')).toBeNull();
    expect(listCopies(['foto.png', name('2026-10-14', '08:00'), name('2026-10-14', '10:00')]).map((copy) => copy.name)).toEqual([
      name('2026-10-14', '10:00'),
      name('2026-10-14', '08:00'),
    ]);
  });
});

describe('when to copy', () => {
  const now = at('2026-10-14', '12:00');

  it('copies when there is no copy of today, or the newest one is 2 hours old', () => {
    expect(needsNewCopy([], now)).toBe(true);
    expect(needsNewCopy([name('2026-10-13', '23:00')], now)).toBe(true);
    expect(needsNewCopy([name('2026-10-14', '10:30')], now)).toBe(false);
    expect(needsNewCopy([name('2026-10-14', '10:00')], now)).toBe(true);
  });

  it('keeps the last version of an earlier day before the file is rewritten', () => {
    const yesterday = at('2026-10-13', '22:47');
    expect(copyBeforeOverwrite(backupAt(yesterday), [], now, 7)).toBe(copyName(yesterday));
    expect(copyBeforeOverwrite(backupAt(yesterday), [copyName(yesterday)], now, 7)).toBeNull();
    expect(copyBeforeOverwrite(backupAt(at('2026-10-14', '11:00')), [], now, 7)).toBeNull();
    expect(copyBeforeOverwrite(null, [], now, 7)).toBeNull();
  });

  it('keeps the data from before a migration of the app', () => {
    const earlier = at('2026-10-14', '11:00');
    expect(copyBeforeOverwrite(backupAt(earlier, 6), [], now, 7)).toBe(copyName(earlier));
  });
});

describe('which copies to delete', () => {
  const now = at('2026-10-14', '20:00');

  it('keeps the 5 most recent copies of today', () => {
    const today = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'].map((time) => name('2026-10-14', time));
    expect(copiesToDelete(today, now)).toEqual([name('2026-10-14', '08:00')]);
  });

  it('keeps only the last copy of each of the 14 days before today', () => {
    const names = [name('2026-10-13', '09:00'), name('2026-10-13', '22:47'), name('2026-09-30', '18:00'), name('2026-09-29', '18:00')];
    expect(copiesToDelete(names, now).sort()).toEqual([name('2026-09-29', '18:00'), name('2026-10-13', '09:00')].sort());
  });

  it('never deletes files that are not its copies, nor copies dated in the future', () => {
    expect(copiesToDelete(['best-app-backup.json', 'leia-me.txt', name('2026-10-15', '08:00')], now)).toEqual([]);
  });
});
