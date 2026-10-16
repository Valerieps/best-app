import type { ReactNode } from 'react';
import { Dropdown, DropdownItem } from './Dropdown';
import { Icon, type IconName } from './Icon';

export interface ScreenAction {
  label: string;
  onSelect(): void;
  /** Shown before the label, such as "plus" for "Novo projeto". */
  icon?: IconName;
}

interface Props {
  /** A string becomes the screen's h1; anything else must bring its own heading. */
  title: ReactNode;
  /** At most one main action, shown as the dark button. */
  primary?: ScreenAction;
  /** The other actions of the screen, in the "⋯" list. */
  more?: ScreenAction[];
  /** Where the arrow before the title goes, such as back to "Pessoas". */
  back?: ScreenAction;
  /** A second row for tools that belong to the screen, like a search field. */
  children?: ReactNode;
}

/** The arrow that takes a screen back to the one above it, before its title. */
export function BackButton({ action }: { action: ScreenAction }) {
  return (
    <button
      type="button"
      className="icon-button screen-header__back"
      onClick={action.onSelect}
      aria-label={`Voltar para ${action.label}`}
      title={`Voltar para ${action.label}`}
    >
      <Icon name="arrowLeft" />
    </button>
  );
}

/**
 * Level 2 of the navigation (spec/navegacao.md, "Navegação"): the screen's own title and actions,
 * always in the same place right below the global bar. No line above or below the title: the
 * title alone says where I am.
 */
export function ScreenHeader({ title, primary, more = [], back, children }: Props) {
  return (
    <header className="screen-header">
      <div className="screen-header__row">
        <div className="screen-header__title">
          {back && <BackButton action={back} />}
          {typeof title === 'string' ? <h1 className="screen-header__h1">{title}</h1> : title}
        </div>
        <div className="screen-header__actions">
          {primary && (
            <button type="button" className="primary" onClick={primary.onSelect}>
              {primary.icon && <Icon name={primary.icon} size="sm" />}
              {primary.label}
            </button>
          )}
          {more.length > 0 && (
            <Dropdown trigger={<Icon name="dots" />} label="Mais ações desta tela" className="screen-header__more" triggerClassName="tertiary">
              {(close) =>
                more.map((action) => (
                  <DropdownItem
                    key={action.label}
                    onSelect={() => {
                      close();
                      action.onSelect();
                    }}
                  >
                    {action.label}
                  </DropdownItem>
                ))
              }
            </Dropdown>
          )}
        </div>
      </div>
      {children && <div className="screen-header__tools">{children}</div>}
    </header>
  );
}
