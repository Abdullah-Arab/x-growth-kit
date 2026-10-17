import { addDays, toDateKey, weekday } from '../date';
import type { DailyLogRepository, SettingsRepository } from '../storage';
import type { DailyLog, DailyTargets, DateKey } from '../types';
import { METRICS } from '../types';

/** 0 = nothing logged … 4 = every target hit (the only level that counts toward a streak). */
export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export interface HeatmapDay {
  date: DateKey;
  level: HeatLevel;
  complete: boolean;
}

export interface Heatmap {
  /** Always a Sunday, so days chunk cleanly into week columns. */
  start: DateKey;
  today: DateKey;
  /** Every day from `start` through `today`, inclusive. */
  days: HeatmapDay[];
  completedDays: number;
  currentStreak: number;
  longestStreak: number;
}

// Streaks are judged against the *current* targets; logs don't snapshot past targets.

export function isComplete(log: DailyLog | undefined, targets: DailyTargets): boolean {
  return !!log && METRICS.every((m) => log.counts[m] >= targets[m]);
}

export function dayLevel(log: DailyLog | undefined, targets: DailyTargets): HeatLevel {
  if (!log) return 0;
  if (isComplete(log, targets)) return 4;
  const active = METRICS.filter((m) => targets[m] > 0);
  const avg =
    active.reduce((sum, m) => sum + Math.min(1, log.counts[m] / targets[m]), 0) / active.length;
  if (avg >= 0.75) return 3;
  if (avg >= 0.5) return 2;
  if (avg > 0) return 1;
  return 0;
}

/** Today not being complete yet doesn't break the streak; it's still in progress. */
export function computeStreaks(completeDates: Iterable<DateKey>, today: DateKey) {
  const dates = new Set([...completeDates].filter((d) => d <= today));

  let current = 0;
  let cursor = dates.has(today) ? today : addDays(today, -1);
  while (dates.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  let longest = 0;
  let run = 0;
  let prev: DateKey | null = null;
  for (const d of [...dates].sort()) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }

  return { current, longest };
}

export function createStreakUseCases(deps: {
  dailyLogs: DailyLogRepository;
  settings: SettingsRepository;
}) {
  const { dailyLogs, settings } = deps;

  /** Default 26 weeks ≈ the last 6 months. */
  async function getHeatmap(weeks = 26, today: DateKey = toDateKey()): Promise<Heatmap> {
    const [logs, { targets }] = await Promise.all([dailyLogs.getAll(), settings.get()]);
    const byDate = new Map(logs.map((l) => [l.date, l]));
    const start = addDays(today, -(weeks - 1) * 7 - weekday(today));

    const days: HeatmapDay[] = [];
    for (let d = start; d <= today; d = addDays(d, 1)) {
      const log = byDate.get(d);
      days.push({ date: d, level: dayLevel(log, targets), complete: isComplete(log, targets) });
    }

    const streaks = computeStreaks(
      logs.filter((l) => isComplete(l, targets)).map((l) => l.date),
      today,
    );

    return {
      start,
      today,
      days,
      completedDays: days.filter((d) => d.complete).length,
      currentStreak: streaks.current,
      longestStreak: streaks.longest,
    };
  }

  return { getHeatmap };
}
