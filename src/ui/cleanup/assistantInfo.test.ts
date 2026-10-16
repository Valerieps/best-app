import { describe, expect, it } from 'vitest';
import { focusReviewStatus } from './assistantInfo';

describe('the Revisão de Foco card', () => {
  it('is green while the review is not available and yellow once it is', () => {
    expect(focusReviewStatus(false)).toBe(0);
    expect(focusReviewStatus(true)).toBe(1);
  });
});
