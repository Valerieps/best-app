import type { Block, Project, Section } from '../domain/entities';

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${++counter}`;

export function section(overrides: Partial<Section> = {}): Section {
  const day = overrides.day ?? '2026-10-11';
  return {
    id: nextId('s'),
    kind: 'general',
    day,
    createdAt: `${day}T09:00:00.000Z`,
    updatedAt: `${day}T09:00:00.000Z`,
    title: null,
    projectId: null,
    notesDestination: 'pending',
    whiteboardDecision: 'pending',
    ...overrides,
  };
}

export function note(sectionId: string, text = 'nota', overrides: Partial<Block> = {}): Block {
  return {
    id: nextId('n'),
    kind: 'note',
    text,
    sectionId,
    position: 'a',
    projectId: null,
    createdAt: '2026-10-11T09:00:00.000Z',
    updatedAt: '2026-10-11T09:00:00.000Z',
    status: null,
    intendedDate: null,
    firstIntendedDate: null,
    postponeCount: 0,
    closedAt: null,
    lastTriagedDay: null,
    ...overrides,
  };
}

export function task(sectionId: string, text = 'tarefa', overrides: Partial<Block> = {}): Block {
  return note(sectionId, text, { id: nextId('t'), kind: 'task', status: 'active', ...overrides });
}

export function project(name: string, overrides: Partial<Project> = {}): Project {
  return {
    id: nextId('p'),
    name,
    status: 'active',
    createdAt: '2026-10-01T09:00:00.000Z',
    updatedAt: '2026-10-01T09:00:00.000Z',
    finishedAt: null,
    ...overrides,
  };
}
