import { describe, expect, it } from 'vitest';
import { activityDetail, agendaDate, formatLongDate, linkDomain, listDays, monthName, pendingDaysSentence, postponedLabel, projectListSummary, relativeDay, stuckReasonLabel, } from './format';
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
        expect(pendingDaysSentence(['2026-10-01', '2026-10-08', '2026-10-09'], today)).toBe('3 dias estão com checkout pendente');
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
    it('details a day of the activity map', () => {
        expect(activityDetail('2026-10-07', { notes: 1, sections: 0, tasksCreated: 0, tasksFinished: 2 })).toBe('07/10 · 1 nota, 2 tarefas finalizadas');
        expect(activityDetail('2026-10-07', { notes: 0, sections: 1, tasksCreated: 1, tasksFinished: 0 })).toBe('07/10 · 1 seção aberta, 1 tarefa criada');
        expect(activityDetail('2026-10-07', { notes: 0, sections: 0, tasksCreated: 0, tasksFinished: 0 })).toBe('07/10 · nada');
    });
    it('sums up the project list', () => {
        expect(projectListSummary({ active: 4, stalled: 1, stuck: 3 })).toBe('4 ativos · 1 parado · 3 travadas');
        expect(projectListSummary({ active: 1, stalled: 0, stuck: 1 })).toBe('1 ativo · 1 travada');
        expect(projectListSummary({ active: 0, stalled: 0, stuck: 0 })).toBe('0 ativos');
    });
    it('spells out why a task is stuck', () => {
        expect(stuckReasonLabel({ postponed: 3, since: '2026-09-18', overdueOn: null })).toBe('adiada 3 vezes · desde 18/09');
        expect(stuckReasonLabel({ postponed: null, since: null, overdueOn: '2026-10-09' })).toBe('venceu em 09/10');
        expect(stuckReasonLabel({ postponed: 4, since: '2026-09-18', overdueOn: '2026-10-09' })).toBe('venceu em 09/10 · adiada 4 vezes · desde 18/09');
    });
    it('writes the date block of the agenda', () => {
        expect(agendaDate('2026-10-11', today)).toEqual({ top: 'hoje', bottom: '11' });
        expect(agendaDate('2026-10-12', today)).toEqual({ top: 'amanhã', bottom: '12' });
        expect(agendaDate('2026-10-15', today)).toEqual({ top: 'qui', bottom: '15' });
        expect(agendaDate('2026-11-03', today)).toEqual({ top: 'nov', bottom: '3' });
    });
});
