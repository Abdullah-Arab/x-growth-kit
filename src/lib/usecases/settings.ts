import type { SettingsRepository } from '../storage';
import type { DailyTargets, ListRadarSettings, Settings } from '../types';
import { LIST_RADAR_LIMITS } from '../types';

export function createSettingsUseCases(deps: { settings: SettingsRepository }) {
  const { settings } = deps;

  async function updateTargets(patch: Partial<DailyTargets>): Promise<Settings> {
    for (const [metric, value] of Object.entries(patch)) {
      if (!Number.isInteger(value) || value < 0) {
        throw new Error(`Target for ${metric} must be a non-negative integer`);
      }
    }
    const current = await settings.get();
    const next: Settings = { ...current, targets: { ...current.targets, ...patch } };
    await settings.save(next);
    return next;
  }

  async function updateListRadar(patch: Partial<ListRadarSettings>): Promise<Settings> {
    for (const key of ['maxAgeMinutes', 'maxReplies'] as const) {
      const value = patch[key];
      if (value === undefined) continue;
      const { min, max } = LIST_RADAR_LIMITS[key];
      if (!Number.isInteger(value) || value < min || value > max) {
        throw new Error(`${key} must be a whole number from ${min} to ${max}`);
      }
    }
    const current = await settings.get();
    const next: Settings = { ...current, listRadar: { ...current.listRadar, ...patch } };
    await settings.save(next);
    return next;
  }

  return {
    getSettings: () => settings.get(),
    updateTargets,
    updateListRadar,
    watchSettings: (callback: (settings: Settings) => void) => settings.watch(callback),
  };
}
