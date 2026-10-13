import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  /** What to show instead of the children after an error; `retry` draws them again. */
  fallback(error: unknown, retry: () => void): ReactNode;
  children: ReactNode;
}

interface State {
  error: unknown;
  failed: boolean;
}

/**
 * Catches an error thrown while drawing its children, so one broken screen does not blank the
 * whole app. There is no server or telemetry: the error only goes to the console.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: undefined, failed: false };

  static getDerivedStateFromError(error: unknown): State {
    return { error, failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Erro ao desenhar a tela:', error, info.componentStack);
  }

  retry = () => this.setState({ error: undefined, failed: false });

  render() {
    return this.state.failed ? this.props.fallback(this.state.error, this.retry) : this.props.children;
  }
}

/** The error's message, for the technical details of a fallback. Shown as text, never as HTML. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return typeof error === 'string' ? error : 'Erro desconhecido';
}
