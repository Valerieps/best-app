import type { SectionKind } from '../../domain/entities';

export function KindChip({ kind }: { kind: SectionKind }) {
  return <span className={`chip chip--${kind}`}>{kind === 'meeting' ? 'Reunião' : 'Geral'}</span>;
}

export function WhiteboardChip() {
  return <span className="chip chip--whiteboard">quadro branco</span>;
}

/** Without a name: the "projeto" tag. With a name: the project itself. */
export function ProjectChip({ name }: { name?: string }) {
  return <span className="chip chip--project">{name ?? 'projeto'}</span>;
}

export function NoteChip({ children }: { children: string }) {
  return <span className="chip chip--muted">{children}</span>;
}
