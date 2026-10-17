import { describe, expect, it } from 'vitest';
import { project, section, task } from '../test/builders';
import {
  areSimilarNames,
  DEFAULT_FORGOTTEN_TASK_DAYS,
  findDuplicateProjects,
  findForgottenTasks,
  findWhiteboardGroups,
  normalizeForgottenTaskDays,
} from './assistants';

describe('forgotten tasks assistant', () => {
  const today = '2026-10-17';
  const created = (day: string, overrides = {}) => task('s', `de ${day}`, { createdAt: `${day}T12:00:00`, ...overrides });

  it('finds open tasks without a date created at least the given days ago, the oldest first', () => {
    const tasks = [
      created('2026-10-02'),
      created('2026-10-03'),
      created('2026-09-01'),
      created('2026-09-01', { intendedDate: '2026-10-20' }),
      created('2026-09-01', { status: 'done' }),
    ];
    expect(findForgottenTasks(tasks, today, 15).map((each) => each.text)).toEqual(['de 2026-09-01', 'de 2026-10-02']);
  });

  it('counts tasks waiting for someone and tasks left for a review too', () => {
    const tasks = [created('2026-09-01', { waiting: true }), created('2026-09-01', { awaitingReflection: true })];
    expect(findForgottenTasks(tasks, today, 15)).toHaveLength(2);
  });

  it('keeps the days a whole number from 1 up, 15 by default', () => {
    expect(normalizeForgottenTaskDays(undefined)).toBe(DEFAULT_FORGOTTEN_TASK_DAYS);
    expect(DEFAULT_FORGOTTEN_TASK_DAYS).toBe(15);
    expect(normalizeForgottenTaskDays(0)).toBe(1);
    expect(normalizeForgottenTaskDays(20.4)).toBe(20);
    expect(normalizeForgottenTaskDays(Number.NaN)).toBe(15);
  });
});

describe('whiteboards assistant', () => {
  const unlinked = (title: string | null, createdAt = '2026-10-01T09:00:00Z') =>
    section({ title, whiteboardDecision: 'leftUnlinked', createdAt });

  it('groups unlinked sections by repeated title and suggests a project for repeats', () => {
    const groups = findWhiteboardGroups(
      [unlinked('Mudança'), unlinked('mudança ', '2026-10-05T09:00:00Z'), unlinked('Leituras'), unlinked(null)],
      [],
    );
    expect(groups.map((g) => [g.title, g.sections.length, g.suggestion.kind])).toEqual([
      ['mudança', 2, 'convert'],
      ['Leituras', 1, 'keep'],
    ]);
  });

  it('suggests linking when a project with that name exists', () => {
    const studio = project('Data Studios');
    const [group] = findWhiteboardGroups([unlinked('data studios')], [studio]);
    expect(group.suggestion).toEqual({ kind: 'link', projectId: studio.id });
  });

  it('suggests linking when the text of a section cites an existing project', () => {
    const studio = project('Data Studios');
    const loose = unlinked('Ideias soltas');
    const [group] = findWhiteboardGroups([loose], [studio], new Map([[loose.id, 'Falar com o time do data studios']]));
    expect(group.suggestion).toEqual({ kind: 'link', projectId: studio.id });
  });

  it('ignores sections still pending, kept as they are, or linked', () => {
    expect(
      findWhiteboardGroups(
        [
          section({ title: 'A', whiteboardDecision: 'pending' }),
          section({ title: 'B', whiteboardDecision: 'keptUnlinked' }),
          section({ title: 'C', whiteboardDecision: 'leftUnlinked', projectId: 'p' }),
        ],
        [],
      ),
    ).toEqual([]);
  });
});

describe('duplicate projects assistant', () => {
  it('treats spacing, case, accents and one typo as the same name', () => {
    expect(areSimilarNames('Data Studios', 'DataStudios')).toBe(true);
    expect(areSimilarNames('Mudança', 'mudanca')).toBe(true);
    expect(areSimilarNames('Data Studios', 'Data Studio')).toBe(true);
    expect(areSimilarNames('Casa', 'Cama')).toBe(false);
    expect(areSimilarNames('Data Studios', 'Data Studio Pro')).toBe(false);
  });

  it('groups similar active projects and keeps the oldest', () => {
    const older = project('Data Studios', { createdAt: '2026-09-01T00:00:00Z' });
    const newer = project('DataStudios', { createdAt: '2026-10-01T00:00:00Z' });
    const other = project('Mudança');
    const [group, ...rest] = findDuplicateProjects([newer, other, older]);
    expect(rest).toEqual([]);
    expect(group.keep).toBe(older);
    expect(group.projects).toEqual([older, newer]);
  });

  it('respects "manter separados" and ignores finished projects', () => {
    const a = project('Data Studios');
    const b = project('DataStudios', { keepSeparateFrom: [a.id] });
    const c = project('Data-Studios', { status: 'finished' });
    expect(findDuplicateProjects([a, b, c])).toEqual([]);
  });
});
