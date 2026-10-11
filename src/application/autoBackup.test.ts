import { describe, expect, it } from 'vitest';
import type { Project } from '../domain/entities';
import { decideAutoBackup } from './autoBackup';
import { createBackup, type BackupTables } from './backup';

function project(id: string, updatedAt = '2026-10-11T10:00:00Z'): Project {
  return { id, name: id, status: 'active', createdAt: updatedAt, updatedAt, finishedAt: null };
}

function tables(projects: Project[]): BackupTables {
  return { blocks: [], sections: [], projects, days: [], events: [] };
}

function fileWith(projects: Project[]): string {
  return JSON.stringify(createBackup(tables(projects), new Date('2026-10-11T12:00:00Z')));
}

describe('decideAutoBackup', () => {
  it('writes into a new, empty file', () => {
    expect(decideAutoBackup('', tables([project('p1')]), false)).toEqual({ kind: 'write' });
  });

  it('writes when the browser has everything the file has, and more', () => {
    const decision = decideAutoBackup(fileWith([project('p1')]), tables([project('p1'), project('p2')]), false);
    expect(decision).toEqual({ kind: 'write' });
  });

  it('does not overwrite a file with data the browser lacks (e.g. browser data was cleared)', () => {
    const decision = decideAutoBackup(fileWith([project('p1')]), tables([]), false);
    expect(decision).toMatchObject({ kind: 'blocked', reason: 'fileHasMoreData', loss: { projects: { removed: 1 } } });
  });

  it('does not overwrite newer data saved to the file by another computer', () => {
    const decision = decideAutoBackup(
      fileWith([project('p1', '2026-10-12T09:00:00Z')]),
      tables([project('p1', '2026-10-11T09:00:00Z')]),
      false,
    );
    expect(decision).toMatchObject({ kind: 'blocked', reason: 'fileHasMoreData', loss: { projects: { reverted: 1 } } });
  });

  it('overwrites after the user explicitly imported or undid an import', () => {
    expect(decideAutoBackup(fileWith([project('p1')]), tables([]), true)).toEqual({ kind: 'write' });
  });

  it.each([
    ['broken JSON', '{ not json'],
    ['another JSON file', '{"hello": "world"}'],
  ])('never overwrites %s, even when overwriting is allowed', (_label, text) => {
    expect(decideAutoBackup(text, tables([]), true)).toEqual({ kind: 'blocked', reason: 'invalidFile' });
  });
});
