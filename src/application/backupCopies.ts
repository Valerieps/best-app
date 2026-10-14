import { addDays, toDayKey } from '../domain/day';
import type { BackupFile } from './backup';

/**
 * Dated copies of the automatic backup (issue #28). The backup file is rewritten after every
 * change, so a bug that spoils the data would reach it in seconds; the copies keep earlier
 * versions next to it, in a subfolder:
 * - today, one copy every 2 hours, keeping the 5 most recent;
 * - for each of the 14 days before today, only the day's last version.
 * The app deletes only files named like its copies, and only in that subfolder.
 */

export const COPIES_FOLDER = 'copias';
export const COPY_INTERVAL_MS = 2 * 60 * 60 * 1000;
export const COPIES_KEPT_TODAY = 5;
export const PAST_DAYS_KEPT = 14;

const COPY_NAME = /^best-app-(\d{4})-(\d{2})-(\d{2})-(\d{2})h(\d{2})\.json$/;

const pad = (value: number) => String(value).padStart(2, '0');

/** "best-app-2026-10-14-14h30.json", in local time, like the day of the note. */
export function copyName(at: Date): string {
  return `best-app-${toDayKey(at)}-${pad(at.getHours())}h${pad(at.getMinutes())}.json`;
}

/** The moment a copy holds, from its name; null for any other file. */
export function parseCopyName(name: string): Date | null {
  const match = COPY_NAME.exec(name);
  if (!match) return null;
  const [, year, month, day, hours, minutes] = match.map(Number);
  const at = new Date(year, month - 1, day, hours, minutes);
  return Number.isNaN(at.getTime()) ? null : at;
}

interface Copy {
  name: string;
  at: Date;
}

function copiesIn(names: readonly string[]): Copy[] {
  return names
    .map((name) => ({ name, at: parseCopyName(name) }))
    .filter((copy): copy is Copy => copy.at !== null)
    .sort((a, b) => b.at.getTime() - a.at.getTime());
}

/** Whether to save a copy now: none today yet, or the newest one of today is 2 hours old. */
export function needsNewCopy(names: readonly string[], now: Date): boolean {
  const today = toDayKey(now);
  const newest = copiesIn(names).find((copy) => toDayKey(copy.at) === today);
  return !newest || now.getTime() - newest.at.getTime() >= COPY_INTERVAL_MS;
}

/**
 * Before the backup file is rewritten, what it holds deserves a copy of its own when it is the
 * last version of an earlier day, or when it comes from an older version of the app's data,
 * which the browser has just migrated. Returns the copy's name, or null.
 */
export function copyBeforeOverwrite(previous: BackupFile | null, names: readonly string[], now: Date, schemaVersion: number): string | null {
  if (!previous) return null;
  const at = new Date(previous.exportedAt);
  if (Number.isNaN(at.getTime())) return null;
  const name = copyName(at);
  if (names.includes(name)) return null;
  const earlierDay = toDayKey(at) < toDayKey(now);
  const olderSchema = previous.schemaVersion < schemaVersion;
  return earlierDay || olderSchema ? name : null;
}

/** The copies to delete: beyond the 5 most recent of today, all but the last of each earlier day, and older than 14 days. */
export function copiesToDelete(names: readonly string[], now: Date): string[] {
  const today = toDayKey(now);
  const oldestKept = addDays(today, -PAST_DAYS_KEPT);
  const keptPerDay = new Map<string, number>();
  const doomed: string[] = [];
  for (const copy of copiesIn(names)) {
    const day = toDayKey(copy.at);
    // A copy dated after today comes from another computer's clock: never ours to judge.
    if (day > today) continue;
    const limit = day === today ? COPIES_KEPT_TODAY : day >= oldestKept ? 1 : 0;
    const kept = keptPerDay.get(day) ?? 0;
    if (kept < limit) keptPerDay.set(day, kept + 1);
    else doomed.push(copy.name);
  }
  return doomed;
}

/** The copies to show, newest first, with the moment each one holds. */
export function listCopies(names: readonly string[]): { name: string; at: Date }[] {
  return copiesIn(names);
}
