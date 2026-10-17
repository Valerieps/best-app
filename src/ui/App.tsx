import { useEffect, useState } from 'react';
import { loadDayOpening, loadPendingDays } from '../application/queries';
import { getLastBackupAt } from '../infrastructure/backupRepository';
import { requestPersistentStorage } from '../infrastructure/browser';
import { BackupBanner } from './backup/BackupBanner';
import { useAutoBackupInterval } from './backup/BackupIntervalSelect';
import { BackupPanel } from './backup/BackupPanel';
import { BackupSetupScreen } from './backup/BackupSetupScreen';
import { ImportDialog } from './backup/ImportDialog';
import { useAutoBackupState, useBackup } from './backup/useBackup';
import { CheckoutScreen } from './checkout/CheckoutScreen';
import { RitualsScreen } from './cleanup/RitualsScreen';
import { ScreenHeader } from './components/ScreenHeader';
import { DayNoteScreen } from './dayNote/DayNoteScreen';
import { HabitsScreen } from './habits/HabitsScreen';
import { navigate, routeHash, useRoute, useToday } from './hooks';
import { ActiveTasksScreen } from './lists/ListScreens';
import { ObjectiveScreen, ObjectivesScreen } from './objectives/ObjectiveScreens';
import { DashboardScreen, StartDayScreen, WarmupScreen } from './opening/OpeningScreens';
import { useDueReminders, useReminderSignals } from './opening/Reminders';
import { ProjectsScreen } from './projects/ProjectListScreen';
import { ProjectScreen } from './projects/ProjectScreens';
import { PeopleScreen, PersonScreen } from './people/PeopleScreens';
import { backupNoticeLevel, needsBackupSetup, pickTopNotice, useSnoozedNotices } from './notices';
import { autoBackup, db, reader } from './services';
import { SettingsScreen } from './settings/SettingsScreen';
import { Sidebar } from './Sidebar';
import { PlacePalette } from './components/PlacePalette';
import { useLiveQueryState } from './useLiveQuery';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ScreenError } from './components/ErrorScreens';
import { SaveErrorNotice } from './components/SaveErrorNotice';
import { reportSaveError } from './saveErrors';
import { enabledRoute } from './features';
import { applyAppearance, parseAppearance } from './theme/appearance';

export function App() {
  // Screens of features hidden until their spec is done open the day note (ui/features.ts).
  const route = enabledRoute(useRoute());
  const today = useToday();
  const backup = useBackup();
  const backupState = useAutoBackupState();
  const [storagePersisted, setStoragePersisted] = useState<boolean | null>(null);
  // The shell keeps working when one of its queries fails: the failure is logged, and the screen
  // below still has its own error boundary.
  const hasData = useLiveQueryState(async () => (await db.events.count()) > 0).value ?? false;
  const lastBackupAt = useLiveQueryState(() => getLastBackupAt(db)).value ?? null;

  useEffect(() => {
    requestPersistentStorage().then(setStoragePersisted, () => setStoragePersisted(false));
    void autoBackup.init();
    // Try to save right away when the tab is hidden or closed.
    const onHide = () => {
      if (document.visibilityState === 'hidden') autoBackup.onHidden();
    };
    document.addEventListener('visibilitychange', onHide);
    // A button whose save failed leaves its error unhandled: tell the user, besides the console.
    const onUnhandled = () => reportSaveError();
    window.addEventListener('unhandledrejection', onUnhandled);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('unhandledrejection', onUnhandled);
    };
  }, []);

  // The appearance saved in the settings wins over the copy applied before the first render,
  // including after importing a backup (ADR-055).
  const appearance = useLiveQueryState(async () => parseAppearance((await reader.settings())?.appearance)).value;
  useEffect(() => {
    if (appearance) applyAppearance(appearance);
  }, [appearance]);
  const backupInterval = useAutoBackupInterval();
  useEffect(() => autoBackup.setInterval(backupInterval), [backupInterval]);

  // Focus mode on a part of the day note survives reloading, and only the user leaves it: no
  // new day, opening screen or notice takes its place (spec/nota-do-dia.md, "Modo foco").
  const focusQuery = useLiveQueryState(async () => (await reader.settings())?.dayNoteFocus ?? null);
  const focus = route.name === 'day' ? (focusQuery.value ?? null) : null;
  // The day note pages only through days that still have pending items (1b).
  const routeDay = route.name === 'day' && route.day && route.day < today ? route.day : today;
  const shownDay = focus ? focus.day : routeDay;
  const pendingDays = useLiveQueryState(() => loadPendingDays(reader, today), [today]).value ?? [];
  // Section 3: with a warm-up checklist, today opens on "Iniciar Dia", warm up and dashboard.
  const openingQuery = useLiveQueryState(() => loadDayOpening(reader, today), [today]);
  const opening = openingQuery.value;
  const onToday = route.name === 'day' && shownDay === today;
  // If the day's stage cannot be read, the day note opens, instead of a blank screen.
  const stage = focus ? 'execution' : onToday && openingQuery.error === undefined ? (opening?.stage ?? null) : 'execution';
  const dueReminders = useDueReminders();
  useReminderSignals(dueReminders.length);
  // One warning at a time at the top; reminders that came back are not in this queue.
  const [snoozed, snooze] = useSnoozedNotices(today);
  const backupLevel = backupNoticeLevel(backupState, hasData, lastBackupAt, new Date());
  const notice = pickTopNotice({
    backup: backupLevel,
    pendingCheckout: onToday && stage === 'execution' && pendingDays.length > 0,
    onDataScreen: route.name === 'data',
    snoozed,
  });

  // Nothing opens before there is a backup folder (spec/principios.md, "Primeiro uso").
  if (backupState.status === 'loading') return null;
  if (needsBackupSetup(backupState)) return <BackupSetupScreen state={backupState} actions={backup} />;
  // Wait for the focus too, so a focused part never flashes the opening screens on reload.
  if (route.name === 'day' && focusQuery.value === undefined && focusQuery.error === undefined) return null;
  if (onToday && stage === null) return null;
  // "Iniciar Dia" is the only screen without the sidebar (spec/navegacao.md, "Navegação").
  if (onToday && stage === 'start') return <StartDayScreen />;

  return (
    <div className="shell">
      <Sidebar route={route} pendingDays={pendingDays} backupState={backupState} />
      <PlacePalette />
      <div className="shell__main">
        {!focus && (notice === 'backupProblem' || notice === 'backupSetup') && (
          <BackupBanner
            state={backupState}
            actions={backup}
            staleSince={backupLevel === 'stale' ? lastBackupAt : null}
            onSnooze={() => snooze('backupSetup')}
          />
        )}

        {/* One broken screen shows an error in its place; the sidebar keeps working. */}
        <ErrorBoundary
          key={routeHash(route)}
          fallback={(error, retry) => (
            <ScreenError
              error={error}
              onRetry={retry}
              onOpenData={route.name === 'data' ? undefined : () => navigate({ name: 'data' })}
            />
          )}
        >
          {route.name === 'day' && stage === 'warmup' && opening && <WarmupScreen view={opening} />}
          {route.name === 'day' && stage === 'dashboard' && opening && <DashboardScreen view={opening} today={today} />}
          {route.name === 'day' && stage === 'execution' && (
            <DayNoteScreen
              key={shownDay}
              day={shownDay}
              today={today}
              pendingDays={pendingDays}
              reminders={dueReminders}
              showPendingNotice={notice === 'pendingCheckout'}
              onSnoozePending={() => snooze('pendingCheckout')}
              focus={focus}
            />
          )}
          {route.name === 'checkout' && <CheckoutScreen key={route.day} day={route.day} today={today} from={route.from} />}
          {route.name === 'active' && <ActiveTasksScreen today={today} />}
          {route.name === 'rituals' && (
            <RitualsScreen today={today} assistant={route.assistant} pendingDays={pendingDays} />
          )}
          {route.name === 'projects' && <ProjectsScreen today={today} />}
          {route.name === 'project' && <ProjectScreen key={route.id} id={route.id} tab={route.tab ?? 'tasks'} today={today} />}
          {route.name === 'settings' && <SettingsScreen />}
          {route.name === 'people' && <PeopleScreen today={today} />}
          {route.name === 'person' && <PersonScreen key={route.id} id={route.id} today={today} />}
          {route.name === 'objectives' && <ObjectivesScreen />}
          {route.name === 'objective' && <ObjectiveScreen id={route.id} />}
          {route.name === 'habits' && <HabitsScreen today={today} />}
          {route.name === 'data' && (
            <main className="page">
              <ScreenHeader title="Dados e backup" />
              <BackupPanel state={backupState} actions={backup} storagePersisted={storagePersisted} />
            </main>
          )}
        </ErrorBoundary>

        {backup.pendingImport && (
          <ImportDialog
            backup={backup.pendingImport.backup}
            loss={backup.pendingImport.loss}
            onConfirm={backup.confirmImport}
            onCancel={backup.cancelImport}
          />
        )}
        <SaveErrorNotice />
      </div>
    </div>
  );
}
