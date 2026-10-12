import { describe, expect, it } from 'vitest';
import { project, section } from '../test/builders';
import { areSimilarNames, findDuplicateProjects, findWhiteboardGroups } from './assistants';
describe('whiteboards assistant', () => {
    const unlinked = (title, createdAt = '2026-10-01T09:00:00Z') => section({ title, whiteboardDecision: 'leftUnlinked', createdAt });
    it('groups unlinked sections by repeated title and suggests a project for repeats', () => {
        const groups = findWhiteboardGroups([unlinked('Mudança'), unlinked('mudança ', '2026-10-05T09:00:00Z'), unlinked('Leituras'), unlinked(null)], []);
        expect(groups.map((g) => [g.title, g.sections.length, g.suggestion.kind])).toEqual([
            ['mudança', 2, 'convert'],
            ['Leituras', 1, 'keep'],
        ]);
    });
    it('suggests linking when a project with that name exists', () => {
        const studio = project('Data Studios');
        const [group] = findWhiteboardGroups([unlinked('data studios')], [studio]);
        expect(group.suggestion).toEqual({ kind: 'link', projectId: studio.id });
    });
    it('ignores sections still pending, kept as they are, or linked', () => {
        expect(findWhiteboardGroups([
            section({ title: 'A', whiteboardDecision: 'pending' }),
            section({ title: 'B', whiteboardDecision: 'keptUnlinked' }),
            section({ title: 'C', whiteboardDecision: 'leftUnlinked', projectId: 'p' }),
        ], [])).toEqual([]);
    });
});
describe('duplicate projects assistant', () => {
    it('treats spacing, case, accents and one typo as the same name', () => {
        expect(areSimilarNames('Data Studios', 'DataStudios')).toBe(true);
        expect(areSimilarNames('Mudança', 'mudanca')).toBe(true);
        expect(areSimilarNames('Data Studios', 'Data Studio')).toBe(true);
        expect(areSimilarNames('Casa', 'Cama')).toBe(false);
        expect(areSimilarNames('Data Studios', 'Data Studio Pro')).toBe(false);
    });
    it('groups similar active projects and keeps the oldest', () => {
        const older = project('Data Studios', { createdAt: '2026-09-01T00:00:00Z' });
        const newer = project('DataStudios', { createdAt: '2026-10-01T00:00:00Z' });
        const other = project('Mudança');
        const [group, ...rest] = findDuplicateProjects([newer, other, older]);
        expect(rest).toEqual([]);
        expect(group.keep).toBe(older);
        expect(group.projects).toEqual([older, newer]);
    });
    it('respects "manter separados" and ignores finished projects', () => {
        const a = project('Data Studios');
        const b = project('DataStudios', { keepSeparateFrom: [a.id] });
        const c = project('Data-Studios', { status: 'finished' });
        expect(findDuplicateProjects([a, b, c])).toEqual([]);
    });
});
