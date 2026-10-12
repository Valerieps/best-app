import { isProjectIcon, PROJECT_ICONS, projectInitial, type ProjectIcon as ProjectIconId } from '../../domain/projectPage';
import type { Project } from '../../domain/entities';
import { Dropdown } from '../components/Dropdown';
import { Icon } from '../components/Icon';

type Tone = 'lilac' | 'blue' | 'amber' | 'green' | 'pink';

/** Each icon has its own tint, taken from the existing section and feedback tokens. */
const ICONS: Record<ProjectIconId, { label: string; tone: Tone }> = {
  pot: { label: 'Panela', tone: 'lilac' },
  home: { label: 'Casa', tone: 'amber' },
  briefcase: { label: 'Maleta', tone: 'blue' },
  book: { label: 'Livro', tone: 'green' },
  heart: { label: 'Coração', tone: 'pink' },
  plane: { label: 'Viagem', tone: 'blue' },
  code: { label: 'Código', tone: 'lilac' },
  balloon: { label: 'Festa', tone: 'amber' },
  leaf: { label: 'Folha', tone: 'green' },
  music: { label: 'Música', tone: 'pink' },
  dumbbell: { label: 'Exercício', tone: 'blue' },
  camera: { label: 'Câmera', tone: 'amber' },
};

/** The project's icon on a tinted square, or its initial on the project lilac. */
export function ProjectIconBadge({ project, size = 'md' }: { project: Project; size?: 'sm' | 'md' | 'lg' }) {
  const icon = isProjectIcon(project.icon) ? project.icon : null;
  return (
    <span className={`project-icon project-icon--${size} tone--${icon ? ICONS[icon].tone : 'lilac'}`} aria-hidden="true">
      {icon ? <Icon name={icon} size={size === 'sm' ? 'sm' : 'lg'} /> : <span className="project-icon__initial">{projectInitial(project.name)}</span>}
    </span>
  );
}

/** The large icon of the project header; clicking it opens the collection. */
export function ProjectIconPicker({ project, onChange }: { project: Project; onChange(icon: string | null): void }) {
  return (
    <Dropdown
      label="Trocar o ícone do projeto"
      align="left"
      className="icon-picker"
      triggerClassName="icon-picker__trigger"
      trigger={<ProjectIconBadge project={project} size="lg" />}
    >
      {(close) => (
        <div className="icon-picker__panel">
          <span className="muted">Ícone do projeto</span>
          <div className="icon-picker__grid">
            {PROJECT_ICONS.map((id) => (
              <button
                key={id}
                type="button"
                role="menuitemradio"
                aria-checked={project.icon === id}
                aria-label={ICONS[id].label}
                title={ICONS[id].label}
                className={`icon-picker__option tone--${ICONS[id].tone} ${project.icon === id ? 'icon-picker__option--on' : ''}`}
                onClick={() => {
                  close();
                  onChange(id);
                }}
              >
                <Icon name={id} size="lg" />
              </button>
            ))}
          </div>
          {project.icon && (
            <button
              type="button"
              className="link"
              onClick={() => {
                close();
                onChange(null);
              }}
            >
              Usar a inicial do nome
            </button>
          )}
        </div>
      )}
    </Dropdown>
  );
}
