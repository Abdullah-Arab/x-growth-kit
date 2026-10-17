import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, emptyCounts, type SwipeItem } from '../types';
import { setup } from './setup';

const { repos } = setup();

const swipe = (id: string): SwipeItem => ({
  id,
  tweetUrl: `https://x.com/a/status/${id}`,
  text: 't',
  author: 'a',
  formatTag: 'other',
  note: '',
  savedAt: 1,
});

describe('repositories', () => {
  it('settings fall back to defaults and persist', async () => {
    expect(await repos.settings.get()).toEqual(DEFAULT_SETTINGS);
    const next = { targets: { ...DEFAULT_SETTINGS.targets, replies: 25 } };
    await repos.settings.save(next);
    expect(await repos.settings.get()).toEqual(next);
  });

  it('daily logs upsert and query by range, sorted', async () => {
    for (const date of ['2026-10-03', '2026-10-01', '2026-10-02']) {
      await repos.dailyLogs.upsert({ date, counts: emptyCounts(), updatedAt: 1 });
    }
    expect(await repos.dailyLogs.get('2026-09-30')).toBeNull();
    const range = await repos.dailyLogs.getRange('2026-10-02', '2026-10-03');
    expect(range.map((l) => l.date)).toEqual(['2026-10-02', '2026-10-03']);
    expect((await repos.dailyLogs.getAll()).map((l) => l.date)).toEqual([
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
    ]);
  });

  it('collection add / update / remove', async () => {
    await repos.swipes.add(swipe('1'));
    await repos.swipes.add(swipe('2'));
    const updated = await repos.swipes.update('1', { note: 'good hook' });
    expect(updated?.note).toBe('good hook');
    expect(await repos.swipes.update('missing', { note: 'x' })).toBeNull();
    await repos.swipes.remove('2');
    expect(await repos.swipes.list()).toEqual([{ ...swipe('1'), note: 'good hook' }]);
  });
});
