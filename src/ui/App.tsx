import { useEffect, useState } from 'react';
import { loadDayOpening, loadPendingDays } from '../application/queries';
import { getLastBackupAt } from '../infrastructure/backupRepository';
import { requestPersistentStorage } from '../infrastructure/browser';
import { BackupBanner } from './backup/BackupBanner';
import { BackupPanel } from './backup/BackupPanel';
import { ImportDialog } from './backup/ImportDialog';
import { useAutoBackupState, useBackup } from './backup/useBackup';
import { CheckoutScreen } from './checkout/CheckoutScreen';
import { CleanupScreen } from './cleanup/CleanupScreen';
import { ScreenHeader } from './components/ScreenHeader';
import { DayNoteScreen } from './dayNote/DayNoteScreen';
import { HabitsScreen } from './habits/HabitsScreen';
import { useRoute, useToday } from './hooks';
import { ActiveTasksScreen, ArchivedTasksScreen } from './lists/ListScreens';
import { WikiScreen } from './lists/WikiScreen';
import { ObjectiveScreen, ObjectivesScreen } from './objectives/ObjectiveScreens';
import { DashboardScreen, StartDayScreen, WarmupScreen } from './opening/OpeningScreens';
import { useDueReminders, useReminderSignals } from './opening/Reminders';
import { ProjectsScreen } from './projects/ProjectListScreen';
import { ProjectScreen } from './projects/ProjectScreens';
import { backupNoticeLevel, pickTopNotice, useSnoozedNotices } from './notices';
import { MonthlyReflectionScreen } from './reflection/MonthlyReflectionScreen';
import { ReflectionScreen } from './reflection/ReflectionScreen';
import { autoBackup, db, reader } from './services';
import { SettingsScreen } from './settings/SettingsScreen';
import { Sidebar } from './Sidebar';
import { useLiveQuery } from './useLiveQuery';

export function App() {
  const route = useRoute();
  const today = useToday();
  const backup = useBackup();
  const backupState = useAutoBackupState();
  const [storagePersisted, setStoragePersisted] = useState<boolean | null>(null);
  const hasData = useLiveQuery(async () => (await db.events.count()) > 0) ?? false;
  const everBackedUp = useLiveQuery(async () => (await getLastBackupAt(db)) !== null) ?? false;

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

  // The day note pages only through days that still have pending items (1b).
  const shownDay = route.name === 'day' && route.day && route.day < today ? route.day : today;
  const pendingDays = useLiveQuery(() => loadPendingDays(reader, today), [today]) ?? [];
  // Section 3: with a warm-up checklist, today opens on "Iniciar Dia", warm up and dashboard.
  const opening = useLiveQuery(() => loadDayOpening(reader, today), [today]);
  const onToday = route.name === 'day' && shownDay === today;
  const stage = onToday ? (opening?.stage ?? null) : 'execution';
  const dueReminders = useDueReminders();
  useReminderSignals(dueReminders.length);
  // One warning at a time at the top; reminders that came back are not in this queue.
  const [snoozed, snooze] = useSnoozedNotices(today);
  const notice = pickTopNotice({
    backup: backupNoticeLevel(backupState, hasData, everBackedUp),
    pendingCheckout: onToday && stage === 'execution' && pendingDays.length > 0,
    onDataScreen: route.name === 'data',
    snoozed,
  });

  if (onToday && stage === null) return null;
  // "Iniciar Dia" is the only screen without the sidebar (spec/navegacao.md, "Navegação").
  if (onToday && stage === 'start') return <StartDayScreen />;

  return (
    <div className="shell">
      <Sidebar route={route} today={today} pendingDays={pendingDays} backupState={backupState} />
      <div className="shell__main">
        {(notice === 'backupProblem' || notice === 'backupSetup') && (
          <BackupBanner state={backupState} actions={backup} onSnooze={() => snooze('backupSetup')} />
        )}

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
          />
        )}
        {route.name === 'checkout' && <CheckoutScreen key={route.day} day={route.day} today={today} />}
        {route.name === 'active' && <ActiveTasksScreen today={today} />}
        {route.name === 'archived' && <ArchivedTasksScreen today={today} />}
        {route.name === 'wiki' && <WikiScreen focus={route.section} />}
        {route.name === 'cleanup' && <CleanupScreen today={today} assistant={route.assistant} />}
        {route.name === 'reflection' && <ReflectionScreen weekKey={route.week} today={today} />}
        {route.name === 'projects' && <ProjectsScreen today={today} />}
        {route.name === 'project' && <ProjectScreen key={route.id} id={route.id} tab={route.tab ?? 'tasks'} today={today} />}
        {route.name === 'settings' && <SettingsScreen />}
        {route.name === 'objectives' && <ObjectivesScreen />}
        {route.name === 'objective' && <ObjectiveScreen id={route.id} />}
        {route.name === 'habits' && <HabitsScreen today={today} />}
        {route.name === 'monthReflection' && <MonthlyReflectionScreen month={route.month} today={today} />}
        {route.name === 'data' && (
          <main className="page">
            <ScreenHeader title="Dados e backup" />
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
      </div>
    </div>
  );
}
