import { useState } from 'react';
import { linkProjectToObjective } from '../../application/objectives';
import { addPriorityProject } from '../../application/priorityProjects';
import { setProjectFinished } from '../../application/projects';
import type { Objective, Project } from '../../domain/entities';
import { Dropdown, DropdownItem } from '../components/Dropdown';
import { Icon } from '../components/Icon';
import { navigate } from '../hooks';
import { appContext } from '../services';
import { enqueue } from '../writeQueue';

function write(work: () => Promise<unknown>) {
  enqueue(work).catch(() => {
    // Logged by the queue; the screen shows the saved state again on its own.
  });
}

interface Props {
  project: Project;
  objectives: readonly Objective[];
  /** Shown only while the week has a free slot; taking a project out happens in the reflection. */
  canAddToPriorities: boolean;
}

/**
 * The "⋯" of a project, the same in the list and on its page (spec/projetos.md, "Projetos"): link an
 * objective, add to the week's priorities while there is a free slot, finish or reopen.
 */
export function ProjectActionsMenu({ project, objectives, canAddToPriorities }: Props) {
  const [choosing, setChoosing] = useState(false);
  const current = objectives.find((objective) => objective.id === project.objectiveId) ?? null;
  const choices = objectives.filter((objective) => objective.status === 'active' && objective.id !== current?.id);
  const finished = project.status === 'finished';

  return (
    <Dropdown
      trigger={<Icon name="dots" />}
      label={`Mais ações de ${project.name}`}
      triggerClassName="tertiary project-actions"
      onClose={() => setChoosing(false)}
    >
      {(close) => {
        const run = (work: () => Promise<unknown>) => {
          close();
          write(work);
        };
        if (choosing) {
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
              <DropdownItem onSelect={() => setChoosing(false)}>Voltar</DropdownItem>
            </>
          );
        }
        return (
          <>
            <DropdownItem onSelect={() => setChoosing(true)}>{current ? 'Trocar o objetivo' : 'Vincular a um objetivo'}</DropdownItem>
            {canAddToPriorities && (
              <DropdownItem onSelect={() => run(() => addPriorityProject(appContext, project.id))}>Adicionar aos prioritários da semana</DropdownItem>
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
