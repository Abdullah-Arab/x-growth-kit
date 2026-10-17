import type { Draft, DraftStatus, Settings } from './types';
import { DEFAULT_SETTINGS } from './types';

/** Draft status names before v2 (idea → drafting → ready → posted). */
const V1_STATUS_MAP: Record<string, DraftStatus> = {
  idea: 'idea',
  drafting: 'drafted',
  ready: 'drafted',
  drafted: 'drafted',
  posted: 'posted',
};

/**
 * Upgrades a v1 draft (or leaves a v2 draft unchanged). Idempotent on purpose: it also runs
 * on imported data and on storage that may lack WXT's version marker.
 */
export function migrateDraftToV2(draft: Record<string, unknown>): Draft {
  const status = V1_STATUS_MAP[String(draft.status)] ?? 'idea';
  const postedAt =
    status !== 'posted'
      ? null
      : typeof draft.postedAt === 'number'
        ? draft.postedAt
        : (draft.updatedAt as number);
  return { ...(draft as unknown as Draft), status, postedAt };
}

/** v2 adds listRadar. Fills any missing fields with defaults; idempotent. */
export function migrateSettingsToV2(settings: Partial<Settings> | null | undefined): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    targets: { ...DEFAULT_SETTINGS.targets, ...settings?.targets },
    listRadar: { ...DEFAULT_SETTINGS.listRadar, ...settings?.listRadar },
  };
}
