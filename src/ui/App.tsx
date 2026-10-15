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
import { navigate, routeHash, useRoute, useToday } from './hooks';
import { ActiveTasksScreen } from './lists/ListScreens';
import { ObjectiveScreen, ObjectivesScreen } from './objectives/ObjectiveScreens';
import { DashboardScreen, StartDayScreen, WarmupScreen } from './opening/OpeningScreens';
import { useDueReminders, useReminderSignals } from './opening/Reminders';
import { ProjectsScreen } from './projects/ProjectListScreen';
import { ProjectScreen } from './projects/ProjectScreens';
import { loadReviewAvailability } from '../application/reviewQueries';
import { backupNoticeLevel, pickTopNotice, useReviewSnooze, useSnoozedNotices } from './notices';
import { DirectionReviewScreen } from './reviews/DirectionReviewScreen';
import { FocusReviewScreen } from './reviews/FocusReviewScreen';
import { isReviewSnoozed, pickReviewNotice } from './reviews/reviewNotice';
import { autoBackup, db, reader } from './services';
import { SettingsScreen } from './settings/SettingsScreen';
import { Sidebar } from './Sidebar';
import { useLiveQueryState } from './useLiveQuery';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ScreenError } from './components/ErrorScreens';
import { SaveErrorNotice } from './components/SaveErrorNotice';
import { reportSaveError } from './saveErrors';
import { enabledRoute, visibleReviews } from './features';

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
  const everBackedUp = useLiveQueryState(async () => (await getLastBackupAt(db)) !== null).value ?? false;

  useEffect(() => {
    requestPersistentStorage().then(setStoragePersisted, () => setStoragePersisted(false));
    void autoBackup.init();
    // Try to save right away when the tab is hidden or closed.
    const onHide = () => {
      if (document.visibilityState === 'hidden') void autoBackup.flush();
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
  const reviews = visibleReviews(useLiveQueryState(() => loadReviewAvailability(reader, today), [today]).value);
  const [reviewSnoozedAt, snoozeReview] = useReviewSnooze();
  const reviewNotice = isReviewSnoozed(reviewSnoozedAt, reviews?.lastCheckoutAt ?? null) ? null : pickReviewNotice(reviews);
  const notice = pickTopNotice({
    backup: backupNoticeLevel(backupState, hasData, everBackedUp),
    pendingCheckout: onToday && stage === 'execution' && pendingDays.length > 0,
    onDataScreen: route.name === 'data',
    snoozed,
    reviewAvailable: onToday && stage === 'execution' && reviewNotice !== null,
  });

  // Wait for the focus too, so a focused part never flashes the opening screens on reload.
  if (route.name === 'day' && focusQuery.value === undefined && focusQuery.error === undefined) return null;
  if (onToday && stage === null) return null;
  // "Iniciar Dia" is the only screen without the sidebar (spec/navegacao.md, "Navegação").
  if (onToday && stage === 'start') return <StartDayScreen />;

  return (
    <div className="shell">
      <Sidebar route={route} today={today} pendingDays={pendingDays} reviews={reviews} backupState={backupState} />
      <div className="shell__main">
        {!focus && (notice === 'backupProblem' || notice === 'backupSetup') && (
          <BackupBanner state={backupState} actions={backup} onSnooze={() => snooze('backupSetup')} />
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
              reviewNotice={notice === 'reviewAvailable' ? reviewNotice : null}
              onSnoozeReview={snoozeReview}
              focus={focus}
            />
          )}
          {route.name === 'checkout' && <CheckoutScreen key={route.day} day={route.day} today={today} />}
          {route.name === 'active' && <ActiveTasksScreen today={today} />}
          {route.name === 'cleanup' && <CleanupScreen today={today} assistant={route.assistant} />}
          {route.name === 'focusReview' && <FocusReviewScreen today={today} />}
          {route.name === 'projects' && <ProjectsScreen today={today} />}
          {route.name === 'project' && <ProjectScreen key={route.id} id={route.id} tab={route.tab ?? 'tasks'} today={today} />}
          {route.name === 'settings' && <SettingsScreen />}
          {route.name === 'objectives' && <ObjectivesScreen />}
          {route.name === 'objective' && <ObjectiveScreen id={route.id} />}
          {route.name === 'habits' && <HabitsScreen today={today} />}
          {route.name === 'directionReview' && <DirectionReviewScreen today={today} />}
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
