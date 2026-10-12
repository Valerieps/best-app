import { describe, expect, it } from 'vitest';
import type { Block, Project } from '../domain/entities';
import type { DomainEvent } from '../domain/events';
import { decideAutoBackup } from './autoBackup';
import { createBackup, emptyTables, type BackupTables } from './backup';

function project(id: string, updatedAt = '2026-10-11T10:00:00Z'): Project {
  return { id, name: id, status: 'active', createdAt: updatedAt, updatedAt, finishedAt: null };
}

function block(id: string): Block {
  return {
    id,
    kind: 'note',
    text: id,
    sectionId: 's1',
    position: 'a0',
    projectId: null,
    createdAt: '2026-10-11T10:00:00Z',
    updatedAt: '2026-10-11T10:00:00Z',
    status: null,
    intendedDate: null,
    firstIntendedDate: null,
    postponeCount: 0,
    closedAt: null,
    lastTriagedDay: null,
  };
}

function blockDeleted(blockId: string): DomainEvent {
  return {
    id: `e-${blockId}`,
    type: 'block.deleted',
    entityType: 'block',
    entityId: blockId,
    at: '2026-10-11T12:01:00Z',
    day: '2026-10-11',
    data: { kind: 'note', text: blockId },
  };
}

function tables(projects: Project[]): BackupTables {
  return { ...emptyTables(), projects };
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

  it('writes after a line the file still has was deleted in the browser', () => {
    const file = JSON.stringify(createBackup({ ...emptyTables(), blocks: [block('b1')] }, new Date('2026-10-11T12:00:00Z')));
    const current = { ...emptyTables(), events: [blockDeleted('b1')] };
    expect(decideAutoBackup(file, current, false)).toEqual({ kind: 'write' });
  });

  it('still protects a line that disappeared without a deletion in the browser', () => {
    const file = JSON.stringify(createBackup({ ...emptyTables(), blocks: [block('b1')] }, new Date('2026-10-11T12:00:00Z')));
    const decision = decideAutoBackup(file, emptyTables(), false);
    expect(decision).toMatchObject({ kind: 'blocked', reason: 'fileHasMoreData', loss: { blocks: { removed: 1 } } });
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
