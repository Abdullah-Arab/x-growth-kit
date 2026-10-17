import { toDateKey } from '../date';
import type { DailyLogRepository, SettingsRepository } from '../storage';
import type { DailyLog, DateKey, Metric } from '../types';
import { METRICS, emptyCounts } from '../types';

export interface MetricProgress {
  metric: Metric;
  count: number;
  target: number;
  /** 0–100, capped. A target of 0 counts as complete. */
  percent: number;
  done: boolean;
}

export interface DayProgress {
  date: DateKey;
  metrics: MetricProgress[];
  allDone: boolean;
}

export function createDailyLogUseCases(deps: {
  dailyLogs: DailyLogRepository;
  settings: SettingsRepository;
}) {
  const { dailyLogs, settings } = deps;

  async function getOrEmpty(date: DateKey): Promise<DailyLog> {
    return (await dailyLogs.get(date)) ?? { date, counts: emptyCounts(), updatedAt: 0 };
  }

  // Counter writes are read-modify-write; queue them so rapid clicks don't lose updates.
  let queue: Promise<unknown> = Promise.resolve();
  function serialize<T>(fn: () => Promise<T>): Promise<T> {
    const run = queue.then(fn, fn);
    queue = run.catch(() => {});
    return run;
  }

  async function writeCount(metric: Metric, value: number, date: DateKey) {
    const log = await getOrEmpty(date);
    const next: DailyLog = {
      ...log,
      counts: { ...log.counts, [metric]: Math.max(0, Math.floor(value)) },
      updatedAt: Date.now(),
    };
    await dailyLogs.upsert(next);
    return next;
  }

  function setCount(metric: Metric, value: number, date: DateKey = toDateKey()) {
    return serialize(() => writeCount(metric, value, date));
  }

  /** Manual +1 / -1 fallback for every auto-detected metric. Never goes below 0. */
  function increment(metric: Metric, delta = 1, date: DateKey = toDateKey()) {
    return serialize(async () => {
      const log = await getOrEmpty(date);
      return writeCount(metric, log.counts[metric] + delta, date);
    });
  }

  async function getProgress(date: DateKey = toDateKey()): Promise<DayProgress> {
    const [log, { targets }] = await Promise.all([getOrEmpty(date), settings.get()]);
    const metrics = METRICS.map((metric): MetricProgress => {
      const count = log.counts[metric];
      const target = targets[metric];
      const percent = target === 0 ? 100 : Math.min(100, Math.round((count / target) * 100));
      return { metric, count, target, percent, done: count >= target };
    });
    return { date, metrics, allDone: metrics.every((m) => m.done) };
  }

  return {
    getLog: getOrEmpty,
    getLogsInRange: (from: DateKey, to: DateKey) => dailyLogs.getRange(from, to),
    setCount,
    increment,
    getProgress,
    getTodayProgress: () => getProgress(toDateKey()),
  };
}
