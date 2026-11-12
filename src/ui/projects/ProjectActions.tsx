import { useState } from 'react';
import { linkProjectToObjective } from '../../application/objectives';
import { addFocusProject, removeFocusProject } from '../../application/focusProjects';
import type { ProjectActions } from '../../application/queries';
import { deleteProject, setProjectFinished } from '../../application/projects';
import type { Objective, Project } from '../../domain/entities';
import { Dropdown, DropdownItem } from '../components/Dropdown';
import { Icon } from '../components/Icon';
import { navigate } from '../hooks';
import { appContext } from '../services';
import { FEATURES } from '../features';
import { write } from '../writeQueue';


interface Props {
  project: Project;
  objectives: readonly Objective[];
  /** What the focus allows: put in focus or take out. */
  focus: ProjectActions;
  /** Called once the project is deleted, e.g. to leave its page. */
  onDeleted?: () => void;
}

/**
 * The "⋯" of a project, the same in the list and on its page (spec/projetos.md, "Projetos"): link an
 * objective, put in focus, take out of
 * focus, finish or reopen, delete.
 */
export function ProjectActionsMenu({ project, objectives, focus, onDeleted }: Props) {
  const [choosing, setChoosing] = useState<'objective' | 'delete' | null>(null);
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
        if (choosing === 'delete') {
          return (
            <>
              <p className="dropdown__empty muted">Apaga o projeto e o histórico dele. Não dá para desfazer.</p>
              <DropdownItem onSelect={() => run(async () => {
                  await deleteProject(appContext, project.id);
                  onDeleted?.();
                })}>Apagar de vez</DropdownItem>
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
            {focus.isPriority && (
              <DropdownItem onSelect={() => run(() => removeFocusProject(appContext, project.id))}>Tirar do foco</DropdownItem>
            )}
            <DropdownItem onSelect={() => run(() => setProjectFinished(appContext, project.id, !finished))}>
              {finished ? 'Reabrir projeto' : 'Finalizar projeto'}
            </DropdownItem>
            <DropdownItem onSelect={() => setChoosing('delete')}>Apagar projeto…</DropdownItem>
          </>
        );
      }}
    </Dropdown>
  );
}
