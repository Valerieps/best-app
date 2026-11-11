import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { AppDatabase, DATABASE_VERSION, UPGRADE_SNAPSHOT_ID } from './db';

describe('snapshot before an upgrade', () => {
  it('keeps the data as the previous version left it, before any migration', async () => {
    const name = 'best-app-upgrade-snapshot';
    const old = new Dexie(name);
    old.version(7).stores({ blocks: 'id, sectionId, status, intendedDate, projectId, deadline', priorities: 'id', snapshots: 'id, createdAt' });
    await old.open();
    const archived = { id: 't1', kind: 'task', status: 'archived', intendedDate: '2026-10-05', closedAt: null, postponeCount: 0 };
    await old.table('blocks').put(archived);
    old.close();

    const db = new AppDatabase(name);
    const snapshot = await db.snapshots.get(UPGRADE_SNAPSHOT_ID);
    expect(snapshot?.tables.blocks).toEqual([archived]);
    expect(snapshot?.tables).not.toHaveProperty('snapshots');
    expect(await db.blocks.get('t1')).toMatchObject({ status: 'active' });
    db.close();
    await Dexie.delete(name);
  });

  it('takes no snapshot on a new database', async () => {
    const name = 'best-app-upgrade-fresh';
    const db = new AppDatabase(name);
    await db.open();
    expect(await db.snapshots.count()).toBe(0);
    db.close();
    await Dexie.delete(name);
  });
});

describe('database versions 6 to 8', () => {
  it('turns the month priority projects of a version 5 database into week lists, and then the list in focus', async () => {
    const name = 'best-app-upgrade-test';
    // A version 5 database, as the app left it before the priority projects moved to the week.
    const old = new Dexie(name);
    old.version(5).stores({ priorities: 'id' });
    await old.open();
    await old.table('priorities').bulkPut([
      { id: 'month:2026-10', scope: 'month', period: '2026-10', itemIds: ['p1', 'p2'], updatedAt: '2026-10-02T10:00:00.000Z' },
      { id: 'day:2026-10-11', scope: 'day', period: '2026-10-11', itemIds: ['t1'], updatedAt: '' },
    ]);
    old.close();

    const db = new AppDatabase(name);
    const rows = await db.priorities.toArray();
    expect(rows).toEqual([
      { id: 'day:2026-10-11', scope: 'day', period: '2026-10-11', itemIds: ['t1'], updatedAt: '' },
      { id: 'focusProjects', scope: 'focusProjects', period: '', itemIds: ['p1', 'p2'], updatedAt: '2026-10-02T10:00:00.000Z' },
      { id: 'weekProjects:2026-W40', scope: 'weekProjects', period: '2026-W40', itemIds: ['p1', 'p2'], updatedAt: '2026-10-02T10:00:00.000Z' },
    ]);
    db.close();
    await Dexie.delete(name);
  });

  it('starts the list in focus of a version 6 database from the week list in effect', async () => {
    const name = 'best-app-upgrade-test-7';
    const old = new Dexie(name);
    old.version(6).stores({ priorities: 'id' });
    await old.open();
    await old.table('priorities').bulkPut([{ id: 'weekProjects:2026-W40', scope: 'weekProjects', period: '2026-W40', itemIds: ['p1'], updatedAt: '' }]);
    old.close();

    const db = new AppDatabase(name);
    expect(await db.priorities.get('focusProjects')).toEqual({ id: 'focusProjects', scope: 'focusProjects', period: '', itemIds: ['p1'], updatedAt: '' });
    expect(await db.priorities.count()).toBe(2);
    db.close();
    await Dexie.delete(name);
  });

  it('turns the archived tasks of a version 7 database into active tasks without a date', async () => {
    const name = 'best-app-upgrade-test-8';
    const old = new Dexie(name);
    old.version(7).stores({ blocks: 'id, sectionId, status, intendedDate, projectId, deadline' });
    await old.open();
    await old.table('blocks').bulkPut([
      { id: 't1', kind: 'task', status: 'archived', intendedDate: '2026-10-05', closedAt: '2026-10-06T10:00:00.000Z', postponeCount: 2 },
      { id: 't2', kind: 'task', status: 'abandoned', intendedDate: null, closedAt: '2026-10-06T10:00:00.000Z', postponeCount: 0 },
    ]);
    old.close();

    const db = new AppDatabase(name);
    expect(await db.blocks.get('t1')).toMatchObject({ status: 'active', intendedDate: null, closedAt: null, postponeCount: 2 });
    expect(await db.blocks.get('t2')).toMatchObject({ status: 'abandoned' });
    db.close();
    await Dexie.delete(name);
  });
});

describe('database version 10', () => {
  it('settles what a version 9 database left for the Revisão de Foco, and keeps the closed reviews', async () => {
    const name = 'best-app-upgrade-test-10';
    const old = new Dexie(name);
    old.version(9).stores({
      blocks: 'id, sectionId, status, intendedDate, projectId, deadline',
      sections: 'id, day, projectId',
      reflections: 'id',
    });
    await old.open();
    await old.table('blocks').bulkPut([
      { id: 't1', kind: 'task', status: 'active', intendedDate: null, awaitingReflection: true },
      { id: 't2', kind: 'task', status: 'active', intendedDate: '2026-10-20' },
    ]);
    await old.table('sections').bulkPut([
      { id: 's1', day: '2026-10-01', projectId: null, notesDestination: 'weeklyReflection' },
      { id: 's2', day: '2026-10-02', projectId: null, notesDestination: 'pending' },
    ]);
    const review = { id: 'focus:r1', kind: 'focus', period: '', start: '', end: '2026-10-10', bestMoments: 'Bom', improvements: '', closedAt: '2026-10-10T20:00:00.000Z', updatedAt: '' };
    await old.table('reflections').put(review);
    old.close();

    const db = new AppDatabase(name);
    expect(await db.blocks.get('t1')).toEqual({ id: 't1', kind: 'task', status: 'active', intendedDate: null });
    expect(await db.blocks.get('t2')).toEqual({ id: 't2', kind: 'task', status: 'active', intendedDate: '2026-10-20' });
    expect((await db.sections.get('s1'))?.notesDestination).toBe('wiki');
    expect((await db.sections.get('s2'))?.notesDestination).toBe('pending');
    expect(await db.reflections.toArray()).toEqual([review]);
    db.close();
    await Dexie.delete(name);
  });
});

describe('database version 11', () => {
  it('turns the notes a version 10 database wrote with "[?] " into ideas, searchable by kind', async () => {
    const name = 'best-app-upgrade-test-11';
    const old = new Dexie(name);
    old.version(10).stores({
      blocks: 'id, sectionId, status, intendedDate, projectId, deadline',
      sections: 'id, day, projectId',
      snapshots: 'id, createdAt',
    });
    await old.open();
    await old.table('sections').bulkPut([
      { id: 's1', day: '2026-11-01', projectId: 'p1', notesDestination: 'wiki' },
      { id: 's2', day: '2026-11-02', projectId: null, notesDestination: 'pending' },
    ]);
    await old.table('blocks').bulkPut([
      { id: 'b1', kind: 'note', text: '[?] App de receitas', sectionId: 's1', projectId: null },
      { id: 'b2', kind: 'note', text: '[?] Horta', sectionId: 's2', projectId: null },
      { id: 'b3', kind: 'note', text: 'Só uma nota', sectionId: 's2', projectId: null },
    ]);
    old.close();

    const db = new AppDatabase(name);
    const idea = { ideaStatus: 'open', notYetCount: 0, lastNotYetAt: null, ideaSectionId: null };
    expect(await db.blocks.get('b1')).toEqual({ id: 'b1', kind: 'idea', text: 'App de receitas', sectionId: 's1', projectId: 'p1', ...idea });
    expect(await db.blocks.get('b2')).toEqual({ id: 'b2', kind: 'idea', text: 'Horta', sectionId: 's2', projectId: null, ...idea });
    expect(await db.blocks.get('b3')).toEqual({ id: 'b3', kind: 'note', text: 'Só uma nota', sectionId: 's2', projectId: null });
    expect((await db.blocks.where('kind').equals('idea').primaryKeys()).sort()).toEqual(['b1', 'b2']);
    // The data as version 10 left it is kept, as for every upgrade (ADR-059).
    const snapshot = await db.snapshots.get(UPGRADE_SNAPSHOT_ID);
    expect((snapshot?.tables.blocks as unknown as { kind: string }[]).map((row) => row.kind)).toEqual(['note', 'note', 'note']);
    db.close();
    await Dexie.delete(name);
  });
});

describe('database version constant', () => {
  it('matches the last version declared', async () => {
    const name = 'best-app-version-constant';
    const db = new AppDatabase(name);
    await db.open();
    expect(db.verno).toBe(DATABASE_VERSION);
    db.close();
    await Dexie.delete(name);
  });
});
