import { useState } from 'react';
import { linkProjectToObjective } from '../../application/objectives';
import { addFocusProject, removeFocusProject, swapFocusProject } from '../../application/focusProjects';
import type { ProjectActions } from '../../application/queries';
import { setProjectFinished } from '../../application/projects';
import type { Objective, Project } from '../../domain/entities';
import { Dropdown, DropdownItem } from '../components/Dropdown';
import { Icon } from '../components/Icon';
import { navigate } from '../hooks';
import { appContext } from '../services';
import { FEATURES } from '../features';
import { enqueue } from '../writeQueue';

function write(work: () => Promise<unknown>) {
  enqueue(work).catch(() => {
    // Logged by the queue; the screen shows the saved state again on its own.
  });
}

interface Props {
  project: Project;
  objectives: readonly Objective[];
  /** What the focus allows: put in focus, swap with a project in focus, or take out. */
  focus: ProjectActions;
}

/**
 * The "⋯" of a project, the same in the list and on its page (spec/projetos.md, "Projetos"): link an
 * objective, put in focus (taking a free slot or the place of a project in focus), take out of
 * focus, finish or reopen.
 */
export function ProjectActionsMenu({ project, objectives, focus }: Props) {
  const [choosing, setChoosing] = useState<'objective' | 'swap' | null>(null);
  const current = objectives.find((objective) => objective.id === project.objectiveId) ?? null;
  const choices = objectives.filter((objective) => objective.status === 'active' && objective.id !== current?.id);
  const finished = project.status === 'finished';

  return (
    <Dropdown
      trigger={<Icon name="dots" />}
      label={`Mais ações de ${project.name}`}
      triggerClassName="tertiary project-actions"
      onClose={() => setChoosing(null)}
    >
      {(close) => {
        const run = (work: () => Promise<unknown>) => {
          close();
          write(work);
        };
        if (choosing === 'swap') {
          return (
            <>
              {focus.swapTargets.map((target) => (
                <DropdownItem key={target.id} onSelect={() => run(() => swapFocusProject(appContext, target.id, project.id))}>
                  No lugar de {target.name}
                </DropdownItem>
              ))}
              <DropdownItem onSelect={() => setChoosing(null)}>Voltar</DropdownItem>
            </>
          );
        }
        if (choosing === 'objective') {
          return (
            <>
              {choices.map((objective) => (
                <DropdownItem key={objective.id} onSelect={() => run(() => linkProjectToObjective(appContext, project.id, objective.id))}>
                  {objective.goal}
                </DropdownItem>
              ))}
              {choices.length === 0 && (
                <DropdownItem
                  onSelect={() => {
                    close();
                    navigate({ name: 'objectives' });
                  }}
                >
                  Nenhum objetivo ativo. Abrir Objetivos
                </DropdownItem>
              )}
              {current && (
                <DropdownItem onSelect={() => run(() => linkProjectToObjective(appContext, project.id, null))}>Tirar o vínculo</DropdownItem>
              )}
              <DropdownItem onSelect={() => setChoosing(null)}>Voltar</DropdownItem>
            </>
          );
        }
        return (
          <>
            {FEATURES.objectives && (
              <DropdownItem onSelect={() => setChoosing('objective')}>{current ? 'Trocar o objetivo' : 'Vincular a um objetivo'}</DropdownItem>
            )}
            {focus.canAddToPriorities && (
              <DropdownItem onSelect={() => run(() => addFocusProject(appContext, project.id))}>Colocar em foco</DropdownItem>
            )}
            {focus.swapTargets.length > 0 && (
              <DropdownItem onSelect={() => setChoosing('swap')}>Colocar em foco no lugar de…</DropdownItem>
            )}
            {focus.isPriority && (
              <DropdownItem onSelect={() => run(() => removeFocusProject(appContext, project.id))}>Tirar do foco</DropdownItem>
            )}
            <DropdownItem onSelect={() => run(() => setProjectFinished(appContext, project.id, !finished))}>
              {finished ? 'Reabrir projeto' : 'Finalizar projeto'}
            </DropdownItem>
          </>
        );
      }}
    </Dropdown>
  );
}
