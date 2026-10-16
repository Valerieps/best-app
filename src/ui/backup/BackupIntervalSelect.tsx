import { DEFAULT_AUTO_BACKUP_INTERVAL } from '../../application/autoBackup';
import { setAutoBackupInterval } from '../../application/settings';
import type { AutoBackupInterval } from '../../domain/entities';
import { appContext, reader } from '../services';
import { useLiveQueryState } from '../useLiveQuery';

const LABELS: Record<AutoBackupInterval, string> = {
  afterChange: 'A cada mudança',
  quarterHour: 'A cada 15 minutos',
  hour: 'A cada hora',
};

/** The interval chosen in the settings, or the default before any choice. */
export function useAutoBackupInterval(): AutoBackupInterval {
  return useLiveQueryState(async () => (await reader.settings())?.autoBackupInterval ?? null).value ?? DEFAULT_AUTO_BACKUP_INTERVAL;
}

/** How often the automatic backup writes, shown on the first-use screen and in "Dados e backup". */
export function BackupIntervalSelect() {
  const interval = useAutoBackupInterval();
  return (
    <label className="backup-interval">
      <span>Salvar o backup</span>
      <select
        className="text-input"
        value={interval}
        onChange={(event) => void setAutoBackupInterval(appContext, event.target.value as AutoBackupInterval)}
      >
        {(Object.keys(LABELS) as AutoBackupInterval[]).map((value) => (
          <option key={value} value={value}>
            {LABELS[value]}
          </option>
        ))}
      </select>
    </label>
  );
}
