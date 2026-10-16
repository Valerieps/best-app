import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerServiceWorker } from './infrastructure/browser';
import { App } from './ui/App';
import { ErrorBoundary } from './ui/components/ErrorBoundary';
import { AppError } from './ui/components/ErrorScreens';
import { PeopleProvider } from './ui/people/PeopleContext';
import { DATABASE_VERSION } from './infrastructure/db';
import { DatabaseVersionGate } from './ui/components/DatabaseVersionScreen';
import { watchDatabaseVersion } from './ui/databaseVersion';
import { appContext, db } from './ui/services';
import { applyAppearance, readStoredAppearance } from './ui/theme/appearance';
import { restoreUnsavedLines } from './ui/unsavedLines';
// Inter, bundled with the app and served from it (ADR-054).
import '@fontsource-variable/inter/wght.css';
import '@fontsource-variable/inter/wght-italic.css';
import './ui/theme/global.css';

// The appearance copied in this browser, before the first render, so a dark theme never opens
// light; the settings confirm it once they load (ADR-055).
applyAppearance(readStoredAppearance());

// Before anything reads the database: another tab's upgrade, or a newer database, stops this tab.
void watchDatabaseVersion(db, DATABASE_VERSION);

// Text typed just before the tab last closed; the lines on screen follow once it is saved.
restoreUnsavedLines(appContext).catch((error: unknown) => console.error('Não foi possível recuperar o texto não salvo:', error));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallback={(error) => <AppError error={error} />}>
      <DatabaseVersionGate>
        <PeopleProvider>
          <App />
        </PeopleProvider>
      </DatabaseVersionGate>
    </ErrorBoundary>
  </StrictMode>,
);

registerServiceWorker();
