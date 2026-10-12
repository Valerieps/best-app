import type { ReactNode } from 'react';

/** Gray lines that stand in for content while a query runs. They fade in only after a short wait. */
export function SkeletonLines({ count = 5 }: { count?: number }) {
  return (
    <div className="skeleton" role="status">
      <span className="visually-hidden">Carregando…</span>
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className="skeleton__line" aria-hidden="true" />
      ))}
    </div>
  );
}

/** A screen still loading: the title shows at once, so the screen never opens blank. */
export function LoadingPage({ title, before, lines }: { title?: ReactNode; before?: ReactNode; lines?: number }) {
  return (
    <main className="page" aria-busy="true">
      {before}
      {title && <h1 className="page__title">{title}</h1>}
      <SkeletonLines count={lines} />
    </main>
  );
}
