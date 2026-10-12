import { describe, expect, it } from 'vitest';
import type { Project } from '../domain/entities';
import type { DomainEvent } from '../domain/events';
import { computeImportLoss, createBackup, emptyTables, hasAnyData, parseBackup, type BackupTables } from './backup';

describe('hasAnyData', () => {
  it('is false only when every table is empty', () => {
    expect(hasAnyData(tables())).toBe(false);
    expect(hasAnyData(tables({ events: [event('e1')] }))).toBe(true);
  });
});

function project(id: string, updatedAt: string): Project {
  return { id, name: id, status: 'active', createdAt: updatedAt, updatedAt, finishedAt: null };
}

function event(id: string): DomainEvent {
  return {
    id,
    type: 'project.created',
    entityType: 'project',
    entityId: 'p',
    at: '2026-10-11T12:00:00.000Z',
    day: '2026-10-11',
    data: {},
  };
}

function tables(overrides: Partial<BackupTables> = {}): BackupTables {
  return { ...emptyTables(), ...overrides };
}

describe('parseBackup', () => {
  it('accepts a backup it created', () => {
    const backup = createBackup(tables({ projects: [project('p1', 'a')] }), new Date('2026-10-11T12:00:00Z'));
    const result = parseBackup(JSON.parse(JSON.stringify(backup)));
    expect(result).toEqual({ ok: true, backup });
  });

  it.each([
    ['not an object', 'texto qualquer'],
    ['another format', { format: 'other', schemaVersion: 1, exportedAt: '2026-10-11', tables: tables() }],
    ['a missing version', { format: 'best-app-backup', exportedAt: '2026-10-11', tables: tables() }],
    ['a missing date', { format: 'best-app-backup', schemaVersion: 1, tables: tables() }],
    ['a missing table', { format: 'best-app-backup', schemaVersion: 1, exportedAt: '2026-10-11', tables: { blocks: [] } }],
    [
      'a row without key',
      { format: 'best-app-backup', schemaVersion: 1, exportedAt: '2026-10-11', tables: tables({ projects: [{} as Project] }) },
    ],
    [
      'repeated keys',
      {
        format: 'best-app-backup',
        schemaVersion: 1,
        exportedAt: '2026-10-11',
        tables: tables({ projects: [project('p1', 'a'), project('p1', 'b')] }),
      },
    ],
  ])('rejects %s', (_label, value) => {
    expect(parseBackup(value).ok).toBe(false);
  });

  it('upgrades a version 1 backup, from before the priorities table', () => {
    const v1 = { format: 'best-app-backup', schemaVersion: 1, exportedAt: '2026-10-11', tables: tables() } as Record<string, unknown>;
    for (const name of ['priorities', 'reflections', 'settings', 'reminders', 'objectives', 'resources', 'habits', 'habitLogs']) delete (v1.tables as Record<string, unknown>)[name];
    const result = parseBackup(v1);
    expect(result).toMatchObject({ ok: true, backup: { schemaVersion: 6, tables: { priorities: [], reflections: [], settings: [], reminders: [], habits: [], habitLogs: [] } } });
  });

  it('upgrades a version 5 backup, turning month priority projects into week ones', () => {
    const month = { id: 'month:2026-10', scope: 'month', period: '2026-10', itemIds: ['p1'], updatedAt: '2026-10-02T10:00:00.000Z' };
    const day = { id: 'day:2026-10-11', scope: 'day' as const, period: '2026-10-11', itemIds: ['t1'], updatedAt: '' };
    const v5 = { format: 'best-app-backup', schemaVersion: 5, exportedAt: '2026-10-11', tables: { ...tables(), priorities: [month, day] } };
    const result = parseBackup(v5);
    expect(result).toMatchObject({ ok: true, backup: { schemaVersion: 6 } });
    expect(result.ok && result.backup.tables.priorities).toEqual([
      day,
      { id: 'weekProjects:2026-W40', scope: 'weekProjects', period: '2026-W40', itemIds: ['p1'], updatedAt: '2026-10-02T10:00:00.000Z' },
    ]);
  });

  it('leaves the priorities of a version 6 backup alone', () => {
    const odd = { id: 'month:2026-10', scope: 'day' as const, period: '2026-10', itemIds: [], updatedAt: '' };
    const result = parseBackup({ format: 'best-app-backup', schemaVersion: 6, exportedAt: '2026-10-11', tables: tables({ priorities: [odd] }) });
    expect(result.ok && result.backup.tables.priorities).toEqual([odd]);
  });

  it('rejects a backup from a newer version of the app', () => {
    const result = parseBackup({ format: 'best-app-backup', schemaVersion: 99, exportedAt: '2026-10-11', tables: tables() });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('versão mais nova') });
  });
});

describe('computeImportLoss', () => {
  it('reports no loss when the backup has everything', () => {
    const current = tables({ projects: [project('p1', '2026-10-10')], events: [event('e1')] });
    expect(computeImportLoss(current, current).hasLoss).toBe(false);
  });

  it('reports no loss when the backup only adds data', () => {
    const current = tables({ projects: [project('p1', '2026-10-10')] });
    const incoming = tables({ projects: [project('p1', '2026-10-10'), project('p2', '2026-10-11')] });
    expect(computeImportLoss(current, incoming).hasLoss).toBe(false);
  });

  it('counts records the import would remove, revert, and changes it would undo', () => {
    const current = tables({
      projects: [project('kept', '2026-10-10'), project('newer', '2026-10-12'), project('gone', '2026-10-11')],
      events: [event('e1'), event('e2'), event('e3')],
    });
    const incoming = tables({
      projects: [project('kept', '2026-10-10'), project('newer', '2026-10-09')],
      events: [event('e1')],
    });

    const loss = computeImportLoss(current, incoming);

    expect(loss.projects).toEqual({ removed: 1, reverted: 1 });
    expect(loss.missingEvents).toBe(2);
    expect(loss.hasLoss).toBe(true);
  });

  it('does not count a line the backup deleted on purpose', () => {
    const deleted: DomainEvent = { ...event('e1'), type: 'block.deleted', entityType: 'block', entityId: 'b1' };
    const line = { id: 'b1', updatedAt: '2026-10-11' } as BackupTables['blocks'][number];
    const loss = computeImportLoss(tables({ blocks: [line] }), tables({ events: [deleted] }));
    expect(loss.blocks).toEqual({ removed: 0, reverted: 0 });
    expect(loss.hasLoss).toBe(false);
  });

  it('only excuses the kind of record the deletion was about', () => {
    const deleted: DomainEvent = { ...event('e1'), type: 'block.deleted', entityType: 'block', entityId: 'p1' };
    const loss = computeImportLoss(tables({ projects: [project('p1', '2026-10-10')] }), tables({ events: [deleted] }));
    expect(loss.projects.removed).toBe(1);
  });
});
