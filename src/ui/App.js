import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
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
import { GlobalBar } from './GlobalBar';
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
import { SideMenu } from './SideMenu';
import { useLiveQuery } from './useLiveQuery';
export function App() {
    const route = useRoute();
    const today = useToday();
    const backup = useBackup();
    const backupState = useAutoBackupState();
    const [menuOpen, setMenuOpen] = useState(false);
    const [storagePersisted, setStoragePersisted] = useState(null);
    const hasData = useLiveQuery(async () => (await db.events.count()) > 0) ?? false;
    const everBackedUp = useLiveQuery(async () => (await getLastBackupAt(db)) !== null) ?? false;
    const closeMenu = useCallback(() => setMenuOpen(false), []);
    useEffect(() => {
        requestPersistentStorage().then(setStoragePersisted, () => setStoragePersisted(false));
        void autoBackup.init();
        // Try to save right away when the tab is hidden or closed.
        const onHide = () => {
            if (document.visibilityState === 'hidden')
                void autoBackup.flush();
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
    if (onToday && stage === null)
        return null;
    // "Iniciar Dia" is the only screen without the global bar (SPEC.md, "Navegação").
    if (onToday && stage === 'start')
        return _jsx(StartDayScreen, {});
    return (_jsxs(_Fragment, { children: [_jsx(GlobalBar, { today: today, pendingDays: pendingDays, onToday: onToday, onOpenMenu: () => setMenuOpen(true), backupState: backupState, backup: backup }), (notice === 'backupProblem' || notice === 'backupSetup') && (_jsx(BackupBanner, { state: backupState, actions: backup, onSnooze: () => snooze('backupSetup') })), _jsx(SideMenu, { open: menuOpen, current: route.name, onClose: closeMenu }), route.name === 'day' && stage === 'warmup' && opening && _jsx(WarmupScreen, { view: opening }), route.name === 'day' && stage === 'dashboard' && opening && _jsx(DashboardScreen, { view: opening, today: today }), route.name === 'day' && stage === 'execution' && (_jsx(DayNoteScreen, { day: shownDay, today: today, pendingDays: pendingDays, reminders: dueReminders, showPendingNotice: notice === 'pendingCheckout', onSnoozePending: () => snooze('pendingCheckout') }, shownDay)), route.name === 'checkout' && _jsx(CheckoutScreen, { day: route.day, today: today }, route.day), route.name === 'active' && _jsx(ActiveTasksScreen, { today: today }), route.name === 'archived' && _jsx(ArchivedTasksScreen, { today: today }), route.name === 'wiki' && _jsx(WikiScreen, { focus: route.section }), route.name === 'cleanup' && _jsx(CleanupScreen, { today: today, assistant: route.assistant }), route.name === 'reflection' && _jsx(ReflectionScreen, { weekKey: route.week, today: today }), route.name === 'projects' && _jsx(ProjectsScreen, { today: today }), route.name === 'project' && _jsx(ProjectScreen, { id: route.id, tab: route.tab ?? 'tasks', today: today }, route.id), route.name === 'settings' && _jsx(SettingsScreen, {}), route.name === 'objectives' && _jsx(ObjectivesScreen, {}), route.name === 'objective' && _jsx(ObjectiveScreen, { id: route.id }), route.name === 'habits' && _jsx(HabitsScreen, { today: today }), route.name === 'monthReflection' && _jsx(MonthlyReflectionScreen, { month: route.month, today: today }), route.name === 'data' && (_jsxs("main", { className: "page", children: [_jsx(ScreenHeader, { title: "Dados e backup" }), _jsx(BackupPanel, { state: backupState, actions: backup, storagePersisted: storagePersisted })] })), backup.pendingImport && (_jsx(ImportDialog, { backup: backup.pendingImport.backup, loss: backup.pendingImport.loss, onConfirm: backup.confirmImport, onCancel: backup.cancelImport }))] }));
}
