import { storage } from 'wxt/utils/storage';
import type { DailyLog, DateKey, Draft, Settings, SwipeItem } from '../types';
import { DEFAULT_SETTINGS } from '../types';

// Raw chrome.storage.local items. Only repositories should touch these.
// Bump `version` and add `migrations` when a shape changes.

export const settingsItem = storage.defineItem<Settings>('local:settings', {
  fallback: DEFAULT_SETTINGS,
  version: 1,
});

export const dailyLogsItem = storage.defineItem<Record<DateKey, DailyLog>>('local:dailyLogs', {
  fallback: {},
  version: 1,
});

export const swipesItem = storage.defineItem<SwipeItem[]>('local:swipes', {
  fallback: [],
  version: 1,
});

export const draftsItem = storage.defineItem<Draft[]>('local:drafts', {
  fallback: [],
  version: 1,
});
