/** Pieces shared by the screens of the Revisão de Foco and the Revisão de Rumo. */

export function Step({ number, title, children }: { number?: number; title: string; children: React.ReactNode }) {
  const id = `step-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <section className="reflection__step" aria-labelledby={id}>
      <h2 className="reflection__step-title" id={id}>
        {number !== undefined && <span className="reflection__step-number">{number}</span>} {title}
      </h2>
      {children}
    </section>
  );
}

export function Metric({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="metric">
      <span className="metric__value">{value}</span>
      <span className="metric__label">{label}</span>
    </div>
  );
}
