import { describe, expect, it } from 'vitest';
import { detectKind } from './blockKind';
import type { Block, Project, Section } from './entities';
import { isOpenIdea, noteToIdea, projectNameFromIdea, sortIdeas } from './ideas';
import { projectAfterText } from './projectTags';
import { canEditFreely } from './tasks';

const project = (id: string, name: string): Project => ({ id, name, status: 'active', createdAt: '', updatedAt: '', finishedAt: null });

describe('ideas', () => {
  it('are lines that start with "[?] "', () => {
    expect(detectKind('[?] App de receitas')).toEqual({ kind: 'idea', text: 'App de receitas' });
    expect(detectKind('[?]sem espaço')).toEqual({ kind: 'note', text: '[?]sem espaço' });
    expect(detectKind('Uma nota [?] no meio')).toEqual({ kind: 'note', text: 'Uma nota [?] no meio' });
    expect(detectKind('[] Tarefa').kind).toBe('task');
  });

  it('are open until they get a destination', () => {
    expect(isOpenIdea({ kind: 'idea', ideaStatus: 'open' })).toBe(true);
    expect(isOpenIdea({ kind: 'idea', ideaStatus: undefined })).toBe(true);
    expect(isOpenIdea({ kind: 'idea', ideaStatus: 'dropped' })).toBe(false);
    expect(isOpenIdea({ kind: 'idea', ideaStatus: 'becameProject' })).toBe(false);
    expect(isOpenIdea({ kind: 'task', ideaStatus: undefined })).toBe(false);
  });

  it('come oldest first in the list', () => {
    const at = (id: string, createdAt: string) => ({ id, createdAt }) as Block;
    expect(sortIdeas([at('b', '2026-11-02'), at('a', '2026-11-01'), at('c', '2026-11-03')]).map((idea) => idea.id)).toEqual(['a', 'b', 'c']);
  });

  it('follow the section and the tag, like tasks', () => {
    const projects = [project('p1', 'Casa'), project('p2', 'App')];
    expect(projectAfterText({ kind: 'idea', text: 'Horta #App', projectId: 'p1' }, 'Horta', 'p1', projects)).toBe('p2');
    expect(projectAfterText({ kind: 'idea', text: 'Horta', projectId: 'p2' }, 'Horta #App', 'p1', projects)).toBe('p1');
    expect(projectAfterText({ kind: 'note', text: 'Horta', projectId: 'p2' }, 'Horta #App', 'p1', projects)).toBeNull();
  });

  it('can be edited as plain text only while nothing was decided or written about them', () => {
    const section = { day: '2026-11-10', notesDestination: 'pending' } as Section;
    const idea = { kind: 'idea', ideaStatus: 'open', notYetCount: 0, ideaSectionId: null } as Block;
    expect(canEditFreely(idea, section, '2026-11-10')).toBe(true);
    expect(canEditFreely({ ...idea, notYetCount: 1 }, section, '2026-11-10')).toBe(false);
    expect(canEditFreely({ ...idea, ideaSectionId: 's9' }, section, '2026-11-10')).toBe(false);
    expect(canEditFreely({ ...idea, ideaStatus: 'dropped' }, section, '2026-11-10')).toBe(false);
    expect(canEditFreely(idea, section, '2026-11-11')).toBe(false);
  });
});

describe('the name of the project an idea becomes', () => {
  const projects = [project('p1', 'Data Studios'), project('p2', 'Casa')];

  it('leaves out the project tags', () => {
    expect(projectNameFromIdea('Painel de vendas #[Data Studios]', projects)).toBe('Painel de vendas');
    expect(projectNameFromIdea('Uma #Casa na praia', projects)).toBe('Uma na praia');
  });

  it('keeps a "#" that names no project, and falls back to the whole text', () => {
    expect(projectNameFromIdea('Curso de C# avançado #nada', projects)).toBe('Curso de C# avançado #nada');
    expect(projectNameFromIdea('#Casa', projects)).toBe('#Casa');
  });
});

describe('version 11: notes written with "[?] "', () => {
  it("become ideas, with the tag's project or else the section's", () => {
    const fields = { ideaStatus: 'open', notYetCount: 0, lastNotYetAt: null, ideaSectionId: null };
    expect(noteToIdea({ kind: 'note', text: '[?] Horta', projectId: null }, 'p1')).toEqual({ kind: 'idea', text: 'Horta', projectId: 'p1', ...fields });
    expect(noteToIdea({ kind: 'note', text: '[?] Horta #App', projectId: 'p2' }, 'p1')).toEqual({ kind: 'idea', text: 'Horta #App', projectId: 'p2', ...fields });
  });

  it('leave every other row as it is', () => {
    const rows = [
      { kind: 'note', text: 'Só uma nota', projectId: null },
      { kind: 'task', text: '[?] Tarefa', projectId: null },
      { kind: 'note', text: 42, projectId: null },
    ];
    for (const row of rows) expect(noteToIdea(row, 'p1')).toBe(row);
  });
});
