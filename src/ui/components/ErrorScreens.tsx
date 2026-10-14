import { errorMessage } from './ErrorBoundary';
import { ScreenHeader } from './ScreenHeader';

function Details({ error }: { error: unknown }) {
  return (
    <details className="error-screen__details">
      <summary>Detalhes técnicos</summary>
      <pre>{errorMessage(error)}</pre>
    </details>
  );
}

interface ScreenErrorProps {
  error: unknown;
  onRetry(): void;
  /** Opens "Dados e backup"; absent when that is the screen that failed. */
  onOpenData?(): void;
}

/** Shown in place of a screen that failed; the sidebar keeps working around it. */
export function ScreenError({ error, onRetry, onOpenData }: ScreenErrorProps) {
  return (
    <main className="page">
      <ScreenHeader title="Algo deu errado nesta tela" />
      <section className="panel error-screen">
        <p>
          Seus dados continuam guardados neste navegador. Tente de novo; se o erro voltar, baixe uma cópia em "Dados e
          backup" antes de qualquer outra coisa.
        </p>
        <div className="error-screen__actions">
          <button type="button" className="primary" onClick={onRetry}>
            Tentar de novo
          </button>
          {onOpenData && (
            <button type="button" onClick={onOpenData}>
              Abrir "Dados e backup"
            </button>
          )}
        </div>
        <Details error={error} />
      </section>
    </main>
  );
}

/** Shown when the app itself failed to draw, sidebar included: reloading is the way out. */
export function AppError({ error }: { error: unknown }) {
  return (
    <main className="page">
      <ScreenHeader title="Algo deu errado" />
      <section className="panel error-screen">
        <p>
          O app não conseguiu abrir. Seus dados continuam guardados neste navegador, e o backup automático, se estiver
          ativo, continua na pasta que você escolheu, com as cópias datadas.
        </p>
        <div className="error-screen__actions">
          <button type="button" className="primary" onClick={() => window.location.reload()}>
            Recarregar
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.hash = '#/dados';
              window.location.reload();
            }}
          >
            Recarregar em "Dados e backup"
          </button>
        </div>
        <Details error={error} />
      </section>
    </main>
  );
}
