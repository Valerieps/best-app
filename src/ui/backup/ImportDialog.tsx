import { useEffect, useRef } from 'react';
import type { BackupFile, ImportLoss } from '../../application/backup';

interface Props {
  backup: BackupFile;
  loss: ImportLoss;
  onConfirm: () => void;
  onCancel: () => void;
}

interface Noun {
  one: string;
  many: string;
  feminine: boolean;
}

const NOUNS = {
  blocks: { one: 'bloco', many: 'blocos', feminine: false },
  sections: { one: 'seção', many: 'seções', feminine: true },
  projects: { one: 'projeto', many: 'projetos', feminine: false },
  days: { one: 'dia', many: 'dias', feminine: false },
} satisfies Record<string, Noun>;

function removedLine(count: number, noun: Noun): string {
  const deleted = noun.feminine ? 'apagada' : 'apagado';
  return count === 1
    ? `1 ${noun.one} que não existe no backup será ${deleted}`
    : `${count} ${noun.many} que não existem no backup serão ${deleted}s`;
}

function revertedLine(count: number, noun: Noun): string {
  return count === 1
    ? `1 ${noun.one} voltará para uma versão mais antiga`
    : `${count} ${noun.many} voltarão para uma versão mais antiga`;
}

function lossLines(loss: ImportLoss): string[] {
  const lines: string[] = [];
  for (const name of ['blocks', 'sections', 'projects', 'days'] as const) {
    const table = loss[name];
    if (table.removed > 0) lines.push(removedLine(table.removed, NOUNS[name]));
    if (table.reverted > 0) lines.push(revertedLine(table.reverted, NOUNS[name]));
  }
  if (loss.missingEvents === 1) lines.push('1 alteração feita depois deste backup será perdida');
  if (loss.missingEvents > 1) lines.push(`${loss.missingEvents} alterações feitas depois deste backup serão perdidas`);
  return lines;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' });
}

export function ImportDialog({ backup, loss, onConfirm, onCancel }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog ref={dialogRef} className="dialog" onCancel={onCancel} aria-labelledby="import-title">
      <h2 id="import-title">Importar backup</h2>
      <p>
        Backup de <strong>{formatDate(backup.exportedAt)}</strong>. Importar substitui todos os dados deste navegador
        pelos dados do backup.
      </p>

      {loss.hasLoss ? (
        <div className="loss-warning" role="alert">
          <strong>Atenção: esta importação vai apagar dados.</strong>
          <ul>
            {lossLines(loss).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="muted">Nada será perdido: o backup tem tudo o que existe hoje neste navegador.</p>
      )}

      <p className="muted">Uma cópia dos dados atuais fica guardada, e você pode desfazer a importação depois.</p>

      <div className="dialog__actions">
        <button type="button" onClick={onCancel} autoFocus>
          Cancelar
        </button>
        <button type="button" className={loss.hasLoss ? 'danger' : 'primary'} onClick={onConfirm}>
          {loss.hasLoss ? 'Apagar e substituir' : 'Importar'}
        </button>
      </div>
    </dialog>
  );
}
