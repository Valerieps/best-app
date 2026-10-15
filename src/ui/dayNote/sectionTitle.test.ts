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

  it('on a linked section, clicking the title lists going back to a whiteboard, renaming and every other active project', () => {
    const options = titleOptions('Reforma da cozinha', all, kitchen, false);
    expect(kinds(options)).toEqual(['titleOnly', 'rename', 'project:Data Studios', 'project:Reforma da cosinha']);
    expect(options[0]).toEqual({ type: 'titleOnly', name: 'Reforma da cozinha' });
    expect(options[1]).toEqual({ type: 'rename', name: 'Reforma da cozinha', project: kitchen });
  });

  it('on a linked section, typing the project name back shows the same list', () => {
    expect(kinds(titleOptions('reforma da cozinha', all, kitchen))).toEqual(['titleOnly', 'rename', 'project:Data Studios', 'project:Reforma da cosinha']);
  });

  it('on a linked section, typing offers renaming first, then filters the other projects', () => {
    const options = titleOptions('Ref', all, kitchen);
    expect(kinds(options)).toEqual(['rename', 'titleOnly', 'project:Reforma da cosinha', 'create']);
    expect(options[0]).toEqual({ type: 'rename', name: 'Ref', project: kitchen });
  });

  it('on a linked section, offers no creation when a project already has the typed name', () => {
    expect(kinds(titleOptions('Data Studios', all, kitchen))).toEqual(['rename', 'titleOnly', 'project:Data Studios']);
  });

  it('suggests nothing for an empty title', () => {
    expect(titleOptions('  ', all, null)).toEqual([]);
    expect(titleOptions('  ', all, kitchen)).toEqual([]);
  });
});
