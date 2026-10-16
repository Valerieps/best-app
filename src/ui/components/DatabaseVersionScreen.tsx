import type { ReactNode } from 'react';
import { useDatabaseVersionStatus, type DatabaseVersionStatus } from '../databaseVersion';
import { ScreenHeader } from './ScreenHeader';

/** Shown in place of the app when this tab's code no longer matches the database (ADR-059). */
function DatabaseVersionScreen({ status }: { status: Exclude<DatabaseVersionStatus, 'ok'> }) {
  return (
    <main className="page">
      <ScreenHeader title="O app foi atualizado" />
      <section className="panel error-screen">
        <p>
          {status === 'replaced'
            ? 'Uma versão nova do app abriu em outra aba e atualizou seus dados. Recarregue esta página para continuar; nada do que já estava salvo se perdeu.'
            : 'Seus dados já foram atualizados por uma versão mais nova do app. Recarregue a página para abrir essa versão; esta não vai mexer neles.'}
        </p>
        <div className="error-screen__actions">
          <button type="button" className="primary" onClick={() => window.location.reload()}>
            Recarregar
          </button>
        </div>
      </section>
    </main>
  );
}

/** Renders the app only while its code matches the database. */
export function DatabaseVersionGate({ children }: { children: ReactNode }) {
  const status = useDatabaseVersionStatus();
  return status === 'ok' ? <>{children}</> : <DatabaseVersionScreen status={status} />;
}
