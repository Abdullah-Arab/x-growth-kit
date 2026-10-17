import { describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { draftsItem, settingsItem } from '../storage/items';
import { migrateDraftToV2, migrateSettingsToV2 } from '../migrations';
import { setup } from './setup';

const { uc } = setup();

const v1 = (status: string, extra = {}) => ({
  id: status,
  templateType: 'helpful-tip',
  text: 't',
  status,
  createdAt: 1,
  updatedAt: 50,
  ...extra,
});

describe('draft v1 → v2 migration', () => {
  it('maps statuses and backfills postedAt', () => {
    expect(migrateDraftToV2(v1('idea'))).toMatchObject({ status: 'idea', postedAt: null });
    expect(migrateDraftToV2(v1('drafting'))).toMatchObject({ status: 'drafted', postedAt: null });
    expect(migrateDraftToV2(v1('ready'))).toMatchObject({ status: 'drafted', postedAt: null });
    expect(migrateDraftToV2(v1('posted'))).toMatchObject({ status: 'posted', postedAt: 50 });
  });

  it('is idempotent on v2 data', () => {
    const v2 = migrateDraftToV2(v1('posted', { postedAt: 7 }));
    expect(migrateDraftToV2(v2 as never)).toEqual(v2);
  });

  it('runs on stored v1 drafts', async () => {
    await fakeBrowser.storage.local.set({ drafts: [v1('ready'), v1('posted')] });
    await draftsItem.migrate();
    expect((await uc.drafts.listDrafts()).map((d) => [d.status, d.postedAt])).toEqual(
      expect.arrayContaining([
        ['drafted', null],
        ['posted', 50],
      ]),
    );
  });

  it('imports v1 backups', async () => {
    const backup = {
      app: 'x-growth-kit',
      schemaVersion: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      data: {
        settings: { targets: { tweets: 1, replies: 2, questionTweets: 3, listChecks: 4 } },
        dailyLogs: [],
        swipes: [],
        drafts: [v1('drafting'), v1('posted')],
      },
    };
    await uc.backup.importData(JSON.stringify(backup));
    const drafts = await uc.drafts.listDrafts();
    expect(drafts.map((d) => d.status).sort()).toEqual(['drafted', 'posted']);
    expect((await uc.backup.exportData()).schemaVersion).toBe(2);
  });

  it('rejects v2 backups that use v1 status names', async () => {
    const payload = await uc.backup.exportData();
    const bad = { ...payload, data: { ...payload.data, drafts: [{ ...v1('ready'), postedAt: null }] } };
    await expect(uc.backup.importData(JSON.stringify(bad))).rejects.toThrow();
  });
});

describe('settings v1 → v2 migration (listRadar)', () => {
  it('adds listRadar defaults, keeps targets, and is idempotent', () => {
    const v2 = migrateSettingsToV2({ targets: { tweets: 5, replies: 20, questionTweets: 2, listChecks: 3 } });
    expect(v2.listRadar).toEqual({ enabled: true, maxAgeMinutes: 15, maxReplies: 10 });
    expect(v2.targets.replies).toBe(20);
    expect(migrateSettingsToV2(v2)).toEqual(v2);
  });

  it('runs on stored v1 settings', async () => {
    await fakeBrowser.storage.local.set({ settings: { targets: { tweets: 5, replies: 20, questionTweets: 2, listChecks: 3 } } });
    await settingsItem.migrate();
    const s = await uc.settings.getSettings();
    expect(s).toMatchObject({ targets: { replies: 20 }, listRadar: { enabled: true, maxAgeMinutes: 15, maxReplies: 10 } });
  });

  it('fills listRadar defaults when importing a backup without it', async () => {
    const payload = await uc.backup.exportData();
    const { listRadar: _, ...settingsWithout } = payload.data.settings;
    await uc.backup.importData(JSON.stringify({ ...payload, data: { ...payload.data, settings: settingsWithout } }));
    expect((await uc.settings.getSettings()).listRadar).toEqual({ enabled: true, maxAgeMinutes: 15, maxReplies: 10 });
  });
});
