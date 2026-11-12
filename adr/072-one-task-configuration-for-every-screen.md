# ADR-072: One task configuration for every screen

**Status:** Accepted
**Date:** 2026-11-12
**Decision:** A task's behavior and look on screen live in `src/ui/tasks/`:
- `taskSurface.ts` is the single table of which hover actions each screen (surface) offers — day note, project page, idea page, task table, day priorities, person page and execution queue — plus the rules that hold everywhere: only open tasks have actions; a waiting task gets no priority, queue or deadline; "Projeto" only for a task without project when there is a project to pick. It also owns the labels (untitled text, dates in words, the checkbox's name).
- `TaskControls.tsx` holds the pieces every task line uses: `TaskCheckbox`, `PriorityStar`, `TaskDateChips` and `TaskActionButtons`, always in the same order.
- `taskCommands.ts` is the only place that turns an action into a write, always through the write queue (`write` in `writeQueue.ts`, which replaces seven local copies).

`BlockLine` takes a `surface` prop and no longer receives task callbacks (`onToggleDone`, `onSetDate`, `onSetDeadline`, `onTogglePriority`, `onAddToQueue`, `onSetWaiting`, `onAbandon`). The old `TaskRow`, used only by the queue, moved into the queue screen. `DatePicker` moved to `src/ui/components/`.
**Why:** The same task was drawn by five separate pieces of code (the editor line, the task table, the priorities block, the person page, the queue), each deciding its own actions, labels and write path. Adding or changing an action meant editing up to eight files, and they had drifted: the idea page showed a ☆ that did nothing, the table and the queue wrote outside the write queue, and the checkbox had four different labels. Now a change of behavior is one line in `SURFACE_ACTIONS`, tested in `taskSurface.test.ts`.
**Consequences:** The per-screen differences that remain are explicit in `SURFACE_ACTIONS`, each one a product rule from `spec/`. The execution queue keeps its own "Remover da fila", and its rows show no dates. The triage screens of "Fechar o dia" are not task lines and keep their own layout; they only share `taskText`.
