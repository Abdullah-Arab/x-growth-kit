import { afterEach, describe, expect, it, vi } from 'vitest';
import { startOfWeek } from '../date';
import { setup } from './setup';

const { uc, repos } = setup();
afterEach(() => vi.useRealTimers());

const at = (iso: string) => new Date(iso).getTime(); // local time

describe('startOfWeek', () => {
  it('returns Monday', () => {
    expect(startOfWeek('2026-10-17')).toBe('2026-10-12'); // Sat → Mon
    expect(startOfWeek('2026-10-12')).toBe('2026-10-12'); // Mon
    expect(startOfWeek('2026-10-18')).toBe('2026-10-12'); // Sun
  });
});

describe('getWeeklyReview', () => {
  it('totals activity, formats, swipes, and posted drafts for Mon–Sun only', async () => {
    // Week of Mon 2026-10-12 … Sun 2026-10-18; "today" is Sat the 17th.
    await uc.dailyLog.setCount('replies', 10, '2026-10-12');
    await uc.dailyLog.setCount('replies', 4, '2026-10-17');
    await uc.dailyLog.setCount('replies', 99, '2026-10-11'); // previous Sunday: excluded
    for (const [m, n] of [['tweets', 3], ['questionTweets', 1], ['listChecks', 2]] as const) {
      await uc.dailyLog.setCount(m, n, '2026-10-12');
    }

    const draft = (id: string, templateType: string, postedAt: number | null, createdAt = at('2026-10-13T09:00')) => ({
      id, templateType: templateType as never, text: id, status: postedAt ? ('posted' as const) : ('idea' as const),
      createdAt, updatedAt: createdAt, postedAt,
    });
    await repos.drafts.add(draft('a', 'helpful-tip', at('2026-10-14T10:00')));
    await repos.drafts.add(draft('b', 'helpful-tip', at('2026-10-13T10:00')));
    await repos.drafts.add(draft('c', 'myth-vs-reality', at('2026-10-19T00:30'))); // next week
    await repos.drafts.add(draft('d', 'before-after', null, at('2026-10-01T09:00'))); // created earlier, not posted

    await repos.swipes.add({ id: 's1', tweetUrl: 'u1', text: '', author: '', formatTag: 'helpful-tip', note: '', savedAt: at('2026-10-15T12:00') });
    await repos.swipes.add({ id: 's2', tweetUrl: 'u2', text: '', author: '', formatTag: 'other', note: '', savedAt: at('2026-10-10T12:00') });

    const r = await uc.weekly.getWeeklyReview('2026-10-15', '2026-10-17');
    expect(r).toMatchObject({ start: '2026-10-12', end: '2026-10-18', isCurrentWeek: true, daysComplete: 1 });
    expect(r.days.map((d) => d.future)).toEqual([false, false, false, false, false, false, true]);
    expect(r.totals.replies).toBe(14);
    expect(r.weeklyTargets.replies).toBe(70);
    expect(r.draftsPosted.map((d) => d.id)).toEqual(['b', 'a']);
    expect(r.draftsCreated).toBe(3);
    expect(r.formatsUsed).toHaveLength(12);
    expect(r.formatsUsed.find((f) => f.templateId === 'helpful-tip')?.posted).toBe(2);
    expect(r.formatsUsed.filter((f) => f.posted > 0)).toHaveLength(1);
    expect(r.swipesSaved).toBe(1);
    expect(r.swipesByFormat).toEqual({ 'helpful-tip': 1 });
  });

  it('marks past weeks as not current', async () => {
    const r = await uc.weekly.getWeeklyReview('2026-10-05', '2026-10-17');
    expect(r.isCurrentWeek).toBe(false);
    expect(r.days.every((d) => !d.future)).toBe(true);
  });
});
