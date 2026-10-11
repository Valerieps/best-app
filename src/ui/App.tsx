import { useEffect, useState } from 'react';
import { requestPersistentStorage } from '../infrastructure/browser';
import { BackupBanner } from './backup/BackupBanner';
import { BackupIndicator } from './backup/BackupIndicator';
import { BackupPanel } from './backup/BackupPanel';
import { ImportDialog } from './backup/ImportDialog';
import { useAutoBackupState, useBackup } from './backup/useBackup';
import { autoBackup, db } from './services';
import { useLiveQuery } from './useLiveQuery';

function formatToday(): string {
  const label = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function App() {
  const backup = useBackup();
  const backupState = useAutoBackupState();
  const [storagePersisted, setStoragePersisted] = useState<boolean | null>(null);
  const hasData = useLiveQuery(async () => (await db.events.count()) > 0) ?? false;

  useEffect(() => {
    requestPersistentStorage().then(setStoragePersisted, () => setStoragePersisted(false));
    void autoBackup.init();
    // Try to save right away when the tab is hidden or closed.
    const onHide = () => {
      if (document.visibilityState === 'hidden') void autoBackup.flush();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);

  return (
    <>
      <header className="topbar">
        <span />
        <span className="topbar__date">{formatToday()}</span>
        <div className="topbar__actions">
          <BackupIndicator state={backupState} actions={backup} />
        </div>
      </header>

      <BackupBanner state={backupState} hasData={hasData} actions={backup} />

      <main className="page">
        <p className="muted">A nota do dia chega na próxima etapa (1a).</p>
        <BackupPanel state={backupState} actions={backup} storagePersisted={storagePersisted} />
      </main>

      {backup.pendingImport && (
        <ImportDialog
          backup={backup.pendingImport.backup}
          loss={backup.pendingImport.loss}
          onConfirm={backup.confirmImport}
          onCancel={backup.cancelImport}
        />
      )}
    </>
  );
}
