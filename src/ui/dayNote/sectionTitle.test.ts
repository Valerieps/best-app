import { describe, expect, it } from 'vitest';
import { project } from '../../test/builders';
import { titleOptions, titleToSaveOnBlur } from './sectionTitle';

describe('titleToSaveOnBlur', () => {
  it('saves a title typed and left without choosing a suggestion', () => {
    expect(titleToSaveOnBlur('Compras', null, false)).toBe('Compras');
    expect(titleToSaveOnBlur('Compras', 'Feira', false)).toBe('Compras');
  });

  it('saves nothing when the title did not change', () => {
    expect(titleToSaveOnBlur('Feira ', 'Feira', false)).toBeNull();
    expect(titleToSaveOnBlur('', null, false)).toBeNull();
  });

  it('never writes the typed text over a chosen project', () => {
    expect(titleToSaveOnBlur('Ref', null, true)).toBeNull();
  });
});

describe('titleOptions', () => {
  const kitchen = project('Reforma da cozinha');
  const kitchenTypo = project('Reforma da cosinha');
  const studio = project('Data Studios');
  const done = project('Reforma antiga', { status: 'finished' });
  const all = [kitchen, kitchenTypo, studio, done];
  const kinds = (options: ReturnType<typeof titleOptions>) =>
    options.map((option) => (option.type === 'project' ? `project:${option.project.name}` : option.type));

  it('on a whiteboard, suggests active projects, creating one and a plain title', () => {
    expect(kinds(titleOptions('Ref', all, null))).toEqual([
      'project:Reforma da cozinha',
      'project:Reforma da cosinha',
      'create',
      'titleOnly',
    ]);
  });

  it('offers no creation when a project already has the typed name', () => {
    expect(kinds(titleOptions('data studios', all, null))).toEqual(['project:Data Studios', 'titleOnly']);
  });

  it('on a linked section, offers to keep the project first, then the others, never the current one', () => {
    expect(kinds(titleOptions('Ref', all, kitchen))).toEqual(['keepProject', 'project:Reforma da cosinha', 'create', 'titleOnly']);
  });

  it('on a linked section with its project name, offers the other projects and going back to a whiteboard', () => {
    expect(kinds(titleOptions('Reforma da cozinha', all, kitchen))).toEqual(['titleOnly']);
    expect(kinds(titleOptions('Reforma', all, kitchen))).toEqual(['keepProject', 'project:Reforma da cosinha', 'create', 'titleOnly']);
  });

  it('suggests nothing for an empty title', () => {
    expect(titleOptions('  ', all, kitchen)).toEqual([]);
  });
});
