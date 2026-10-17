import { describe, expect, it } from 'vitest';
import { addDays, weekday } from '../date';
import { computeStreaks, dayLevel } from '../usecases/streak';
import { DEFAULT_SETTINGS, type DailyLog, type MetricCounts } from '../types';
import { setup } from './setup';

const { uc } = setup();
const targets = DEFAULT_SETTINGS.targets; // 3 / 10 / 1 / 2
const full: MetricCounts = { ...targets };
const log = (counts: Partial<MetricCounts>): DailyLog => ({
  date: '2026-10-01',
  counts: { tweets: 0, replies: 0, questionTweets: 0, listChecks: 0, ...counts },
  updatedAt: 1,
});

describe('date helpers', () => {
  it('adds days across month, year, and DST boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
  });
});

describe('dayLevel', () => {
  it('maps progress to levels; only all-targets-hit is level 4', () => {
    expect(dayLevel(undefined, targets)).toBe(0);
    expect(dayLevel(log({}), targets)).toBe(0);
    expect(dayLevel(log({ replies: 1 }), targets)).toBe(1);
    expect(dayLevel(log({ tweets: 3, questionTweets: 1 }), targets)).toBe(2);
    expect(dayLevel(log({ tweets: 3, replies: 9, questionTweets: 1, listChecks: 2 }), targets)).toBe(3);
    expect(dayLevel(log(full), targets)).toBe(4);
  });
});

describe('computeStreaks', () => {
  it('counts back from today, or from yesterday if today is still in progress', () => {
    const days = ['2026-10-10', '2026-10-11', '2026-10-12'];
    expect(computeStreaks(days, '2026-10-12').current).toBe(3);
    expect(computeStreaks(days, '2026-10-13').current).toBe(3);
    expect(computeStreaks(days, '2026-10-14').current).toBe(0);
  });

  it('finds the longest run and ignores future dates', () => {
    const days = ['2026-09-01', '2026-09-02', '2026-09-05', '2026-09-06', '2026-09-07', '2026-12-01'];
    expect(computeStreaks(days, '2026-10-01')).toEqual({ current: 0, longest: 3 });
  });
});

describe('getHeatmap', () => {
  it('covers 26 week columns starting on a Sunday and ending today', async () => {
    const today = '2026-10-17'; // Saturday
    for (const d of ['2026-10-15', '2026-10-16', '2026-10-17']) {
      for (const [metric, n] of Object.entries(full)) {
        await uc.dailyLog.setCount(metric as keyof MetricCounts, n, d);
      }
    }
    await uc.dailyLog.increment('replies', 4, '2026-10-14');

    const map = await uc.streak.getHeatmap(26, today);
    expect(weekday(map.start)).toBe(0);
    expect(map.days).toHaveLength(26 * 7);
    expect(map.days.at(-1)?.date).toBe(today);
    expect(map).toMatchObject({ completedDays: 3, currentStreak: 3, longestStreak: 3 });
    expect(map.days.find((d) => d.date === '2026-10-14')?.level).toBe(1);
  });
});

describe('concurrent increments', () => {
  it('does not lose updates', async () => {
    await Promise.all(Array.from({ length: 10 }, () => uc.dailyLog.increment('replies')));
    expect((await uc.dailyLog.getTodayProgress()).metrics[1]?.count).toBe(10);
  });
});
