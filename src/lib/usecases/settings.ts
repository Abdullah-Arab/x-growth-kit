import type { SettingsRepository } from '../storage';
import type { DailyTargets, Settings } from '../types';

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

  return {
    getSettings: () => settings.get(),
    updateTargets,
  };
}
