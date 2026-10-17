import { describe, expect, it } from 'vitest';
import { cardStateLabel, shortAgeLabel } from './assistantInfo';

describe('the age chip of an assistant', () => {
  it('says how long the oldest item waits, in a few words', () => {
    expect(shortAgeLabel(null)).toBeNull();
    expect(shortAgeLabel(0)).toBe('de hoje');
    expect(shortAgeLabel(1)).toBe('há 1 dia');
    expect(shortAgeLabel(12)).toBe('há 12 dias');
  });
});

describe('the state of an assistant card', () => {
  it('gives the age of the oldest item for assistants colored by age', () => {
    expect(cardStateLabel('whiteboards', 2, 3)).toBe('o mais antigo espera há 3 dias');
  });

  it('gives how many tasks there are for "Tarefas esquecidas", colored by count', () => {
    expect(cardStateLabel('forgottenTasks', 7, 40)).toBe('7 tarefas');
    expect(cardStateLabel('forgottenTasks', 0, null)).toBeNull();
  });
});
