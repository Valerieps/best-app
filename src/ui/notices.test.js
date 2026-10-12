import { describe, expect, it } from 'vitest';
import { backupNoticeLevel, pickTopNotice, snoozedOn } from './notices';
const none = new Set();
describe('backupNoticeLevel', () => {
    const blocked = { status: 'blocked', fileName: 'a.json', reason: 'invalidFile' };
    it('always warns about a blocked or failing backup', () => {
        expect(backupNoticeLevel(blocked, true, true)).toBe('problem');
        expect(backupNoticeLevel({ status: 'error', fileName: 'a.json' }, false, true)).toBe('problem');
    });
    it('asks to set the backup up only while there is data and no backup was ever made', () => {
        expect(backupNoticeLevel({ status: 'noFile' }, true, false)).toBe('setup');
        expect(backupNoticeLevel({ status: 'noFile' }, false, false)).toBeNull();
        expect(backupNoticeLevel({ status: 'noFile' }, true, true)).toBeNull();
        expect(backupNoticeLevel({ status: 'unsupported' }, true, false)).toBe('setup');
        expect(backupNoticeLevel({ status: 'unsupported' }, true, true)).toBeNull();
    });
    it('warns about a paused backup until the first backup', () => {
        expect(backupNoticeLevel({ status: 'needsPermission', fileName: 'a.json' }, false, false)).toBe('setup');
        expect(backupNoticeLevel({ status: 'needsPermission', fileName: 'a.json' }, true, true)).toBeNull();
    });
    it('says nothing while loading or when the backup is active', () => {
        expect(backupNoticeLevel({ status: 'loading' }, true, false)).toBeNull();
        expect(backupNoticeLevel({ status: 'active', fileName: 'a.json', lastSavedAt: null, saving: false }, true, false)).toBeNull();
    });
});
describe('pickTopNotice', () => {
    const base = { backup: null, pendingCheckout: false, onDataScreen: false, snoozed: none };
    it('shows nothing when nothing needs attention', () => {
        expect(pickTopNotice(base)).toBeNull();
    });
    it('puts a backup problem first, even when snoozed or on the data screen', () => {
        const snoozed = new Set(['pendingCheckout', 'backupSetup']);
        expect(pickTopNotice({ ...base, backup: 'problem', pendingCheckout: true, onDataScreen: true, snoozed })).toBe('backupProblem');
    });
    it('puts the pending checkout before the backup setup', () => {
        expect(pickTopNotice({ ...base, backup: 'setup', pendingCheckout: true })).toBe('pendingCheckout');
    });
    it('shows the next warning once the first one is snoozed', () => {
        const snoozed = new Set(['pendingCheckout']);
        expect(pickTopNotice({ ...base, backup: 'setup', pendingCheckout: true, snoozed })).toBe('backupSetup');
    });
    it('leaves the backup setup to the data screen, where the panel already offers it', () => {
        expect(pickTopNotice({ ...base, backup: 'setup', onDataScreen: true })).toBeNull();
    });
    it('hides a snoozed backup setup', () => {
        expect(pickTopNotice({ ...base, backup: 'setup', snoozed: new Set(['backupSetup']) })).toBeNull();
    });
});
describe('snoozedOn', () => {
    it('keeps a warning snoozed only on the day it was snoozed', () => {
        const days = { pendingCheckout: '2026-10-12', backupSetup: '2026-10-11' };
        expect([...snoozedOn(days, '2026-10-12')]).toEqual(['pendingCheckout']);
        expect([...snoozedOn(days, '2026-10-13')]).toEqual([]);
    });
});
