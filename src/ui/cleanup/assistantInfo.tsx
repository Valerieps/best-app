import type { AssistantId, CleanupStatus } from '../../domain/cleanupStatus';

/** Name, description and icon of each cleanup assistant, as the user sees them. */
export const ASSISTANT_INFO: Record<AssistantId, { name: string; description: string }> = {
  pendingDays: {
    name: 'Dias em aberto',
    description: 'Dias que ficaram sem fechamento.',
  },
  whiteboards: {
    name: 'Seções soltas',
    description: 'Seções que ficaram sem projeto, agrupadas pelos títulos repetidos.',
  },
  duplicates: {
    name: 'Projetos repetidos',
    description: 'Projetos com nomes parecidos. Juntar move as seções e tarefas para o projeto mais antigo.',
  },
};

export const STATUS_LABELS: Record<CleanupStatus, string> = {
  0: 'em dia',
  1: 'atenção',
  2: 'acumulando',
  3: 'urgente',
};

/** Line icons drawn inline: the app never downloads assets. */
export function AssistantIcon({ id }: { id: AssistantId }) {
  return (
    <svg className="assistant-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {id === 'pendingDays' && (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </>
      )}
      {id === 'whiteboards' && (
        <>
          <path d="M5 3h10l4 4v14H5z" />
          <path d="M15 3v4h4M8 12h8M8 16h5" />
        </>
      )}
      {id === 'duplicates' && (
        <>
          <rect x="8" y="8" width="13" height="13" rx="2" />
          <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
        </>
      )}
    </svg>
  );
}

/** "o mais antigo espera há 3 dias", for the cards and the assistant header. */
export function ageLabel(ageInDays: number | null): string | null {
  if (ageInDays === null) return null;
  if (ageInDays === 0) return 'o mais antigo é de hoje';
  return `o mais antigo espera há ${ageInDays} ${ageInDays === 1 ? 'dia' : 'dias'}`;
}
