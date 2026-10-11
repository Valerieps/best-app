import { useEffect, useState } from 'react';
import { needsBackupReminder } from '../application/backup';
import { getLastBackupAt } from '../infrastructure/backupRepository';
import { requestPersistentStorage } from '../infrastructure/browser';
import { BackupPanel } from './backup/BackupPanel';
import { useBackupActions } from './backup/useBackupActions';
import { db } from './services';
import { useLiveQuery } from './useLiveQuery';

function formatToday(): string {
  const label = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function App() {
  const backup = useBackupActions();
  const [storagePersisted, setStoragePersisted] = useState<boolean | null>(null);

  useEffect(() => {
    requestPersistentStorage().then(setStoragePersisted, () => setStoragePersisted(false));
  }, []);

  const showBackupReminder = useLiveQuery(async () => {
    const hasData = (await db.events.count()) > 0;
    return needsBackupReminder(await getLastBackupAt(db), hasData, new Date());
  });

  return (
    <>
      <header className="topbar">
        <span />
        <span className="topbar__date">{formatToday()}</span>
        <div className="topbar__actions">
          <button type="button" onClick={backup.quickSave} title="Salvar backup agora">
            Salvar backup
          </button>
        </div>
      </header>

      {showBackupReminder && (
        <div className="banner" role="status">
          <span>Faz tempo que você não salva um backup dos seus dados.</span>
          <button type="button" className="link" onClick={backup.quickSave}>
            Salvar agora
          </button>
        </div>
      )}

      <main className="page">
        <p className="muted">A nota do dia chega na próxima etapa (1a).</p>
        <BackupPanel actions={backup} storagePersisted={storagePersisted} />
      </main>
    </>
  );
}
