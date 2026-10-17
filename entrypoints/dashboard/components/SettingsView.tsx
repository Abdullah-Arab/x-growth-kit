import { useEffect, useRef, useState, type FormEvent } from 'react';
import { app, ImportError, METRICS, type DailyTargets, type Metric } from '@/src/lib';
import { METRIC_LABELS } from '@/src/ui/labels';
import { useLiveQuery } from '@/src/ui/useLiveQuery';

const MAX_TARGET = 999;

type Status = { kind: 'ok' | 'error'; text: string } | null;

export function SettingsView() {
  return (
    <section className="space-y-4 p-4">
      <TargetsForm />
      <BackupPanel />
    </section>
  );
}

function TargetsForm() {
  const settings = useLiveQuery(() => app.settings.getSettings(), []);
  const [draft, setDraft] = useState<Record<Metric, string> | null>(null);
  const [status, setStatus] = useState<Status>(null);

  // Seed the form once settings load; don't clobber in-progress edits on later storage changes.
  useEffect(() => {
    if (settings && !draft) setDraft(toStrings(settings.targets));
  }, [settings, draft]);

  if (!settings || !draft) return null;

  const errors = Object.fromEntries(
    METRICS.map((m) => [m, validate(draft[m])]),
  ) as Record<Metric, string | null>;
  const valid = METRICS.every((m) => !errors[m]);
  const dirty = METRICS.some((m) => draft[m] !== String(settings.targets[m]));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const targets = Object.fromEntries(METRICS.map((m) => [m, Number(draft![m])])) as DailyTargets;
    try {
      const saved = await app.settings.updateTargets(targets);
      setDraft(toStrings(saved.targets));
      setStatus({ kind: 'ok', text: 'Targets saved.' });
    } catch (err) {
      setStatus({ kind: 'error', text: (err as Error).message });
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-border p-4" noValidate>
      <h2 className="text-lg font-bold">Daily targets</h2>
      <p className="mt-0.5 text-sm text-muted">
        Hit every target in a day to extend your streak. Set one to 0 to skip it.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {METRICS.map((m) => (
          <label key={m} className="block">
            <span className="text-sm font-medium">{METRIC_LABELS[m]}</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_TARGET}
              step={1}
              value={draft[m]}
              onChange={(e) => {
                setDraft({ ...draft, [m]: e.target.value });
                setStatus(null);
              }}
              aria-invalid={!!errors[m]}
              className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 tabular-nums outline-none focus:border-accent aria-[invalid=true]:border-danger"
            />
            {errors[m] && <span className="mt-1 block text-xs text-danger">{errors[m]}</span>}
          </label>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={!valid || !dirty}
          className="rounded-full bg-text px-5 py-2 text-sm font-bold text-bg hover:bg-text/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save
        </button>
        {dirty && (
          <button
            type="button"
            onClick={() => setDraft(toStrings(settings.targets))}
            className="text-sm text-muted hover:text-text"
          >
            Reset
          </button>
        )}
        <StatusText status={status} />
      </div>
    </form>
  );
}

function BackupPanel() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>(null);

  async function onExport() {
    const json = await app.backup.exportDataAsJson();
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = app.backup.exportFilename();
    a.click();
    URL.revokeObjectURL(url);
    setStatus({ kind: 'ok', text: 'Backup downloaded.' });
  }

  async function onImportFile(file: File) {
    if (!confirm('Importing replaces ALL current data with the backup. Continue?')) return;
    try {
      const result = await app.backup.importData(await file.text());
      setStatus({
        kind: 'ok',
        text: `Imported ${result.dailyLogs} days, ${result.swipes} swipes, ${result.drafts} drafts.`,
      });
    } catch (err) {
      setStatus({
        kind: 'error',
        text: err instanceof ImportError ? err.message : 'Import failed.',
      });
    }
  }

  return (
    <div className="rounded-2xl border border-border p-4">
      <h2 className="text-lg font-bold">Backup</h2>
      <p className="mt-0.5 text-sm text-muted">
        Your data lives only in this browser. Export regularly so you don't lose it.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onExport}
          className="rounded-full border border-border px-5 py-2 text-sm font-bold hover:bg-surface"
        >
          Export JSON
        </button>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="rounded-full border border-border px-5 py-2 text-sm font-bold hover:bg-surface"
        >
          Import JSON
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) onImportFile(file);
          }}
        />
        <StatusText status={status} />
      </div>
    </div>
  );
}

function StatusText({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <span role="status" className={`text-sm ${status.kind === 'ok' ? 'text-success' : 'text-danger'}`}>
      {status.text}
    </span>
  );
}

function toStrings(targets: DailyTargets): Record<Metric, string> {
  return Object.fromEntries(METRICS.map((m) => [m, String(targets[m])])) as Record<Metric, string>;
}

function validate(value: string): string | null {
  if (value.trim() === '') return 'Required';
  if (!/^\d+$/.test(value)) return 'Whole number, 0 or more';
  if (Number(value) > MAX_TARGET) return `At most ${MAX_TARGET}`;
  return null;
}
