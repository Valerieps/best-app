import { useState } from 'react';
import type { Project } from '../../domain/entities';
import type { ProjectFilter } from '../../domain/taskList';
import { Dropdown } from '../components/Dropdown';
import { Icon } from '../components/Icon';
import { COLUMN_LABELS, TASK_COLUMNS, activeFilterCount, toggleColumn, type TaskListView, type TaskShow } from './taskTableView';
import { cx } from '../classNames';

type FilterCategory = 'show' | 'project';

const CATEGORY_LABELS: Record<FilterCategory, string> = { show: 'Mostrar', project: 'Projeto' };

interface Option<V> {
  value: V;
  label: string;
}

function OptionList<V extends string | boolean>({ title, options, value, onPick }: { title: string; options: Option<V>[]; value: V; onPick(value: V): void }) {
  return (
    <div className="table-menu__options">
      <p className="table-menu__heading">{title}</p>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          role="menuitemradio"
          aria-checked={option.value === value}
          className="table-menu__option"
          onClick={() => onPick(option.value)}
        >
          <span className="table-menu__mark">{option.value === value && <Icon name="check" size="sm" />}</span>
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** "Filtros": the categories on the left, the options of the chosen one on the right. */
export function FiltersMenu({
  view,
  onChange,
  show,
  onShow,
  projects,
}: {
  view: TaskListView;
  onChange(view: TaskListView): void;
  show: TaskShow;
  onShow(show: TaskShow): void;
  projects: Project[];
}) {
  const [category, setCategory] = useState<FilterCategory>('show');
  const count = activeFilterCount(view, show);
  const projectOptions: Option<ProjectFilter>[] = [
    { value: 'all', label: 'Todos' },
    { value: 'focus', label: 'Só projetos em foco' },
    { value: 'none', label: 'Sem projeto' },
    ...projects.map((project) => ({ value: `project:${project.id}` as const, label: project.name })),
  ];
  return (
    <Dropdown
      label="Filtros"
      className="table-menu"
      triggerClassName={`small table-menu__trigger ${count ? 'table-menu__trigger--on' : ''}`}
      trigger={
        <>
          <Icon name="filter" size="sm" />
          Filtros
          {count > 0 && <span className="badge">{count}</span>}
        </>
      }
    >
      {() => (
        <div className="table-menu__panes">
          <div className="table-menu__categories">
            {(Object.keys(CATEGORY_LABELS) as FilterCategory[]).map((key) => (
              <button
                key={key}
                type="button"
                className={cx('table-menu__category', key === category && 'table-menu__category--on')}
                aria-pressed={key === category}
                onClick={() => setCategory(key)}
              >
                {CATEGORY_LABELS[key]}
                <Icon name="chevronRight" size="sm" />
              </button>
            ))}
            {count > 0 && (
              <button
                type="button"
                className="link table-menu__clear"
                onClick={() => {
                  onShow('open');
                  onChange({ ...view, project: 'all' });
                }}
              >
                Limpar filtros
              </button>
            )}
          </div>
          {category === 'show' && (
            <OptionList
              title="Mostrar"
              value={show}
              onPick={onShow}
              options={[
                { value: 'open', label: 'Não concluídas' },
                { value: 'done', label: 'Concluídas' },
                { value: 'all', label: 'Todas' },
              ]}
            />
          )}
          {category === 'project' && (
            <OptionList title="Projeto" value={view.project} onPick={(project) => onChange({ ...view, project })} options={projectOptions} />
          )}
        </div>
      )}
    </Dropdown>
  );
}

/** "Colunas": "Tarefa" is locked, the others are shown or hidden. */
export function ColumnsMenu({ view, onChange }: { view: TaskListView; onChange(view: TaskListView): void }) {
  return (
    <Dropdown
      label="Colunas"
      className="table-menu"
      triggerClassName="small table-menu__trigger"
      trigger={
        <>
          Colunas
          <Icon name="chevronDown" size="sm" />
        </>
      }
    >
      {() => (
        <div className="table-menu__options">
          <p className="table-menu__option table-menu__option--locked" title="Sempre visível">
            <span className="table-menu__mark">
              <Icon name="lock" size="sm" />
            </span>
            {COLUMN_LABELS.text}
          </p>
          <hr className="dropdown__divider" />
          {TASK_COLUMNS.map((column) => {
            const on = view.columns.includes(column);
            return (
              <button
                key={column}
                type="button"
                role="menuitemcheckbox"
                aria-checked={on}
                className="table-menu__option"
                onClick={() => onChange(toggleColumn(view, column))}
              >
                <span className="table-menu__mark">{on && <Icon name="check" size="sm" />}</span>
                {COLUMN_LABELS[column]}
              </button>
            );
          })}
        </div>
      )}
    </Dropdown>
  );
}
