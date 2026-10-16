import { describe, expect, it } from 'vitest';
import { focusReviewStatus, shortAgeLabel } from './assistantInfo';

describe('the Revisão de Foco card', () => {
  it('is green while the review is not available and yellow once it is', () => {
    expect(focusReviewStatus(false)).toBe(0);
    expect(focusReviewStatus(true)).toBe(1);
  });
});

describe('the age chip of an assistant', () => {
  it('says how long the oldest item waits, in a few words', () => {
    expect(shortAgeLabel(null)).toBeNull();
    expect(shortAgeLabel(0)).toBe('de hoje');
    expect(shortAgeLabel(1)).toBe('há 1 dia');
    expect(shortAgeLabel(12)).toBe('há 12 dias');
  });
});
