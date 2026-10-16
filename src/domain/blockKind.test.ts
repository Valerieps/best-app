import { describe, expect, it } from 'vitest';
import { detectKind } from './blockKind';

describe('detectKind', () => {
  it('turns a line starting with "[] " into a task and strips the marker', () => {
    expect(detectKind('[] Pagar o IPTU')).toEqual({ kind: 'task', text: 'Pagar o IPTU' });
    expect(detectKind('[] ')).toEqual({ kind: 'task', text: '' });
  });

  it('turns a line starting with "[a] " into a task someone owes me (spec/pessoas.md)', () => {
    expect(detectKind('[a] @Ana mandar o contrato')).toEqual({ kind: 'task', text: '@Ana mandar o contrato', waiting: true });
    expect(detectKind('[A] Contrato')).toEqual({ kind: 'task', text: 'Contrato', waiting: true });
    expect(detectKind('[a]sem espaço')).toEqual({ kind: 'note', text: '[a]sem espaço' });
  });

  it('keeps everything else as a note', () => {
    expect(detectKind('Ideia solta')).toEqual({ kind: 'note', text: 'Ideia solta' });
    expect(detectKind('[]sem espaço')).toEqual({ kind: 'note', text: '[]sem espaço' });
    expect(detectKind(' [] com espaço antes')).toEqual({ kind: 'note', text: ' [] com espaço antes' });
    expect(detectKind('texto com [] no meio')).toEqual({ kind: 'note', text: 'texto com [] no meio' });
  });
});
