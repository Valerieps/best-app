import { describe, expect, it } from 'vitest';
import { ageLabel, shortAgeLabel } from './assistantInfo';

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
    expect(ageLabel(3)).toBe('o mais antigo espera há 3 dias');
  });
});
