import type { TemplateId } from './templates';

/** Local calendar day, 'YYYY-MM-DD'. */
export type DateKey = string;

export const METRICS = ['tweets', 'replies', 'questionTweets', 'listChecks'] as const;
export type Metric = (typeof METRICS)[number];
export type MetricCounts = Record<Metric, number>;

export type DailyTargets = MetricCounts;

/** Highlights fresh, low-competition tweets on x.com list timelines. */
export interface ListRadarSettings {
  enabled: boolean;
  /** Highlight tweets younger than this. */
  maxAgeMinutes: number;
  /** …that also have fewer replies than this. */
  maxReplies: number;
}

export interface Settings {
  targets: DailyTargets;
  listRadar: ListRadarSettings;
}

export interface DailyLog {
  date: DateKey;
  counts: MetricCounts;
  updatedAt: number;
}

export type FormatTag = TemplateId | 'other';

export interface SwipeItem {
  id: string;
  tweetUrl: string;
  text: string;
  author: string;
  formatTag: FormatTag;
  note: string;
  savedAt: number;
}

export const DRAFT_STATUSES = ['idea', 'drafted', 'posted'] as const;
export type DraftStatus = (typeof DRAFT_STATUSES)[number];

export interface Draft {
  id: string;
  templateType: TemplateId;
  text: string;
  status: DraftStatus;
  createdAt: number;
  updatedAt: number;
  /** When it was marked posted; null otherwise. Drives the weekly review. */
  postedAt: number | null;
}

export interface AppData {
  settings: Settings;
  dailyLogs: DailyLog[];
  swipes: SwipeItem[];
  drafts: Draft[];
}

/** v2: draft statuses idea/drafted/posted + postedAt. v1 backups are still importable. */
export const EXPORT_SCHEMA_VERSION = 2;

export interface ExportPayload {
  app: 'x-growth-kit';
  schemaVersion: typeof EXPORT_SCHEMA_VERSION;
  exportedAt: string;
  data: AppData;
}

export const DEFAULT_SETTINGS: Settings = {
  targets: { tweets: 3, replies: 10, questionTweets: 1, listChecks: 2 },
  listRadar: { enabled: true, maxAgeMinutes: 15, maxReplies: 10 },
};

export const LIST_RADAR_LIMITS = {
  maxAgeMinutes: { min: 1, max: 1440 },
  maxReplies: { min: 1, max: 10_000 },
} as const;

export function emptyCounts(): MetricCounts {
  return { tweets: 0, replies: 0, questionTweets: 0, listChecks: 0 };
}
