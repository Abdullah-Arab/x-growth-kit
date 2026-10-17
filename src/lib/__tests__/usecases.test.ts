import { describe, expect, it } from 'vitest';
import { toDateKey } from '../date';
import { setup } from './setup';

const { uc } = setup();

describe('dailyLog use cases', () => {
  it('increments, clamps at zero, and computes progress', async () => {
    await uc.dailyLog.increment('replies');
    await uc.dailyLog.increment('replies', 4);
    await uc.dailyLog.increment('tweets', -3);

    const progress = await uc.dailyLog.getTodayProgress();
    expect(progress.date).toBe(toDateKey());
    const replies = progress.metrics.find((m) => m.metric === 'replies')!;
    expect(replies).toMatchObject({ count: 5, target: 10, percent: 50, done: false });
    const tweets = progress.metrics.find((m) => m.metric === 'tweets')!;
    expect(tweets.count).toBe(0);
    expect(progress.allDone).toBe(false);
  });

  it('a zero target counts as done', async () => {
    await uc.settings.updateTargets({ tweets: 0, replies: 0, questionTweets: 0, listChecks: 0 });
    const progress = await uc.dailyLog.getTodayProgress();
    expect(progress.allDone).toBe(true);
    expect(progress.metrics.every((m) => m.percent === 100)).toBe(true);
  });

  it('logs are per day', async () => {
    await uc.dailyLog.increment('tweets', 2, '2026-01-01');
    expect((await uc.dailyLog.getLog('2026-01-01')).counts.tweets).toBe(2);
    expect((await uc.dailyLog.getLog('2026-01-02')).counts.tweets).toBe(0);
  });
});

describe('settings use cases', () => {
  it('rejects invalid targets', async () => {
    await expect(uc.settings.updateTargets({ replies: -1 })).rejects.toThrow();
    await expect(uc.settings.updateTargets({ replies: 1.5 })).rejects.toThrow();
  });

  it('merges partial targets', async () => {
    const s = await uc.settings.updateTargets({ replies: 20 });
    expect(s.targets).toEqual({ tweets: 3, replies: 20, questionTweets: 1, listChecks: 2 });
  });
});

describe('swipe use cases', () => {
  it('fills defaults and dedupes by tweet URL', async () => {
    const input = { tweetUrl: 'https://x.com/a/status/1', text: 'hello', author: '@a' };
    const first = await uc.swipes.saveSwipe(input);
    expect(first).toMatchObject({ formatTag: 'other', note: '' });
    const again = await uc.swipes.saveSwipe({ ...input, tweetUrl: ` ${input.tweetUrl} ` });
    expect(again.id).toBe(first.id);
    expect(await uc.swipes.listSwipes()).toHaveLength(1);
    expect(await uc.swipes.isSaved(input.tweetUrl)).toBe(true);
  });

  it('filters by format tag', async () => {
    await uc.swipes.saveSwipe({ tweetUrl: 'u1', text: '', author: '', formatTag: 'before-after' });
    await uc.swipes.saveSwipe({ tweetUrl: 'u2', text: '', author: '' });
    const filtered = await uc.swipes.listSwipes({ formatTag: 'before-after' });
    expect(filtered.map((s) => s.tweetUrl)).toEqual(['u1']);
  });
});

describe('draft use cases', () => {
  it('creates, edits, and moves through statuses', async () => {
    const d = await uc.drafts.createDraft('myth-vs-reality');
    expect(d.status).toBe('idea');
    await uc.drafts.updateDraftText(d.id, 'Myth: ...');
    const ready = await uc.drafts.setDraftStatus(d.id, 'ready');
    expect(ready).toMatchObject({ text: 'Myth: ...', status: 'ready' });
    expect(await uc.drafts.listDrafts({ status: 'ready' })).toHaveLength(1);
    await uc.drafts.deleteDraft(d.id);
    expect(await uc.drafts.listDrafts()).toHaveLength(0);
  });
});
