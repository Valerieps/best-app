import { useCallback, useEffect, useState } from 'react';
import { requestPersistentStorage } from '../infrastructure/browser';
import { BackupBanner } from './backup/BackupBanner';
import { BackupIndicator } from './backup/BackupIndicator';
import { BackupPanel } from './backup/BackupPanel';
import { ImportDialog } from './backup/ImportDialog';
import { useAutoBackupState, useBackup } from './backup/useBackup';
import { CheckoutScreen } from './checkout/CheckoutScreen';
import { DayNoteScreen } from './dayNote/DayNoteScreen';
import { formatLongDate } from './format';
import { navigate, useRoute, useToday } from './hooks';
import { ActiveTasksScreen, ArchivedTasksScreen } from './lists/ListScreens';
import { WikiScreen } from './lists/WikiScreen';
import { loadDayOpening, loadPendingDays } from '../application/queries';
import { DashboardScreen, StartDayScreen, WarmupScreen } from './opening/OpeningScreens';
import { useDueReminders, useReminderSignals } from './opening/Reminders';
import type { DayKey } from '../domain/day';
import { CleanupScreen } from './cleanup/CleanupScreen';
import { ProjectScreen, ProjectsScreen } from './projects/ProjectScreens';
import { ReflectionScreen } from './reflection/ReflectionScreen';
import { SettingsScreen } from './settings/SettingsScreen';
import { HabitsScreen } from './habits/HabitsScreen';
import { ObjectiveScreen, ObjectivesScreen } from './objectives/ObjectiveScreens';
import { MonthlyReflectionScreen } from './reflection/MonthlyReflectionScreen';
import { autoBackup, db, reader } from './services';
import { SideMenu } from './SideMenu';
import { useLiveQuery } from './useLiveQuery';

export function App() {
  const route = useRoute();
  const today = useToday();
  const backup = useBackup();
  const backupState = useAutoBackupState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [storagePersisted, setStoragePersisted] = useState<boolean | null>(null);
  const hasData = useLiveQuery(async () => (await db.events.count()) > 0) ?? false;
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    requestPersistentStorage().then(setStoragePersisted, () => setStoragePersisted(false));
    void autoBackup.init();
    // Try to save right away when the tab is hidden or closed.
    const onHide = () => {
      if (document.visibilityState === 'hidden') void autoBackup.flush();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);

  const inCheckout = route.name === 'checkout';
  // The day note pages only through days that still have pending items (1b).
  const shownDay = route.name === 'day' && route.day && route.day < today ? route.day : today;
  const pendingDays = useLiveQuery(() => loadPendingDays(reader, today), [today]) ?? [];
  const previousDay = [...pendingDays].reverse().find((day) => day < shownDay) ?? null;
  const nextDay = pendingDays.find((day) => day > shownDay) ?? (shownDay < today ? today : null);
  const goToDay = (day: DayKey) => navigate(day === today ? { name: 'day' } : { name: 'day', day });
  // Section 3: with a warm-up checklist, today opens on "Iniciar Dia", warm up and dashboard.
  const opening = useLiveQuery(() => loadDayOpening(reader, today), [today]);
  const onToday = route.name === 'day' && shownDay === today;
  const stage = onToday ? (opening?.stage ?? null) : 'execution';
  const dueReminders = useDueReminders();
  useReminderSignals(dueReminders.length);

  if (onToday && stage === null) return null;
  if (onToday && stage === 'start') return <StartDayScreen today={today} />;

  return (
    <>
      {!inCheckout && (
        <header className="topbar">
          <button type="button" className="icon-button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">
            ☰
          </button>
          <span className="topbar__date">
            {route.name === 'day' && (
              <button
                type="button"
                className="icon-button topbar__arrow"
                disabled={!previousDay}
                onClick={() => previousDay && goToDay(previousDay)}
                aria-label="Dia pendente anterior"
              >
                ‹
              </button>
            )}
            {formatLongDate(route.name === 'day' ? shownDay : today)}
            {route.name === 'day' && (
              <button
                type="button"
                className="icon-button topbar__arrow"
                disabled={!nextDay}
                onClick={() => nextDay && goToDay(nextDay)}
                aria-label="Próximo dia pendente"
              >
                ›
              </button>
            )}
          </span>
          <div className="topbar__actions">
            <BackupIndicator state={backupState} actions={backup} />
            <button
              type="button"
              onClick={() => navigate({ name: 'checkout', day: route.name === 'day' ? shownDay : today })}
            >
              Fazer checkout
            </button>
          </div>
        </header>
      )}

      <BackupBanner state={backupState} hasData={hasData} actions={backup} />
      <SideMenu open={menuOpen} current={route.name} onClose={closeMenu} />

      {route.name === 'day' && stage === 'warmup' && opening && <WarmupScreen view={opening} />}
      {route.name === 'day' && stage === 'dashboard' && opening && <DashboardScreen view={opening} today={today} />}
      {route.name === 'day' && stage === 'execution' && (
        <DayNoteScreen key={shownDay} day={shownDay} today={today} reminders={dueReminders} />
      )}
      {route.name === 'checkout' && <CheckoutScreen key={route.day} day={route.day} today={today} />}
      {route.name === 'active' && <ActiveTasksScreen today={today} />}
      {route.name === 'archived' && <ArchivedTasksScreen today={today} />}
      {route.name === 'wiki' && <WikiScreen focus={route.section} />}
      {route.name === 'cleanup' && <CleanupScreen today={today} />}
      {route.name === 'reflection' && <ReflectionScreen weekKey={route.week} today={today} />}
      {route.name === 'projects' && <ProjectsScreen />}
      {route.name === 'project' && <ProjectScreen id={route.id} today={today} />}
      {route.name === 'settings' && <SettingsScreen />}
      {route.name === 'objectives' && <ObjectivesScreen />}
      {route.name === 'objective' && <ObjectiveScreen id={route.id} />}
      {route.name === 'habits' && <HabitsScreen today={today} />}
      {route.name === 'monthReflection' && <MonthlyReflectionScreen month={route.month} today={today} />}
      {route.name === 'data' && (
        <main className="page">
          <BackupPanel state={backupState} actions={backup} storagePersisted={storagePersisted} />
        </main>
      )}

      {backup.pendingImport && (
        <ImportDialog
          backup={backup.pendingImport.backup}
          loss={backup.pendingImport.loss}
          onConfirm={backup.confirmImport}
          onCancel={backup.cancelImport}
        />
      )}
    </>
  );
}
