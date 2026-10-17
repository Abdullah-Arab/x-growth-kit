import { useLayoutEffect, useRef } from 'react';
import { parseDateKey, type Heatmap as HeatmapData, type HeatLevel, type HeatmapDay } from '@/src/lib';

export const LEVEL_CLASS: Record<HeatLevel, string> = {
  0: 'bg-heat-0',
  1: 'bg-heat-1',
  2: 'bg-heat-2',
  3: 'bg-heat-3',
  4: 'bg-heat-4',
};

const LEVEL_TEXT: Record<HeatLevel, string> = {
  0: 'no activity',
  1: 'some progress',
  2: 'about half done',
  3: 'almost there',
  4: 'all targets hit',
};

const WEEKDAY_LABELS = [
  [1, 'Mon'],
  [3, 'Wed'],
  [5, 'Fri'],
] as const;

// Cells are fluid squares: they grow to fill the card, within these bounds.
const MIN_CELL = 10;
const MAX_CELL = 22;
const GAP = 3;
const LABEL_COL = 30;

export function Heatmap({ data }: { data: HeatmapData }) {
  const scroller = useRef<HTMLDivElement>(null);

  // On narrow screens the grid scrolls; start at the right so today is visible.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [data.today]);

  const weeks: HeatmapDay[][] = [];
  for (let i = 0; i < data.days.length; i += 7) weeks.push(data.days.slice(i, i + 7));

  // Label a column with a month name when that week contains the 1st of the month.
  const monthLabels = weeks.map((week) => {
    const first = week.find((d) => d.date.endsWith('-01'));
    return first ? parseDateKey(first.date).toLocaleDateString(undefined, { month: 'short' }) : null;
  });

  return (
    <div ref={scroller} className="overflow-x-auto">
      <div
        className="mx-auto grid text-[11px] text-muted"
        style={{
          gridTemplateColumns: `${LABEL_COL}px repeat(${weeks.length}, minmax(${MIN_CELL}px, 1fr))`,
          gap: GAP,
          maxWidth: weeks.length * (MAX_CELL + GAP) + LABEL_COL,
        }}
      >
        {monthLabels.map(
          (label, col) =>
            label && (
              <span
                key={`m${col}`}
                className="whitespace-nowrap leading-none"
                style={{ gridColumn: col + 2, gridRow: 1 }}
              >
                {label}
              </span>
            ),
        )}
        {WEEKDAY_LABELS.map(([row, label]) => (
          // Absolutely positioned so label line-height never stretches a row past the cell size.
          <span key={label} className="relative" style={{ gridColumn: 1, gridRow: row + 2 }}>
            <span className="absolute inset-y-0 left-0 flex items-center leading-none">{label}</span>
          </span>
        ))}
        {weeks.map((week, col) =>
          week.map((day, row) => {
            const text = `${formatDay(day.date)}: ${LEVEL_TEXT[day.level]}`;
            return (
              <div
                key={day.date}
                title={text}
                aria-label={text}
                role="img"
                className={`aspect-square rounded-[3px] ${LEVEL_CLASS[day.level]} ${
                  day.date === data.today ? 'ring-1 ring-text/60 ring-offset-1 ring-offset-bg' : ''
                } ${day.level === 0 ? 'outline outline-1 -outline-offset-1 outline-border/60' : ''}`}
                style={{ gridColumn: col + 2, gridRow: row + 2 }}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}

export function HeatmapLegend() {
  return (
    <div className="flex items-center gap-1 text-[11px] text-muted">
      <span className="mr-1">Less</span>
      {([0, 1, 2, 3, 4] as const).map((level) => (
        <span
          key={level}
          title={LEVEL_TEXT[level]}
          className={`size-3 rounded-[3px] ${LEVEL_CLASS[level]} ${
            level === 0 ? 'outline outline-1 -outline-offset-1 outline-border/60' : ''
          }`}
        />
      ))}
      <span className="ml-1">More</span>
    </div>
  );
}

function formatDay(key: string) {
  return parseDateKey(key).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
