import { describe, expect, it } from 'vitest';
import { PLACE_ICONS, sidebarGroups } from './sidebarPlaces';

const counts = { projects: 3, active: 7, people: 2 };
const hidden = { objectives: false, habits: false };

describe('sidebar places', () => {
  it('lists the places in groups and in order, with the footer last', () => {
    const groups = sidebarGroups({ counts, dueCount: 0, features: hidden });
    expect(groups.map((group) => [group.key, group.entries.map((entry) => entry.label)])).toEqual([
      ['start', ['Hoje', 'Rituais']],
      ['planning', ['Projetos']],
      ['lists', ['Tarefas', 'Pessoas']],
      ['footer', ['Dados e backup', 'Configurações']],
    ]);
  });

  it('shows objectives and habits only when their feature is on', () => {
    const groups = sidebarGroups({ counts, dueCount: 0, features: { objectives: true, habits: true } });
    const planning = groups.find((group) => group.key === 'planning');
    expect(planning?.entries.map((entry) => entry.place)).toEqual(['projects', 'objectives', 'habits']);
  });

  it('carries the counts and puts the "Rituais" counter on Rituais alone', () => {
    const entries = sidebarGroups({ counts, dueCount: 4, features: hidden }).flatMap((group) => group.entries);
    const byPlace = Object.fromEntries(entries.map((entry) => [entry.place, entry]));
    expect(byPlace.projects.count).toBe(3);
    expect(byPlace.active.count).toBe(7);
    expect(byPlace.people.count).toBe(2);
    expect(entries.filter((entry) => entry.due !== undefined)).toEqual([byPlace.rituals]);
    expect(byPlace.rituals.due).toBe(4);
  });

  it('leaves the counts out while they load', () => {
    const entries = sidebarGroups({ counts: undefined, dueCount: 0, features: hidden }).flatMap((group) => group.entries);
    expect(entries.every((entry) => entry.count === undefined)).toBe(true);
  });

  it('leads each place to its own screen, with an icon for each', () => {
    const entries = sidebarGroups({ counts, dueCount: 0, features: { objectives: true, habits: true } }).flatMap(
      (group) => group.entries,
    );
    for (const entry of entries) {
      expect(entry.route.name).toBe(entry.place);
      expect(PLACE_ICONS[entry.place]).toBeTruthy();
    }
  });
});
