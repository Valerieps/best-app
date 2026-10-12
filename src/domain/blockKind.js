const TASK_MARKER = /^\[\]\s/;
export const taskDetector = {
    kind: 'task',
    match: (text) => (TASK_MARKER.test(text) ? text.replace(TASK_MARKER, '') : null),
};
export const KIND_DETECTORS = [taskDetector];
export function detectKind(text) {
    for (const detector of KIND_DETECTORS) {
        const stripped = detector.match(text);
        if (stripped !== null)
            return { kind: detector.kind, text: stripped };
    }
    return { kind: 'note', text };
}
