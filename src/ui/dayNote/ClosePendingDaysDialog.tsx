import { useEffect, useRef, useState } from 'react';
import { closePendingDays, summarizeClosePendingDays } from '../../application/checkout';
import { loadPendingTriages } from '../../application/queries';
import type { DayKey } from '../../domain/day';
import type { DayTriage } from '../../domain/triage';
import { listDays, plural } from '../format';
import { navigate } from '../hooks';
import { appContext, reader } from '../services';

interface Props {
  today: DayKey;
  onClose(): void;
}

/** "Fechar dias pendentes": applies the auto-triage to every pending day at once. */
export function ClosePendingDaysDialog({ today, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [triages, setTriages] = useState<DayTriage[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
    loadPendingTriages(reader, today).then(setTriages, () => setTriages([]));
  }, [today]);

  const summary = triages ? summarizeClosePendingDays(triages) : null;

  async function confirm() {
    if (!triages) return;
    setBusy(true);
    try {
      await closePendingDays(appContext, triages);
    } finally {
      onClose();
    }
  }

  return (
    <dialog ref={dialogRef} className="dialog" onCancel={onClose} aria-labelledby="close-days-title">
      {summary && (
        <>
          <h2 id="close-days-title">Fechar {plural(summary.days.length, 'dia pendente', 'dias pendentes')}</h2>
          <p className="muted">
            {listDays(summary.days, today)}. As regras da auto-triagem são aplicadas a todos de uma vez.
          </p>
          <ul className="card-list">
            {summary.tasks > 0 && (
              <li className="card-list__item">
                <span>
                  {summary.tasks === 1
                    ? '1 tarefa não feita volta para a lista de tarefas, sem data'
                    : `${summary.tasks} tarefas não feitas voltam para a lista de tarefas, sem data`}
                </span>
                <span className="muted">contam como adiamento</span>
              </li>
            )}
            {summary.whiteboards > 0 && (
              <li className="card-list__item">
                {summary.whiteboards === 1
                  ? '1 seção em quadro branco fica sem vínculo'
                  : `${summary.whiteboards} seções em quadro branco ficam sem vínculo`}
              </li>
            )}
            <li className="card-list__item muted">Nada é apagado nem abandonado</li>
          </ul>
          <div className="dialog__actions">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate({ name: 'checkout', day: summary.days[0] });
              }}
            >
              Revisar dia a dia
            </button>
            <button type="button" className="primary" onClick={confirm} disabled={busy}>
              Fechar dias pendentes
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}
