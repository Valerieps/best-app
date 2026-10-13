import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerServiceWorker } from './infrastructure/browser';
import { App } from './ui/App';
import { ErrorBoundary } from './ui/components/ErrorBoundary';
import { AppError } from './ui/components/ErrorScreens';
import './ui/theme/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallback={(error) => <AppError error={error} />}>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

registerServiceWorker();
