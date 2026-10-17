import type { ReactNode } from 'react';
import { app, parseDateKey, type MetricProgress } from '@/src/lib';
import { METRIC_LABELS } from '@/src/ui/labels';
import { useLiveQuery } from '@/src/ui/useLiveQuery';
import { useToday } from '@/src/ui/useToday';

export function TodayView() {
  const today = useToday();
  const progress = useLiveQuery(() => app.dailyLog.getProgress(today), [today]);
  const streak = useLiveQuery(() => app.streak.getHeatmap(1, today), [today]);

  if (!progress) return null;

  const doneCount = progress.metrics.filter((m) => m.done).length;
  const dateLabel = parseDateKey(today).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <section>
      <div className="flex items-end justify-between px-4 py-4">
        <div>
          <h2 className="text-xl font-bold">{dateLabel}</h2>
          <p className="mt-0.5 text-sm text-muted">
            {progress.allDone
              ? 'All targets hit. This day counts toward your streak.'
              : `${doneCount} of ${progress.metrics.length} targets hit`}
          </p>
        </div>
        {streak && (
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums">{streak.currentStreak}</div>
            <div className="text-xs text-muted">day streak</div>
          </div>
        )}
      </div>

      <ul className="border-t border-border">
        {progress.metrics.map((m) => (
          <MetricRow key={m.metric} progress={m} date={today} />
        ))}
      </ul>
    </section>
  );
}

function MetricRow({ progress, date }: { progress: MetricProgress; date: string }) {
  const { metric, count, target, percent, done } = progress;
  const label = METRIC_LABELS[metric];
  const bump = (delta: number) => app.dailyLog.increment(metric, delta, date);

  return (
    <li className="border-b border-border px-4 py-3">
      <div className="flex items-center gap-3">
        <CheckCircle done={done} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-medium">{label}</span>
            <span className="text-sm tabular-nums text-muted">
              <span className={done ? 'text-success' : 'text-text'}>{count}</span> / {target}
            </span>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface"
            role="progressbar"
            aria-label={`${label} progress`}
            aria-valuemin={0}
            aria-valuemax={target}
            aria-valuenow={count}
          >
            <div
              className={`h-full rounded-full transition-[width] duration-300 ${
                done ? 'bg-success' : 'bg-accent'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
        <div className="flex gap-1.5">
          <StepButton onClick={() => bump(-1)} disabled={count === 0} label={`Remove one ${label.toLowerCase()}`}>
            −
          </StepButton>
          <StepButton onClick={() => bump(1)} label={`Add one ${label.toLowerCase()}`} primary>
            +
          </StepButton>
        </div>
      </div>
    </li>
  );
}

function StepButton(props: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  primary?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      aria-label={props.label}
      title={props.label}
      className={`flex size-9 items-center justify-center rounded-full text-lg font-bold leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        props.primary
          ? 'bg-accent text-white hover:bg-accent/85'
          : 'border border-border text-text hover:bg-surface'
      }`}
    >
      {props.children}
    </button>
  );
}

function CheckCircle({ done }: { done: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${
        done ? 'border-success bg-success text-black' : 'border-border'
      }`}
    >
      {done && (
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}
