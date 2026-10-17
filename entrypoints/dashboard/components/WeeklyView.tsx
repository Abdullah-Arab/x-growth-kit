import { useState, type ReactNode } from 'react';
import { addDays, app, getTemplate, METRICS, parseDateKey, type WeeklyReview } from '@/src/lib';
import { METRIC_LABELS, plural, shortDate } from '@/src/ui/labels';
import { useLiveQuery } from '@/src/ui/useLiveQuery';
import { useToday } from '@/src/ui/useToday';
import { LEVEL_CLASS } from './Heatmap';

export function WeeklyView() {
  const today = useToday();
  const [anchor, setAnchor] = useState<string | null>(null); // null = this week
  const day = anchor ?? today;
  const review = useLiveQuery(() => app.weekly.getWeeklyReview(day, today), [day, today]);

  if (!review) return null;

  return (
    <section className="space-y-4 p-4">
      <WeekNav review={review} onMove={(delta) => setAnchor(addDays(review.start, delta * 7))} onToday={() => setAnchor(null)} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={`${review.daysComplete}/7`} label="Days all targets hit" />
        <Stat value={review.draftsPosted.length} label="Drafts posted" />
        <Stat value={`${review.formatsUsed.filter((f) => f.posted > 0).length}/12`} label="Formats used" />
        <Stat value={review.swipesSaved} label="Tweets saved" />
      </div>

      <Activity review={review} />
      <Formats review={review} />
      <Posted review={review} />
    </section>
  );
}

function WeekNav(props: { review: WeeklyReview; onMove: (delta: number) => void; onToday: () => void }) {
  const { review } = props;
  const start = parseDateKey(review.start);
  const end = parseDateKey(review.end);
  const month = (d: Date) => d.toLocaleDateString(undefined, { month: 'short' });
  // Built by hand: some locales render {day, year} without a month oddly.
  const label =
    start.getMonth() === end.getMonth()
      ? `${month(start)} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`
      : `${month(start)} ${start.getDate()} – ${month(end)} ${end.getDate()}, ${end.getFullYear()}`;

  const arrow = 'flex size-9 items-center justify-center rounded-full text-lg hover:bg-surface disabled:opacity-30 disabled:hover:bg-transparent';
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => props.onMove(-1)} aria-label="Previous week" className={arrow}>
        ‹
      </button>
      <h2 className="min-w-0 flex-1 text-center text-lg font-bold">
        {label}
        {review.isCurrentWeek && <span className="ml-2 text-sm font-normal text-muted">This week</span>}
      </h2>
      {!review.isCurrentWeek && (
        <button type="button" onClick={props.onToday} className="rounded-full border border-border px-3 py-1 text-sm hover:bg-surface">
          This week
        </button>
      )}
      <button
        type="button"
        onClick={() => props.onMove(1)}
        disabled={review.isCurrentWeek}
        aria-label="Next week"
        className={arrow}
      >
        ›
      </button>
    </div>
  );
}

function Activity({ review }: { review: WeeklyReview }) {
  return (
    <Card title="Activity">
      <div className="grid grid-cols-7 gap-1.5">
        {review.days.map((d) => {
          const date = parseDateKey(d.date);
          const label = date.toLocaleDateString(undefined, { weekday: 'short' });
          const status = d.future ? 'upcoming' : d.complete ? 'all targets hit' : d.level > 0 ? 'partial' : 'no activity';
          return (
            <div key={d.date} className="text-center" title={`${date.toLocaleDateString()}: ${status}`}>
              <div className="text-[11px] text-muted">{label}</div>
              <div
                className={`mt-1 h-8 rounded-md ${
                  d.future ? 'border border-dashed border-border' : `${LEVEL_CLASS[d.level]} ${d.level === 0 ? 'border border-border/60' : ''}`
                }`}
                role="img"
                aria-label={`${label}: ${status}`}
              />
            </div>
          );
        })}
      </div>

      <ul className="mt-4 space-y-3">
        {METRICS.map((m) => {
          const total = review.totals[m];
          const target = review.weeklyTargets[m];
          const pct = target === 0 ? 100 : Math.min(100, Math.round((total / target) * 100));
          const done = total >= target;
          return (
            <li key={m}>
              <div className="flex justify-between text-sm">
                <span>{METRIC_LABELS[m]}</span>
                <span className="tabular-nums text-muted">
                  <span className={done ? 'text-success' : 'text-text'}>{total}</span> / {target}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface" aria-hidden>
                <div className={`h-full rounded-full ${done ? 'bg-success' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-muted">Weekly target = daily target × 7.</p>
    </Card>
  );
}

function Formats({ review }: { review: WeeklyReview }) {
  const unused = review.formatsUsed.filter((f) => f.posted === 0);
  return (
    <Card title="Formats used" subtitle="Drafts marked posted this week, by template">
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {review.formatsUsed.map(({ templateId, posted }) => (
          <li
            key={templateId}
            className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-sm ${
              posted > 0 ? 'bg-accent/15 text-text' : 'text-muted'
            }`}
          >
            <span className="truncate">{getTemplate(templateId).name}</span>
            <span className={`ml-2 tabular-nums ${posted > 0 ? 'font-bold text-accent' : ''}`}>{posted || '—'}</span>
          </li>
        ))}
      </ul>
      {unused.length > 0 && unused.length < 12 && (
        <p className="mt-3 text-xs text-muted">
          Try next week: {unused.slice(0, 3).map((f) => getTemplate(f.templateId).name).join(', ')}
          {unused.length > 3 ? ` and ${unused.length - 3} more` : ''}.
        </p>
      )}
    </Card>
  );
}

function Posted({ review }: { review: WeeklyReview }) {
  return (
    <Card title="Drafts posted" subtitle={plural(review.draftsPosted.length, 'draft') + (review.draftsCreated ? ` · ${review.draftsCreated} started this week` : '')}>
      {review.draftsPosted.length === 0 ? (
        <p className="text-sm text-muted">Nothing marked posted this week. Mark drafts as Posted in the Drafts tab.</p>
      ) : (
        <ul className="divide-y divide-border">
          {review.draftsPosted.map((d) => (
            <li key={d.id} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex justify-between gap-2 text-xs text-muted">
                <span className="font-bold text-accent">{getTemplate(d.templateType).name}</span>
                <span>{shortDate(d.postedAt!)}</span>
              </div>
              <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm">{d.text || <em className="text-muted">Empty draft</em>}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Card(props: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <h3 className="font-bold">{props.title}</h3>
      {props.subtitle && <p className="text-xs text-muted">{props.subtitle}</p>}
      <div className="mt-3">{props.children}</div>
    </div>
  );
}

function Stat(props: { value: string | number; label: string }) {
  return (
    <div className="rounded-2xl border border-border px-4 py-3">
      <div className="text-2xl font-bold tabular-nums">{props.value}</div>
      <div className="text-sm text-muted">{props.label}</div>
    </div>
  );
}
