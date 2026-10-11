import { describe, expect, it } from 'vitest';
import { formatLongDate, listDays, pendingDaysSentence, postponedLabel, relativeDay } from './format';

const today = '2026-10-11'; // a Sunday

describe('format', () => {
  it('writes the day note date', () => {
    expect(formatLongDate(today)).toBe('Domingo, 11 de outubro');
  });

  it('names days relative to today', () => {
    expect(relativeDay('2026-10-11', today)).toBe('hoje');
    expect(relativeDay('2026-10-12', today)).toBe('amanhã');
    expect(relativeDay('2026-10-10', today)).toBe('ontem');
    expect(relativeDay('2026-10-14', today)).toBe('14/10');
  });

  it('describes pending days like the draft', () => {
    expect(pendingDaysSentence(['2026-10-10'], today)).toBe('Ontem está com checkout pendente');
    expect(pendingDaysSentence(['2026-10-09', '2026-10-10'], today)).toBe('Sexta e ontem estão com checkout pendente');
    expect(pendingDaysSentence(['2026-10-08', '2026-10-09'], today)).toBe('Quinta e sexta estão com checkout pendente');
    expect(pendingDaysSentence(['2026-10-01', '2026-10-08', '2026-10-09'], today)).toBe(
      '3 dias estão com checkout pendente',
    );
    expect(listDays(['2026-10-08', '2026-10-09', '2026-10-10'], today)).toBe('Quinta, sexta e ontem');
  });

  it('labels postponements', () => {
    expect(postponedLabel(0)).toBeNull();
    expect(postponedLabel(1)).toBe('adiada 1 vez');
    expect(postponedLabel(4)).toBe('adiada 4 vezes');
  });
});
