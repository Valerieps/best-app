import { describe, expect, it } from 'vitest';
import type { AutoBackupState } from '../infrastructure/autoBackup';
import { backupNoticeLevel, daysSinceBackup, needsBackupSetup, pickTopNotice, snoozedOn, type SnoozableNotice } from './notices';

const none = new Set<SnoozableNotice>();

describe('backupNoticeLevel', () => {
  const blocked: AutoBackupState = { status: 'blocked', fileName: 'a.json', reason: 'invalidFile' };
  const now = new Date('2026-10-15T12:00:00Z');
  const recent = '2026-10-15T08:00:00Z';
  const old = '2026-10-13T08:00:00Z';
  const paused: AutoBackupState = { status: 'needsPermission', fileName: 'a.json' };

  it('always warns about a blocked or failing backup', () => {
    expect(backupNoticeLevel(blocked, true, old, now)).toBe('problem');
    expect(backupNoticeLevel({ status: 'error', fileName: 'a.json' }, false, recent, now)).toBe('problem');
  });

  it('asks to set the backup up only while there is data and no backup was ever made', () => {
    expect(backupNoticeLevel({ status: 'noFile' }, true, null, now)).toBe('setup');
    expect(backupNoticeLevel({ status: 'noFile' }, false, null, now)).toBeNull();
    expect(backupNoticeLevel({ status: 'noFile' }, true, recent, now)).toBeNull();
    expect(backupNoticeLevel({ status: 'unsupported' }, true, null, now)).toBe('setup');
    expect(backupNoticeLevel({ status: 'unsupported' }, true, recent, now)).toBeNull();
  });

  it('warns about a paused backup until the first backup', () => {
    expect(backupNoticeLevel(paused, false, null, now)).toBe('setup');
    expect(backupNoticeLevel(paused, true, recent, now)).toBeNull();
  });

  it('warns strongly when the backup is not writing and the last backup is more than 24 hours old', () => {
    expect(backupNoticeLevel(paused, true, old, now)).toBe('stale');
    expect(backupNoticeLevel({ status: 'noFile' }, true, old, now)).toBe('stale');
    expect(backupNoticeLevel(paused, true, '2026-10-14T12:00:00Z', now)).toBeNull();
    expect(backupNoticeLevel(paused, true, '2026-10-14T11:59:00Z', now)).toBe('stale');
    expect(backupNoticeLevel({ status: 'unsupported' }, true, old, now)).toBeNull();
  });

  it('says nothing while loading or when the backup is active', () => {
    expect(backupNoticeLevel({ status: 'loading' }, true, null, now)).toBeNull();
    expect(
      backupNoticeLevel({ status: 'active', fileName: 'a.json', lastSavedAt: null, saving: false, copies: 'ok' }, true, old, now),
    ).toBeNull();
  });
});

describe('daysSinceBackup', () => {
  it('counts whole days, at least one', () => {
    const now = new Date('2026-10-15T12:00:00Z');
    expect(daysSinceBackup('2026-10-14T11:00:00Z', now)).toBe(1);
    expect(daysSinceBackup('2026-10-12T11:00:00Z', now)).toBe(3);
  });
});

describe('pickTopNotice', () => {
  const base = { backup: null, pendingCheckout: false, onDataScreen: false, snoozed: none } as const;

  it('shows nothing when nothing needs attention', () => {
    expect(pickTopNotice(base)).toBeNull();
  });

  it('puts a stale backup first like a problem, even when snoozed or on the data screen', () => {
    const snoozed = new Set<SnoozableNotice>(['pendingCheckout', 'backupSetup']);
    expect(pickTopNotice({ ...base, backup: 'stale', pendingCheckout: true, onDataScreen: true, snoozed })).toBe('backupProblem');
  });

  it('puts a backup problem first, even when snoozed or on the data screen', () => {
    const snoozed = new Set<SnoozableNotice>(['pendingCheckout', 'backupSetup']);
    expect(pickTopNotice({ ...base, backup: 'problem', pendingCheckout: true, onDataScreen: true, snoozed })).toBe(
      'backupProblem',
    );
  });

  it('puts the pending checkout before the backup setup', () => {
    expect(pickTopNotice({ ...base, backup: 'setup', pendingCheckout: true })).toBe('pendingCheckout');
  });

  it('shows the next warning once the first one is snoozed', () => {
    const snoozed = new Set<SnoozableNotice>(['pendingCheckout']);
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

describe('needsBackupSetup', () => {
  it('blocks the app until there is a backup folder, and in browsers that cannot pick one', () => {
    expect(needsBackupSetup({ status: 'noFile' })).toBe(true);
    expect(needsBackupSetup({ status: 'unsupported' })).toBe(true);
  });

  it('lets the app open once a folder was chosen, even when the backup is paused or failing', () => {
    expect(needsBackupSetup({ status: 'needsPermission', fileName: 'Backup' })).toBe(false);
    expect(needsBackupSetup({ status: 'error', fileName: 'Backup' })).toBe(false);
    expect(needsBackupSetup({ status: 'blocked', fileName: 'Backup', reason: 'invalidFile' })).toBe(false);
    expect(
      needsBackupSetup({ status: 'active', fileName: 'Backup', lastSavedAt: null, saving: false, copies: 'ok' }),
    ).toBe(false);
  });
});
