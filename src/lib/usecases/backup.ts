import { toDateKey } from '../date';
import { exportPayloadSchema } from '../schemas';
import type { SnapshotRepository } from '../storage';
import type { ExportPayload } from '../types';
import { EXPORT_SCHEMA_VERSION } from '../types';

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportError';
  }
}

export interface ImportResult {
  dailyLogs: number;
  swipes: number;
  drafts: number;
}

export function createBackupUseCases(deps: { snapshot: SnapshotRepository }) {
  const { snapshot } = deps;

  async function exportData(): Promise<ExportPayload> {
    return {
      app: 'x-growth-kit',
      schemaVersion: EXPORT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      data: await snapshot.readAll(),
    };
  }

  async function exportDataAsJson(): Promise<string> {
    return JSON.stringify(await exportData(), null, 2);
  }

  /**
   * Replaces ALL local data with the contents of `json`.
   * The whole payload is validated first; nothing is written if any part is invalid.
   */
  async function importData(json: string): Promise<ImportResult> {
    let raw: unknown;
    try {
      raw = JSON.parse(json);
    } catch {
      throw new ImportError('File is not valid JSON');
    }

    const parsed = exportPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const where = issue?.path.length ? ` at ${issue.path.join('.')}` : '';
      throw new ImportError(`Invalid backup file${where}: ${issue?.message ?? 'unknown error'}`);
    }

    const { data } = parsed.data;
    await snapshot.writeAll(data);
    return {
      dailyLogs: data.dailyLogs.length,
      swipes: data.swipes.length,
      drafts: data.drafts.length,
    };
  }

  return {
    exportData,
    exportDataAsJson,
    exportFilename: () => `x-growth-kit-backup-${toDateKey()}.json`,
    importData,
  };
}
