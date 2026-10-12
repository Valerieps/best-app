import { loadCleanup, loadDueMonthlyReflection, loadDueReflection } from '../application/queries';
import type { DayKey } from '../domain/day';
import { BackupIndicator } from './backup/BackupIndicator';
import type { BackupActions } from './backup/useBackup';
import type { AutoBackupState } from '../infrastructure/autoBackup';
import { Dropdown, DropdownItem } from './components/Dropdown';
import { weekdayName, formatShortDate } from './format';
import { navigate } from './hooks';
import { reader } from './services';
import { useLiveQuery } from './useLiveQuery';

interface Props {
  today: DayKey;
  pendingDays: DayKey[];
  onToday: boolean;
  onOpenMenu(): void;
  backupState: AutoBackupState;
  backup: BackupActions;
}

function Badge({ count }: { count: number }) {
  return count > 0 ? <span className="badge">{count}</span> : null;
}

/**
 * Level 1 of the navigation (SPEC.md, "Navegação"): the same bar on every screen.
 * ☰ for places, "Hoje", "Rituais" with what is due, and the backup status.
 */
export function GlobalBar({ today, pendingDays, onToday, onOpenMenu, backupState, backup }: Props) {
  const dueWeek = useLiveQuery(() => loadDueReflection(reader, new Date()), [today]) ?? null;
  const dueMonth = useLiveQuery(() => loadDueMonthlyReflection(reader, today), [today]) ?? null;
  const cleanup = useLiveQuery(() => loadCleanup(reader));
  const cleanupCount = cleanup ? cleanup.whiteboards.length + cleanup.duplicates.length : 0;
  const dueCount = pendingDays.length + (dueWeek ? 1 : 0) + (dueMonth ? 1 : 0);

  return (
    <header className="global-bar">
      <button type="button" className="icon-button" onClick={onOpenMenu} aria-label="Abrir menu">
        ☰
      </button>
      <span className="global-bar__name">Best App</span>
      <span className="global-bar__spacer" />
      <button
        type="button"
        className="tertiary"
        aria-current={onToday ? 'page' : undefined}
        onClick={() => navigate({ name: 'day' })}
      >
        Hoje
      </button>
      <Dropdown
        label="Rituais"
        className="global-bar__rituals"
        triggerClassName="tertiary"
        trigger={
          <>
            Rituais <Badge count={dueCount} />
          </>
        }
      >
        {(close) => {
          const go = (action: () => void) => () => {
            close();
            action();
          };
          return (
            <>
              <DropdownItem onSelect={go(() => navigate({ name: 'checkout', day: today }))}>Checkout de hoje</DropdownItem>
              {pendingDays.map((day) => (
                <DropdownItem
                  key={day}
                  onSelect={go(() => navigate({ name: 'checkout', day }))}
                  badge={<span className="badge badge--warning">pendente</span>}
                >
                  Checkout de {weekdayName(day)}, {formatShortDate(day)}
                </DropdownItem>
              ))}
              <hr className="dropdown__divider" />
              <DropdownItem
                onSelect={go(() => navigate({ name: 'reflection', week: dueWeek?.key }))}
                badge={dueWeek ? <span className="badge">disponível</span> : undefined}
              >
                Reflexão semanal
              </DropdownItem>
              <DropdownItem
                onSelect={go(() => navigate({ name: 'monthReflection', month: dueMonth?.key }))}
                badge={dueMonth ? <span className="badge">disponível</span> : undefined}
              >
                Reflexão mensal
              </DropdownItem>
              <DropdownItem onSelect={go(() => navigate({ name: 'cleanup' }))} badge={<Badge count={cleanupCount} />}>
                Colocar ordem na casa
              </DropdownItem>
            </>
          );
        }}
      </Dropdown>
      <BackupIndicator state={backupState} actions={backup} />
    </header>
  );
}
