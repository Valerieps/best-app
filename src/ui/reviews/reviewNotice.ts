import type { ReviewAvailability } from '../../application/reviewQueries';
import type { ReviewKind, ReviewReason } from '../../domain/reviews';

/** The notice of an available review in the day note (spec/rituais.md, "Quando uma revisão fica disponível"). */
export interface ReviewNotice {
  kind: ReviewKind;
  text: string;
}

const REVIEW_NAMES: Record<ReviewKind, string> = { focus: 'Revisão de Foco', direction: 'Revisão de Rumo' };

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Why the review is available, in the words of the notice. */
export function reasonText(kind: ReviewKind, reason: ReviewReason, names: Record<string, string>, hadReview = true): string {
  switch (reason.kind) {
    case 'cadence': {
      const since = hadReview ? `desde a última ${REVIEW_NAMES[kind]}` : 'desde o começo';
      return kind === 'focus'
        ? `${plural(reason.count, 'dia fechado', 'dias fechados')} ${since}`
        : `${plural(reason.count, 'Revisão de Foco', 'Revisões de Foco')} ${since}`;
    }
    case 'awaitingItems':
      return `${plural(reason.count, 'item esperando', 'itens esperando')} a Revisão de Foco`;
    case 'stalledFocusProject':
      return `o projeto ${names[reason.projectId] ?? 'em foco'} está parado há ${reason.days} dias`;
    case 'focusListEmptied':
      return 'o último projeto em foco foi finalizado';
    case 'tasksWithoutObjective':
      return `${reason.withoutObjective} de ${reason.finished} tarefas finalizadas não pertencem a um projeto com objetivo`;
    case 'stalledObjective':
      return `o objetivo “${names[reason.objectiveId] ?? ''}” está há ${reason.days} dias sem atividade`;
  }
}

/** The one review the notice offers: the Revisão de Foco first, then the Revisão de Rumo. */
export function pickReviewNotice(availability: ReviewAvailability | undefined): ReviewNotice | null {
  if (!availability) return null;
  for (const kind of ['focus', 'direction'] as const) {
    const reasons = availability[kind];
    if (reasons.length === 0) continue;
    const why = reasons.map((reason) => reasonText(kind, reason, availability.names, availability.hadReview[kind])).join('; ');
    return { kind, text: `A ${REVIEW_NAMES[kind]} está disponível: ${why}.` };
  }
  return null;
}

/**
 * "Lembrar depois" hides the notice until the next checkout: it stays hidden while no checkout
 * was done after the moment it was snoozed.
 */
export function isReviewSnoozed(snoozedAt: string | null, lastCheckoutAt: string | null): boolean {
  return snoozedAt !== null && (lastCheckoutAt === null || lastCheckoutAt <= snoozedAt);
}
