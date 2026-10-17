import { useEffect, useRef, useState } from 'react';
import { app, type Metric, type MetricProgress } from '@/src/lib';
import { CheckCircle } from '@/src/ui/CheckCircle';
import { METRIC_LABELS } from '@/src/ui/labels';
import { useLiveQuery } from '@/src/ui/useLiveQuery';
import { useToday } from '@/src/ui/useToday';

const UNDO_MS = 4000;

export default function App() {
  const today = useToday();
  const progress = useLiveQuery(() => app.dailyLog.getProgress(today), [today]);
  const streak = useLiveQuery(() => app.streak.getHeatmap(1, today), [today]);
  const [undo, setUndo] = useState<Metric | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(undoTimer.current), []);

  function addOne(metric: Metric) {
    app.dailyLog.increment(metric, 1, today);
    clearTimeout(undoTimer.current);
    setUndo(metric);
    undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS);
  }

  function undoLast() {
    if (!undo) return;
    app.dailyLog.increment(undo, -1, today);
    clearTimeout(undoTimer.current);
    setUndo(null);
  }

  async function openDashboard() {
    await browser.tabs.create({ url: browser.runtime.getURL('/dashboard.html') });
    window.close();
  }

  const doneCount = progress?.metrics.filter((m) => m.done).length ?? 0;
  const total = progress?.metrics.length ?? 4;

  return (
    <div className="w-80">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h1 className="text-base font-bold leading-tight">Today</h1>
          <p className="text-xs text-muted">
            {progress?.allDone ? 'All targets hit 🎉' : `${doneCount} of ${total} targets hit`}
          </p>
        </div>
        {streak && (
          <div className="text-right leading-tight">
            <div className="text-lg font-bold tabular-nums">{streak.currentStreak}</div>
            <div className="text-[11px] text-muted">day streak</div>
          </div>
        )}
      </header>

      <ul className="min-h-[216px]">
        {progress?.metrics.map((m) => (
          <Row key={m.metric} progress={m} onAdd={() => addOne(m.metric)} />
        ))}
      </ul>

      <footer className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
        <div className="min-h-5 text-xs text-muted" role="status">
          {undo && (
            <>
              +1 {METRIC_LABELS[undo].toLowerCase()}{' '}
              <button type="button" onClick={undoLast} className="font-bold text-accent hover:underline">
                Undo
              </button>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={openDashboard}
          className="shrink-0 rounded-full border border-border px-4 py-1.5 text-sm font-bold hover:bg-surface"
        >
          Open dashboard
        </button>
      </footer>
    </div>
  );
}

function Row({ progress, onAdd }: { progress: MetricProgress; onAdd: () => void }) {
  const { metric, count, target, percent, done } = progress;
  const label = METRIC_LABELS[metric];

  return (
    <li className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0">
      <CheckCircle done={done} small />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="truncate font-medium">{label}</span>
          <span className="tabular-nums text-muted">
            <span className={done ? 'text-success' : 'text-text'}>{count}</span>/{target}
          </span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface" aria-hidden>
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${done ? 'bg-success' : 'bg-accent'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onAdd}
        aria-label={`Add one ${label.toLowerCase()}`}
        title={`Add one ${label.toLowerCase()}`}
        className="h-8 shrink-0 rounded-full bg-accent px-3 text-sm font-bold text-white hover:bg-accent/85"
      >
        +1
      </button>
    </li>
  );
}
