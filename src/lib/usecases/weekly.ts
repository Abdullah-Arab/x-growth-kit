import { addDays, startOfWeek, toDateKey } from '../date';
import type { DailyLogRepository, DraftRepository, SettingsRepository, SwipeRepository } from '../storage';
import { POST_TEMPLATES, type TemplateId } from '../templates';
import type { DailyTargets, DateKey, Draft, FormatTag, MetricCounts } from '../types';
import { METRICS, emptyCounts } from '../types';
import { dayLevel, isComplete, type HeatLevel } from './streak';

export interface WeekDay {
  date: DateKey;
  counts: MetricCounts;
  level: HeatLevel;
  complete: boolean;
  /** Later than today; not yet played. */
  future: boolean;
}

export interface WeeklyReview {
  /** Monday. */
  start: DateKey;
  /** Sunday. */
  end: DateKey;
  isCurrentWeek: boolean;
  days: WeekDay[];
  totals: MetricCounts;
  /** Daily targets × 7. */
  weeklyTargets: DailyTargets;
  daysComplete: number;
  swipesSaved: number;
  swipesByFormat: Partial<Record<FormatTag, number>>;
  draftsCreated: number;
  /** Oldest first. */
  draftsPosted: Draft[];
  /** All 12 templates in order, with how many drafts of each were posted this week. */
  formatsUsed: { templateId: TemplateId; posted: number }[];
}

export function createWeeklyUseCases(deps: {
  dailyLogs: DailyLogRepository;
  settings: SettingsRepository;
  swipes: SwipeRepository;
  drafts: DraftRepository;
}) {
  async function getWeeklyReview(anyDayInWeek: DateKey = toDateKey(), today: DateKey = toDateKey()) {
    const start = startOfWeek(anyDayInWeek);
    const end = addDays(start, 6);
    const inWeek = (ts: number | null) => {
      if (ts === null) return false;
      const key = toDateKey(new Date(ts));
      return key >= start && key <= end;
    };

    const [logs, { targets }, swipes, drafts] = await Promise.all([
      deps.dailyLogs.getRange(start, end),
      deps.settings.get(),
      deps.swipes.list(),
      deps.drafts.list(),
    ]);
    const byDate = new Map(logs.map((l) => [l.date, l]));

    const days: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i);
      const log = byDate.get(date);
      return {
        date,
        counts: log?.counts ?? emptyCounts(),
        level: dayLevel(log, targets),
        complete: isComplete(log, targets),
        future: date > today,
      };
    });

    const totals = emptyCounts();
    for (const day of days) for (const m of METRICS) totals[m] += day.counts[m];
    const weeklyTargets = Object.fromEntries(METRICS.map((m) => [m, targets[m] * 7])) as DailyTargets;

    const weekSwipes = swipes.filter((s) => inWeek(s.savedAt));
    const swipesByFormat: Partial<Record<FormatTag, number>> = {};
    for (const s of weekSwipes) swipesByFormat[s.formatTag] = (swipesByFormat[s.formatTag] ?? 0) + 1;

    const draftsPosted = drafts
      .filter((d) => d.status === 'posted' && inWeek(d.postedAt))
      .sort((a, b) => a.postedAt! - b.postedAt!);

    const review: WeeklyReview = {
      start,
      end,
      isCurrentWeek: today >= start && today <= end,
      days,
      totals,
      weeklyTargets,
      daysComplete: days.filter((d) => d.complete).length,
      swipesSaved: weekSwipes.length,
      swipesByFormat,
      draftsCreated: drafts.filter((d) => inWeek(d.createdAt)).length,
      draftsPosted,
      formatsUsed: POST_TEMPLATES.map((t) => ({
        templateId: t.id,
        posted: draftsPosted.filter((d) => d.templateType === t.id).length,
      })),
    };
    return review;
  }

  return { getWeeklyReview };
}
