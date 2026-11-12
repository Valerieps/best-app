import { describe, expect, it } from 'vitest';
import {
  agendaDate,
  formatLongDate,
  linkDomain,
  listDays,
  monthName,
  pendingDaysSentence,
  postponedLabel,
  relativeDay,
  boardDayLabel,
} from './format';

const today = '2026-10-11'; // a Sunday

describe('format', () => {
  it('writes the day note date', () => {
    expect(formatLongDate(today)).toBe('Domingo, 11 de outubro');
  });

  it('names the columns of a board with the weekday and the day of the month', () => {
    expect(boardDayLabel('2026-10-11', today)).toBe('Hoje · dom 11');
    expect(boardDayLabel('2026-10-12', today)).toBe('Amanhã · seg 12');
    expect(boardDayLabel('2026-10-14', today)).toBe('Qua 14');
  });

  it('names days relative to today', () => {
    expect(relativeDay('2026-10-11', today)).toBe('hoje');
    expect(relativeDay('2026-10-12', today)).toBe('amanhã');
    expect(relativeDay('2026-10-10', today)).toBe('ontem');
    expect(relativeDay('2026-10-14', today)).toBe('14/10');
  });

  it('describes the days left to close, without urgency', () => {
    expect(pendingDaysSentence(['2026-10-10'], today)).toBe('Falta fechar ontem');
    expect(pendingDaysSentence(['2026-10-09', '2026-10-10'], today)).toBe('Falta fechar sexta e ontem');
    expect(pendingDaysSentence(['2026-10-08', '2026-10-09'], today)).toBe('Falta fechar quinta e sexta');
    expect(pendingDaysSentence(['2026-10-01', '2026-10-08', '2026-10-09'], today)).toBe('Faltam fechar 3 dias');
    expect(listDays(['2026-10-08', '2026-10-09', '2026-10-10'], today)).toBe('Quinta, sexta e ontem');
  });

  it('reads the domain of a link without fetching anything', () => {
    expect(linkDomain('https://www.drive.google.com/file/d/1')).toBe('drive.google.com');
    expect(linkDomain(' http://intranet/wiki ')).toBe('intranet');
    expect(linkDomain('go/plano')).toBe('go/plano');
    expect(monthName('2026-10-11')).toBe('outubro');
  });

  it('labels postponements', () => {
    expect(postponedLabel(0)).toBeNull();
    expect(postponedLabel(1)).toBe('adiada 1 vez');
    expect(postponedLabel(4)).toBe('adiada 4 vezes');
  });

  it('writes the date block of the agenda', () => {
    expect(agendaDate('2026-10-11', today)).toEqual({ top: 'hoje', bottom: '11' });
    expect(agendaDate('2026-10-12', today)).toEqual({ top: 'amanhã', bottom: '12' });
    expect(agendaDate('2026-10-15', today)).toEqual({ top: 'qui', bottom: '15' });
    expect(agendaDate('2026-11-03', today)).toEqual({ top: 'nov', bottom: '3' });
  });
});
