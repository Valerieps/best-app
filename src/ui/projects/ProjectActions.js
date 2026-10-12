import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { linkProjectToObjective } from '../../application/objectives';
import { addPriorityProject } from '../../application/priorityProjects';
import { setProjectFinished } from '../../application/projects';
import { Dropdown, DropdownItem } from '../components/Dropdown';
import { Icon } from '../components/Icon';
import { navigate } from '../hooks';
import { appContext } from '../services';
import { enqueue } from '../writeQueue';
function write(work) {
    enqueue(work).catch(() => {
        // Logged by the queue; the screen shows the saved state again on its own.
    });
}
/**
 * The "⋯" of a project, the same in the list and on its page (SPEC.md, "Projetos"): link an
 * objective, add to the week's priorities while there is a free slot, finish or reopen.
 */
export function ProjectActionsMenu({ project, objectives, canAddToPriorities }) {
    const [choosing, setChoosing] = useState(false);
    const current = objectives.find((objective) => objective.id === project.objectiveId) ?? null;
    const choices = objectives.filter((objective) => objective.status === 'active' && objective.id !== current?.id);
    const finished = project.status === 'finished';
    return (_jsx(Dropdown, { trigger: _jsx(Icon, { name: "dots" }), label: `Mais ações de ${project.name}`, triggerClassName: "tertiary project-actions", onClose: () => setChoosing(false), children: (close) => {
            const run = (work) => {
                close();
                write(work);
            };
            if (choosing) {
                return (_jsxs(_Fragment, { children: [choices.map((objective) => (_jsx(DropdownItem, { onSelect: () => run(() => linkProjectToObjective(appContext, project.id, objective.id)), children: objective.goal }, objective.id))), choices.length === 0 && (_jsx(DropdownItem, { onSelect: () => {
                                close();
                                navigate({ name: 'objectives' });
                            }, children: "Nenhum objetivo ativo. Abrir Objetivos" })), current && (_jsx(DropdownItem, { onSelect: () => run(() => linkProjectToObjective(appContext, project.id, null)), children: "Tirar o v\u00EDnculo" })), _jsx(DropdownItem, { onSelect: () => setChoosing(false), children: "Voltar" })] }));
            }
            return (_jsxs(_Fragment, { children: [_jsx(DropdownItem, { onSelect: () => setChoosing(true), children: current ? 'Trocar o objetivo' : 'Vincular a um objetivo' }), canAddToPriorities && (_jsx(DropdownItem, { onSelect: () => run(() => addPriorityProject(appContext, project.id)), children: "Adicionar aos priorit\u00E1rios da semana" })), _jsx(DropdownItem, { onSelect: () => run(() => setProjectFinished(appContext, project.id, !finished)), children: finished ? 'Reabrir projeto' : 'Finalizar projeto' })] }));
        } }));
}
