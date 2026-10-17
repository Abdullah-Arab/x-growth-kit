import { createRepositories } from './storage';
import { createUseCases } from './usecases';

/** App-wide use cases wired to chrome.storage.local. UI code imports this. */
export const app = createUseCases(createRepositories());

export * from './types';
export * from './templates';
export { normalizeTweetUrl } from './tweetUrl';
export { addDays, parseDateKey, toDateKey, weekday } from './date';
export {
  ImportError,
  type DayProgress,
  type Heatmap,
  type HeatmapDay,
  type HeatLevel,
  type ImportResult,
  type MetricProgress,
} from './usecases';
