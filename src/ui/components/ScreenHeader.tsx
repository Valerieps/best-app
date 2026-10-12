import type { ReactNode } from 'react';
import { Dropdown, DropdownItem } from './Dropdown';

export interface ScreenAction {
  label: string;
  onSelect(): void;
}

interface Props {
  title: ReactNode;
  /** At most one main action, shown as the dark button. */
  primary?: ScreenAction;
  /** The other actions of the screen, in the "⋯" list. */
  more?: ScreenAction[];
  /** Small link above the title, e.g. "← Projetos". */
  back?: ScreenAction;
  /** A second row for tools that belong to the screen, like the wiki search. */
  children?: ReactNode;
}

/**
 * Level 2 of the navigation (spec/navegacao.md, "Navegação"): the screen's own title and actions,
 * always in the same place right below the global bar.
 */
export function ScreenHeader({ title, primary, more = [], back, children }: Props) {
  return (
    <header className="screen-header">
      {back && (
        <button type="button" className="link screen-header__back" onClick={back.onSelect}>
          ← {back.label}
        </button>
      )}
      <div className="screen-header__row">
        <div className="screen-header__title">{title}</div>
        <div className="screen-header__actions">
          {primary && (
            <button type="button" className="primary" onClick={primary.onSelect}>
              {primary.label}
            </button>
          )}
          {more.length > 0 && (
            <Dropdown trigger="⋯" label="Mais ações desta tela" className="screen-header__more" triggerClassName="tertiary">
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
