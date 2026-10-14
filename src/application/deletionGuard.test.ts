import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DELETION_EVENTS, ENTITY_OF } from './backup';

/**
 * Issue #35: the automatic backup accepts that a row of a protected table left the browser only
 * when the history has a deletion event for it (`DELETION_EVENTS`). A use case that deletes such a
 * row without recording one would pause the backup with a false warning. Scans the use cases for
 * deletes of protected tables and checks that each records a deletion event right after.
 */

const DIR = __dirname;
/** Lines after a delete where the matching `record` call must be. */
const WINDOW = 6;

const files = readdirSync(DIR).filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'));
const tables = Object.keys(ENTITY_OF).join('|');
const deletePattern = new RegExp(String.raw`\btx\.(${tables})\.(delete|bulkDelete|clear)\(`);
const recordPattern = /\brecord\([^,]+,\s*[^,]+,\s*'([a-zA-Z.]+)'/;

describe('deleting rows the backup protects', () => {
  it('finds the deletes of protected tables', () => {
    const found = files.some((name) => deletePattern.test(readFileSync(join(DIR, name), 'utf8')));
    expect(found).toBe(true);
  });

  it('records a deletion event right after every delete', () => {
    const offenders: string[] = [];
    for (const name of files) {
      const lines = readFileSync(join(DIR, name), 'utf8').split('\n');
      lines.forEach((line, index) => {
        if (!deletePattern.test(line)) return;
        const after = lines.slice(index + 1, index + 1 + WINDOW).join('\n');
        const recorded = after.match(recordPattern)?.[1];
        if (!recorded || !DELETION_EVENTS.has(recorded as never)) offenders.push(`${name}:${index + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});
