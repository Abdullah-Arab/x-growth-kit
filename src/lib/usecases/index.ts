import type { Repositories } from '../storage';
import { createBackupUseCases } from './backup';
import { createDailyLogUseCases } from './dailyLog';
import { createDraftUseCases } from './drafts';
import { createSettingsUseCases } from './settings';
import { createSwipeUseCases } from './swipes';

export function createUseCases(repos: Repositories) {
  return {
    dailyLog: createDailyLogUseCases(repos),
    settings: createSettingsUseCases(repos),
    swipes: createSwipeUseCases(repos),
    drafts: createDraftUseCases(repos),
    backup: createBackupUseCases(repos),
  };
}

export type UseCases = ReturnType<typeof createUseCases>;

export { ImportError, type ImportResult } from './backup';
export type { DayProgress, MetricProgress } from './dailyLog';
export type { NewSwipe, SwipePatch } from './swipes';
