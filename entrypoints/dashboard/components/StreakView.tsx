import { app } from '@/src/lib';
import { plural } from '@/src/ui/labels';
import { useLiveQuery } from '@/src/ui/useLiveQuery';
import { useToday } from '@/src/ui/useToday';
import { Heatmap, HeatmapLegend } from './Heatmap';

export function StreakView() {
  const today = useToday();
  const heatmap = useLiveQuery(() => app.streak.getHeatmap(26, today), [today]);

  if (!heatmap) return null;

  return (
    <section className="space-y-4 p-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat value={heatmap.currentStreak} label="Current streak" unit="day" />
        <Stat value={heatmap.longestStreak} label="Longest streak" unit="day" />
        <Stat value={heatmap.completedDays} label="Days completed" unit="day" hint="last 6 months" />
      </div>

      <div className="rounded-2xl border border-border p-4">
        <Heatmap data={heatmap} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted">A day counts when every daily target is hit.</p>
          <HeatmapLegend />
        </div>
      </div>
    </section>
  );
}

function Stat(props: { value: number; label: string; unit: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border px-4 py-3">
      <div className="text-2xl font-bold tabular-nums">{props.value}</div>
      <div className="text-sm text-muted">
        {props.label}
        <span className="sr-only">: {plural(props.value, props.unit)}</span>
      </div>
      {props.hint && <div className="text-xs text-muted/70">{props.hint}</div>}
    </div>
  );
}
