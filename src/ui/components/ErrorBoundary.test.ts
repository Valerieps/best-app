import { describe, expect, it } from 'vitest';
import { ErrorBoundary, errorMessage } from './ErrorBoundary';

describe('ErrorBoundary', () => {
  it('switches to the fallback with the error that was thrown', () => {
    const error = new Error('boom');
    expect(ErrorBoundary.getDerivedStateFromError(error)).toEqual({ error, failed: true });
  });

  it('switches to the fallback even when the thrown value is not an Error', () => {
    expect(ErrorBoundary.getDerivedStateFromError(undefined)).toEqual({ error: undefined, failed: true });
  });
});

describe('errorMessage', () => {
  it('names the error and its message', () => {
    expect(errorMessage(new TypeError('x is undefined'))).toBe('TypeError: x is undefined');
  });

  it('keeps a thrown string and has a fallback for anything else', () => {
    expect(errorMessage('quebrou')).toBe('quebrou');
    expect(errorMessage({ code: 1 })).toBe('Erro desconhecido');
  });
});
