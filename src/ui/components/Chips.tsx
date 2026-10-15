import type { SectionKind } from '../../domain/entities';

export function KindChip({ kind }: { kind: SectionKind }) {
  return <span className={`chip chip--${kind}`}>{kind === 'meeting' ? 'Reunião' : 'Geral'}</span>;
}

export function WhiteboardChip() {
  return <span className="chip chip--whiteboard">quadro branco</span>;
}

/** Without a name: the "projeto" tag. With a name: the project itself, a link to its page when given `href`. */
export function ProjectChip({ name, href }: { name?: string; href?: string }) {
  if (href) {
    return (
      <a className="chip chip--project chip--link" href={href} title="Abrir a página do projeto">
        {name ?? 'projeto'}
      </a>
    );
  }
  return <span className="chip chip--project">{name ?? 'projeto'}</span>;
}

export function NoteChip({ children }: { children: string }) {
  return <span className="chip chip--muted">{children}</span>;
}
