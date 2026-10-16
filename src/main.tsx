import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerServiceWorker } from './infrastructure/browser';
import { App } from './ui/App';
import { ErrorBoundary } from './ui/components/ErrorBoundary';
import { AppError } from './ui/components/ErrorScreens';
import { PeopleProvider } from './ui/people/PeopleContext';
import { appContext } from './ui/services';
import { restoreUnsavedLines } from './ui/unsavedLines';
// Inter, bundled with the app and served from it (ADR-054).
import '@fontsource-variable/inter/wght.css';
import '@fontsource-variable/inter/wght-italic.css';
import './ui/theme/global.css';

// Text typed just before the tab last closed; the lines on screen follow once it is saved.
restoreUnsavedLines(appContext).catch((error: unknown) => console.error('Não foi possível recuperar o texto não salvo:', error));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallback={(error) => <AppError error={error} />}>
      <PeopleProvider>
        <App />
      </PeopleProvider>
    </ErrorBoundary>
  </StrictMode>,
);

registerServiceWorker();
