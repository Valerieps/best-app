let counter = 0;
const nextId = (prefix) => `${prefix}-${++counter}`;
export function section(overrides = {}) {
    const day = overrides.day ?? '2026-10-11';
    return {
        id: nextId('s'),
        kind: 'general',
        day,
        createdAt: `${day}T09:00:00.000Z`,
        updatedAt: `${day}T09:00:00.000Z`,
        title: null,
        projectId: null,
        notesDestination: 'pending',
        whiteboardDecision: 'pending',
        ...overrides,
    };
}
export function note(sectionId, text = 'nota', overrides = {}) {
    return {
        id: nextId('n'),
        kind: 'note',
        text,
        sectionId,
        position: 'a',
        projectId: null,
        createdAt: '2026-10-11T09:00:00.000Z',
        updatedAt: '2026-10-11T09:00:00.000Z',
        status: null,
        intendedDate: null,
        firstIntendedDate: null,
        postponeCount: 0,
        closedAt: null,
        lastTriagedDay: null,
        ...overrides,
    };
}
export function task(sectionId, text = 'tarefa', overrides = {}) {
    return note(sectionId, text, { id: nextId('t'), kind: 'task', status: 'active', ...overrides });
}
export function project(name, overrides = {}) {
    return {
        id: nextId('p'),
        name,
        status: 'active',
        createdAt: '2026-10-01T09:00:00.000Z',
        updatedAt: '2026-10-01T09:00:00.000Z',
        finishedAt: null,
        ...overrides,
    };
}
