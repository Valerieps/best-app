import { describe, expect, it } from 'vitest';
import type { ReviewAvailability } from '../../application/reviewQueries';
import { isReviewSnoozed, pickReviewNotice, reasonText } from './reviewNotice';

const quiet: ReviewAvailability = {
  focus: [],
  direction: [],
  names: { p: 'Mudança', o: 'Morar no apartamento novo' },
  hadReview: { focus: true, direction: true },
  lastCheckoutAt: null,
};

describe('reasonText', () => {
  it('says why each review is available', () => {
    expect(reasonText('focus', { kind: 'cadence', count: 5 }, quiet.names)).toBe('5 dias fechados desde a última Revisão de Foco');
    expect(reasonText('focus', { kind: 'cadence', count: 41 }, quiet.names, false)).toBe('41 dias fechados desde o começo');
    expect(reasonText('direction', { kind: 'cadence', count: 1 }, quiet.names)).toBe('1 Revisão de Foco desde a última Revisão de Rumo');
    expect(reasonText('focus', { kind: 'awaitingItems', count: 12 }, quiet.names)).toBe('12 itens esperando a Revisão de Foco');
    expect(reasonText('focus', { kind: 'stalledFocusProject', projectId: 'p', days: 15 }, quiet.names)).toBe('o projeto Mudança está parado há 15 dias');
    expect(reasonText('focus', { kind: 'focusListEmptied' }, quiet.names)).toBe('o último projeto em foco foi finalizado');
    expect(reasonText('direction', { kind: 'tasksWithoutObjective', withoutObjective: 7, finished: 10 }, quiet.names)).toBe(
      '7 de 10 tarefas finalizadas não pertencem a um projeto com objetivo',
    );
    expect(reasonText('direction', { kind: 'stalledObjective', objectiveId: 'o', days: 31 }, quiet.names)).toBe(
      'o objetivo “Morar no apartamento novo” está há 31 dias sem atividade',
    );
  });
});

describe('pickReviewNotice', () => {
  it('offers nothing when no review is available', () => {
    expect(pickReviewNotice(quiet)).toBeNull();
    expect(pickReviewNotice(undefined)).toBeNull();
  });

  it('offers the Revisão de Foco first, with every reason', () => {
    const notice = pickReviewNotice({
      ...quiet,
      focus: [{ kind: 'cadence', count: 5 }, { kind: 'focusListEmptied' }],
      direction: [{ kind: 'cadence', count: 4 }],
    });
    expect(notice).toEqual({
      kind: 'focus',
      text: 'A Revisão de Foco está disponível: 5 dias fechados desde a última Revisão de Foco; o último projeto em foco foi finalizado.',
    });
  });

  it('offers the Revisão de Rumo when it is the only one', () => {
    expect(pickReviewNotice({ ...quiet, direction: [{ kind: 'cadence', count: 4 }] })?.kind).toBe('direction');
  });
});

describe('isReviewSnoozed', () => {
  it('hides the notice until a checkout is done after "Lembrar depois"', () => {
    expect(isReviewSnoozed(null, '2026-10-11T20:00:00Z')).toBe(false);
    expect(isReviewSnoozed('2026-10-11T10:00:00Z', null)).toBe(true);
    expect(isReviewSnoozed('2026-10-11T10:00:00Z', '2026-10-10T20:00:00Z')).toBe(true);
    expect(isReviewSnoozed('2026-10-11T10:00:00Z', '2026-10-11T20:00:00Z')).toBe(false);
  });
});
