import { describe, expect, it } from 'vitest';
import { section, task } from '../test/builders';
import { buildDayPriorities, demote, promote } from './priorities';
const s = section();
const a = task(s.id, 'A');
const b = task(s.id, 'B');
const c = task(s.id, 'C');
const d = task(s.id, 'D');
const e = task(s.id, 'E');
describe('buildDayPriorities', () => {
    it('keeps the chosen order and leaves finished tasks out', () => {
        const done = { ...b, status: 'done' };
        const result = buildDayPriorities([a.id, b.id, c.id], [a, done, c], []);
        expect(result.map((p) => p.task.text)).toEqual(['A', 'C']);
    });
    it('can be empty once every priority is done', () => {
        expect(buildDayPriorities([a.id], [{ ...a, status: 'done' }], [])).toEqual([]);
    });
    it('adds deadline tasks automatically while there is room', () => {
        const result = buildDayPriorities([a.id], [a], [d]);
        expect(result).toEqual([
            { task: a, automatic: false },
            { task: d, automatic: true },
        ]);
    });
    it('a deadline task takes the place of the third priority instead of making a fourth', () => {
        const result = buildDayPriorities([a.id, b.id, c.id], [a, b, c], [d]);
        expect(result.map((p) => p.task.text)).toEqual(['A', 'B', 'D']);
    });
    it('a second deadline task replaces the next chosen one, never another deadline task', () => {
        const result = buildDayPriorities([a.id, b.id, c.id], [a, b, c], [d, e]);
        expect(result.map((p) => [p.task.text, p.automatic])).toEqual([
            ['A', false],
            ['E', true],
            ['D', true],
        ]);
    });
    it('does not repeat a chosen task that also has its deadline today', () => {
        expect(buildDayPriorities([a.id], [a], [a])).toEqual([{ task: a, automatic: false }]);
    });
});
describe('promote and demote', () => {
    const open = () => true;
    it('adds to the end', () => {
        expect(promote([a.id], b.id, open)).toEqual([a.id, b.id]);
    });
    it('never makes a fourth priority: the new one takes the place of the third', () => {
        expect(promote([a.id, b.id, c.id], d.id, open)).toEqual([a.id, b.id, d.id]);
    });
    it('frees the place of finished priorities first', () => {
        expect(promote([a.id, b.id, c.id], d.id, (id) => id !== a.id)).toEqual([b.id, c.id, d.id]);
    });
    it('removes a priority', () => {
        expect(demote([a.id, b.id], a.id)).toEqual([b.id]);
    });
});
