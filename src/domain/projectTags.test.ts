import { describe, expect, it } from 'vitest';
import type { Project } from './entities';
import {
  completeTag,
  findTaggedProject,
  findTags,
  formatTag,
  projectAfterText,
  renameTags,
  tagAt,
  tagOptions,
  tagProject,
  taggedNames,
} from './projectTags';

function project(id: string, name: string, status: Project['status'] = 'active'): Project {
  return { id, name, status, createdAt: '', updatedAt: '', finishedAt: null };
}

const data = project('p1', 'Data Studios');
const app = project('p2', 'App');
const old = project('p3', 'Velho', 'finished');
const merged = project('p4', 'Junto', 'merged');
const projects = [data, app, old, merged];

describe('project tags', () => {
  it('reads a one-word tag and a bracketed name with spaces', () => {
    expect(taggedNames('Falar com o time #App sobre o deploy')).toEqual(['App']);
    expect(taggedNames('Revisar #[Data Studios] amanhã')).toEqual(['Data Studios']);
    expect(taggedNames('#App, depois #[Data Studios].')).toEqual(['App', 'Data Studios']);
  });

  it('keeps a heading a heading: `# ` is no tag, `#Nome` at the start is', () => {
    expect(taggedNames('# Título')).toEqual([]);
    expect(taggedNames('## Título')).toEqual([]);
    expect(taggedNames('#App no começo')).toEqual(['App']);
  });

  it('needs a space or an opening mark before the #', () => {
    expect(taggedNames('C# e a#b e https://x.com/#App')).toEqual([]);
    expect(taggedNames('(#App) e **#App**')).toEqual(['App', 'App']);
    expect(taggedNames('item #164')).toEqual([]);
  });

  it('skips escapes and code', () => {
    expect(taggedNames('\\#App não é tag')).toEqual([]);
    expect(taggedNames('o código `#App` fica como está')).toEqual([]);
    expect(taggedNames('`a` #App')).toEqual(['App']);
  });

  it('reads escapes inside the brackets, and an unclosed bracket is no tag', () => {
    expect(taggedNames('#[A \\] B]')).toEqual(['A ] B']);
    expect(taggedNames('#[Data Studios sem fechar')).toEqual([]);
    expect(taggedNames('#[ ]')).toEqual([]);
  });

  it('writes the bare form for one word and brackets otherwise', () => {
    expect(formatTag('App')).toBe('#App');
    expect(formatTag('best-app')).toBe('#best-app');
    expect(formatTag('Data Studios')).toBe('#[Data Studios]');
    expect(formatTag('2026')).toBe('#[2026]');
    expect(formatTag('A]B')).toBe('#[A\\]B]');
    for (const name of ['App', 'Data Studios', 'A]B', 'x\\y', 'fim-']) expect(taggedNames(formatTag(name))).toEqual([name]);
  });

  it('finds the project loosely, never a merged one, and prefers an active one', () => {
    expect(findTaggedProject('data   STUDIOS', projects)).toBe(data);
    expect(findTaggedProject('Velho', projects)).toBe(old);
    expect(findTaggedProject('Junto', projects)).toBeNull();
    const twin = project('p5', 'Velho');
    expect(findTaggedProject('velho', [old, twin])).toBe(twin);
    expect(tagProject('#Nada e depois #App', projects)).toBe(app);
  });

  it('moves the block only when its tag changes', () => {
    const task = { kind: 'task' as const, projectId: 'section', text: 'Fazer #App' };
    expect(projectAfterText(task, null, 'section', projects)).toBe('p2');
    expect(projectAfterText({ ...task, projectId: 'p2', text: 'Fazer #App já' }, 'Fazer #App', 'section', projects)).toBe('p2');
    expect(projectAfterText({ ...task, projectId: 'p2', text: 'Fazer' }, 'Fazer #App', 'section', projects)).toBe('section');
    expect(projectAfterText({ ...task, projectId: 'p2', text: 'Fazer' }, 'Fazer #App', null, projects)).toBeNull();
    // A project chosen at the closing stays while the line has no tag.
    expect(projectAfterText({ ...task, projectId: 'chosen', text: 'Fazer isso' }, 'Fazer', null, projects)).toBe('chosen');
    const note = { kind: 'note' as const, projectId: 'p2', text: 'Ideia' };
    expect(projectAfterText(note, 'Ideia #App', 'section', projects)).toBeNull();
  });

  it('rewrites only the tags of the renamed project', () => {
    const text = 'Ver #App, #[Data Studios] e `#App`';
    expect(renameTags(text, 'p2', 'Meu App', projects)).toBe('Ver #[Meu App], #[Data Studios] e `#App`');
    expect(renameTags(text, 'p1', 'DS', projects)).toBe('Ver #App, #DS e `#App`');
    expect(renameTags('nada aqui', 'p1', 'DS', projects)).toBe('nada aqui');
  });

  it('finds the tag being typed, spaces included, but not a heading, an escape or code', () => {
    expect(tagAt('Ver #Da', 7)).toEqual({ start: 4, end: 7, query: 'Da' });
    expect(tagAt('Ver #Data St', 12)).toEqual({ start: 4, end: 12, query: 'Data St' });
    expect(tagAt('Ver #Dat agora', 7)).toEqual({ start: 4, end: 8, query: 'Da' });
    expect(tagAt('Ver #[Data] x', 8)).toEqual({ start: 4, end: 11, query: 'Da' });
    expect(tagAt('#', 1)).toEqual({ start: 0, end: 1, query: '' });
    expect(tagAt('# Título', 3)).toBeNull();
    expect(tagAt('\\#Da', 4)).toBeNull();
    expect(tagAt('` #Da', 5)).toEqual({ start: 2, end: 5, query: 'Da' });
    expect(tagAt('`a #Da`', 6)).toBeNull();
    expect(tagAt('#[Data] e', 9)).toBeNull();
    expect(tagAt('#App', 0)).toBeNull();
  });

  it('suggests only active projects that match, starting ones first', () => {
    expect(tagOptions('', projects).map((each) => each.name)).toEqual(['App', 'Data Studios']);
    expect(tagOptions('stud', projects)).toEqual([data]);
    expect(tagOptions('vel', projects)).toEqual([]);
    const apple = project('p6', 'Apple');
    const snapp = project('p7', 'Snapp');
    expect(tagOptions('app', [snapp, apple, app]).map((each) => each.name)).toEqual(['App', 'Apple', 'Snapp']);
  });

  it('completes the tag with the form the name needs', () => {
    const text = 'Ver #Da amanhã';
    expect(completeTag(text, tagAt(text, 7)!, 'Data Studios')).toEqual({ text: 'Ver #[Data Studios] amanhã', caret: 20 });
    expect(completeTag('#A', tagAt('#A', 2)!, 'App')).toEqual({ text: '#App ', caret: 5 });
  });

  it('gives the positions of each tag', () => {
    expect(findTags('a #App b')).toEqual([{ start: 2, end: 6, name: 'App' }]);
  });
});
