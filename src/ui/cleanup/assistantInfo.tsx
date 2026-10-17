import { COUNTED_ASSISTANTS, type AssistantId, type CleanupStatus } from '../../domain/cleanupStatus';
import { plural } from '../format';

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
  forgottenTasks: {
    name: 'Tarefas esquecidas',
    description: 'Tarefas sem data há muito tempo, contado desde a criação, em risco de abandono.',
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
      {id === 'forgottenTasks' && (
        <>
          <path d="M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z" />
          <path d="M12 7v5l3 2" />
        </>
      )}
    </svg>
  );
}

/** What a card says after its color: how long the oldest item waits, or how many there are. */
export function cardStateLabel(id: AssistantId, count: number, ageInDays: number | null): string | null {
  if (COUNTED_ASSISTANTS.has(id)) return count > 0 ? plural(count, 'tarefa', 'tarefas') : null;
  return ageLabel(ageInDays);
}

/** "o mais antigo espera há 3 dias", for the cards and the assistant header. */
export function ageLabel(ageInDays: number | null): string | null {
  if (ageInDays === null) return null;
  if (ageInDays === 0) return 'o mais antigo é de hoje';
  return `o mais antigo espera há ${ageInDays} ${ageInDays === 1 ? 'dia' : 'dias'}`;
}

/** The same age, short enough for a chip next to the assistant's name: "há 3 dias", "de hoje". */
export function shortAgeLabel(ageInDays: number | null): string | null {
  if (ageInDays === null) return null;
  if (ageInDays === 0) return 'de hoje';
  return `há ${ageInDays} ${ageInDays === 1 ? 'dia' : 'dias'}`;
}
