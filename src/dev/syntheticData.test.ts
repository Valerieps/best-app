import { beforeAll, describe, expect, it } from 'vitest';
import { parseBackup, type BackupFile } from '../application/backup';
import {
  loadActiveTasks,
  loadArchivedTasks,
  loadCleanup,
  loadDayPriorities,
  loadPendingDays,
  loadPendingTriages,
  loadReflection,
  loadWiki,
} from '../application/queries';
import { addDays, toDayKey } from '../domain/day';
import type { TaskRow, WhiteboardRow } from '../domain/triage';
import { weekOf } from '../domain/week';
import { importBackup } from '../infrastructure/backupRepository';
import { createTestContext, sequentialIds } from '../test/fixtures';
import { buildSyntheticBackup } from './syntheticData';

const NOW = new Date('2026-10-12T15:00:00');
const TODAY = '2026-10-12';
const day = (offset: number) => addDays(TODAY, offset);

describe('synthetic data', () => {
  let backup: BackupFile;
  const { db, reader } = createTestContext();

  beforeAll(async () => {
    backup = await buildSyntheticBackup(NOW, sequentialIds('syn'));
    await importBackup(db, backup, NOW);
  });

  const taskNamed = (text: string) => {
    const task = backup.tables.blocks.find((block) => block.kind === 'task' && block.text === text);
    if (!task) throw new Error(`No task "${text}"`);
    return task;
  };
  const projectId = (name: string) => backup.tables.projects.find((project) => project.name === name)!.id;

  it('is a valid backup', () => {
    expect(parseBackup(JSON.parse(JSON.stringify(backup))).ok).toBe(true);
  });

  it('happens in the past, never after now', () => {
    const latest = backup.tables.events.map((event) => event.at).sort().at(-1)!;
    expect(new Date(latest).getTime()).toBeLessThanOrEqual(NOW.getTime());
  });

  it('stays in today and in the past when built right after midnight', async () => {
    const justAfterMidnight = new Date('2026-10-12T00:02:00');
    const early = await buildSyntheticBackup(justAfterMidnight, sequentialIds('early'));
    const todays = early.tables.sections.filter((section) => section.day === TODAY);
    expect(todays).toHaveLength(1);
    expect(early.tables.events.every((event) => new Date(event.at) <= justAfterMidnight)).toBe(true);
  });

  it('leaves the last 3 days pending, with attention items', async () => {
    expect(await loadPendingDays(reader, TODAY)).toEqual([day(-3), day(-2), day(-1)]);
    const [threeDaysAgo, twoDaysAgo, yesterday] = await loadPendingTriages(reader, TODAY);

    const apiDocs = threeDaysAgo.rows.find((row): row is TaskRow => row.type === 'task' && row.task.text === 'Atualizar a documentação da API');
    expect(apiDocs?.task.postponeCount).toBe(3);
    expect(apiDocs).toMatchObject({ attention: true, suggestion: { kind: 'reflection' } });
    const daily = threeDaysAgo.rows.find((row): row is WhiteboardRow => row.type === 'whiteboard');
    expect(daily?.suggestion).toEqual({ kind: 'link', projectId: projectId('App de agendamento') });
    expect(threeDaysAgo.automatic.some((item) => item.type === 'finishedDuringDay')).toBe(true);

    const dumpster = twoDaysAgo.rows.find((row): row is TaskRow => row.type === 'task' && row.task.deadline === day(-1));
    expect(dumpster?.attention).toBe(true);
    expect(twoDaysAgo.automatic.some((item) => item.type === 'notesToWiki')).toBe(true);

    expect(yesterday.rows.map((row) => row.type)).toEqual(['whiteboard', 'notes', 'task', 'task']);
  });

  it('gives the whiteboards assistant groups to link, convert and keep', async () => {
    const { whiteboards } = await loadCleanup(reader);
    expect(whiteboards.map((group) => [group.title, group.sections.length, group.suggestion.kind])).toEqual([
      ['Daily do App de agendamento', 3, 'link'],
      ['Ideias de decoração', 2, 'convert'],
      ['Orçamentos Marcenaria', 2, 'convert'],
      ['Leituras sobre acessibilidade', 1, 'keep'],
    ]);
  });

  it('gives the duplicates assistant real duplicates and a false positive', async () => {
    const { duplicates } = await loadCleanup(reader);
    expect(duplicates.map((group) => group.projects.map((project) => project.name))).toEqual([
      ['Festa de fim de ano', 'Festa de fim-de-ano'],
      ['Reforma da cozinha', 'Reforma da cosinha'],
      ['Sprint 41', 'Sprint 42'],
    ]);
  });

  it('leaves a task and notes for the weekly reflection, and archived tasks to revisit', async () => {
    const view = await loadReflection(reader, weekOf(TODAY), TODAY);
    const deferred = view.deferred.map((row) => (row.type === 'task' ? row.task.text : row.section.title));
    expect(deferred).toEqual(['Pedir orçamento de bancada de granito', 'Retrospectiva da sprint 40']);
    const archived = await loadArchivedTasks(reader);
    expect(archived.map((item) => toDayKey(new Date(item.task.closedAt!)))).toEqual([day(-5), day(-10), day(-31)]);
  });

  it('keeps active tasks without a date for weeks', async () => {
    const undated = (await loadActiveTasks(reader)).filter((item) => item.task.intendedDate === null);
    expect(undated.map((item) => item.task.text)).toEqual(
      expect.arrayContaining([
        'Pesquisar fornecedores de porcelanato',
        'Pesquisar uma tenda, caso chova',
        'Alugar uma caixa de som',
        'Comprar uma trena a laser',
      ]),
    );
    expect(taskNamed('Alugar uma caixa de som').postponeCount).toBe(1);
  });

  it("shows today's priorities, including the deadline of today", async () => {
    const priorities = await loadDayPriorities(reader, TODAY);
    expect(priorities.map(({ task, automatic }) => [task.text, automatic])).toEqual([
      ['Revisar o PR do fluxo de cancelamento', false],
      ['Separar a louça antes da demolição', false],
      ['Pagar a segunda parcela do Seu Jorge', true],
    ]);
  });

  it('fills the wiki with notes of the three projects', async () => {
    const wiki = await loadWiki(reader);
    const projects = new Set(wiki.flatMap((entry) => (entry.project ? [entry.project.name] : [])));
    expect(projects).toEqual(new Set(['App de agendamento', 'Festa de fim de ano', 'Reforma da cozinha', 'Sprint 40', 'Sprint 41', 'Sprint 42', 'Festa de fim-de-ano', 'Reforma da cosinha']));
  });
});
