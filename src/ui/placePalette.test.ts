import { describe, expect, it } from 'vitest';
import { filterPlaces, foldText, isPaletteShortcut, moveActive, palettePlaces } from './placePalette';

const off = { objectives: false, habits: false };
const labels = (query: string, features = off) => filterPlaces(palettePlaces(features), query).map((place) => place.label);

describe('place palette', () => {
  it('lists the sidebar places in order, with objectives and habits only when on', () => {
    expect(labels('')).toEqual(['Hoje', 'Rituais', 'Projetos', 'Tarefas', 'Pessoas', 'Dados e backup', 'Configurações']);
    expect(labels('', { objectives: true, habits: true })).toEqual([
      'Hoje',
      'Rituais',
      'Projetos',
      'Objetivos',
      'Hábitos',
      'Tarefas',
      'Pessoas',
      'Dados e backup',
      'Configurações',
    ]);
  });

  it('ignores case and accents', () => {
    expect(foldText('  Configurações ')).toBe('configuracoes');
    expect(labels('CONFIGURACOES')).toEqual(['Configurações']);
    expect(labels('habitos', { objectives: false, habits: true })).toEqual(['Hábitos']);
  });

  it('finds a part of the name, names starting with it first', () => {
    expect(labels('backup')).toEqual(['Dados e backup']);
    expect(labels('ta')).toEqual(['Tarefas']);
    expect(labels('p')).toEqual(['Projetos', 'Pessoas', 'Dados e backup']);
    expect(labels('xyz')).toEqual([]);
  });

  it('moves the highlighted option with the arrows, wrapping around', () => {
    expect(moveActive(0, 'ArrowDown', 3)).toBe(1);
    expect(moveActive(2, 'ArrowDown', 3)).toBe(0);
    expect(moveActive(0, 'ArrowUp', 3)).toBe(2);
    expect(moveActive(-1, 'ArrowUp', 3)).toBe(2);
    expect(moveActive(-1, 'ArrowDown', 3)).toBe(0);
    expect(moveActive(1, 'End', 3)).toBe(2);
    expect(moveActive(1, 'Home', 3)).toBe(0);
    expect(moveActive(1, 'a', 3)).toBe(1);
    expect(moveActive(0, 'ArrowDown', 0)).toBe(-1);
  });

  it('opens with Ctrl + K or Cmd + K only, by the key position', () => {
    const key = (init: Partial<Parameters<typeof isPaletteShortcut>[0]>) =>
      isPaletteShortcut({ code: 'KeyK', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...init });
    expect(key({ ctrlKey: true })).toBe(true);
    expect(key({ metaKey: true })).toBe(true);
    expect(key({})).toBe(false);
    expect(key({ ctrlKey: true, shiftKey: true })).toBe(false);
    expect(key({ ctrlKey: true, altKey: true })).toBe(false);
    expect(key({ ctrlKey: true, code: 'KeyJ' })).toBe(false);
  });
});
