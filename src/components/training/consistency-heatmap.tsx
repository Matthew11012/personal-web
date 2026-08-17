import type { DailyCell } from "@/lib/types";
import { formatHours } from "@/lib/training-derive";

// Monday-indexed day-of-week (0=Mon..6=Sun) from a UTC ISO date, matching
// weekStart's own off-by-one handling in training-derive.ts.
function mondayIndex(iso: string): number {
  const day = new Date(iso).getUTCDay();
  return (day + 6) % 7;
}

function formatDayLabel(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
    timeZone: "UTC",
  });
}

// Opacity steps on --acc, plus a distinct zero state on --rule — never a gap,
// per the "rest days are data too" rule the derive layer already bakes in.
function opacityForRatio(ratio: number): number {
  if (ratio <= 0.33) return 0.3;
  if (ratio <= 0.66) return 0.6;
  return 0.9;
}

/** Consistency heatmap: one cell per day, filled by total training time.
 *
 * Deliberately a CSS grid, not SVG — the desktop layout (weeks as columns)
 * and the mobile layout (weeks as rows, so nothing overflows a 375px
 * viewport horizontally) are both just `grid-auto-flow` + template swaps at
 * a breakpoint. In SVG the same transpose would be a full re-layout of every
 * rect's x/y. The cell order below is always chronological (Mon..Sun per
 * week) — auto-flow: column reads that as columns-of-7; auto-flow: row (the
 * mobile default) reads the same order as rows-of-7. No reordering needed. */
export function ConsistencyHeatmap({ cells }: { cells: DailyCell[] }) {
  if (cells.length === 0) return null;

  const leadingPad = mondayIndex(cells[0].date);
  const trailingPad = (7 - ((leadingPad + cells.length) % 7)) % 7;

  const max = Math.max(0, ...cells.map((cell) => cell.total.seconds));
  const activeDays = cells.filter((cell) => cell.total.seconds > 0).length;
  const totalHoursLabel = formatHours(cells.reduce((sum, cell) => sum + cell.total.seconds, 0));

  return (
    <div className="mt-[clamp(28px,4vw,44px)]">
      <div className="label-mono tracking-[0.18em] text-faint">Consistency</div>
      {/* Tracks are `auto`, never `1fr`: the container has no explicit height,
          and an empty div has no intrinsic height, so fr-sized rows collapse to
          zero and the grid renders invisible. The cells carry `aspect-square`,
          which gives each row its height from the column width — and keeps the
          cells square in both orientations. */}
      <div
        role="img"
        aria-label={`Daily training consistency over ${cells.length} days: ${activeDays} active days, ${totalHoursLabel} total.`}
        className="mt-4 grid auto-rows-auto grid-cols-[repeat(7,minmax(0,1fr))] gap-[3px] sm:grid-flow-col sm:auto-cols-[minmax(0,1fr)] sm:grid-cols-none sm:grid-rows-[repeat(7,auto)]"
      >
        {Array.from({ length: leadingPad }, (_, i) => (
          <div key={`pad-start-${i}`} aria-hidden="true" className="aspect-square" />
        ))}
        {cells.map((cell) => {
          const ratio = max > 0 ? cell.total.seconds / max : 0;
          const style =
            cell.total.seconds > 0
              ? { backgroundColor: "var(--acc)", opacity: opacityForRatio(ratio) }
              : { backgroundColor: "var(--rule)" };
          return (
            <div
              key={cell.date}
              className="aspect-square"
              title={`${formatDayLabel(cell.date)}: ${cell.total.seconds > 0 ? formatHours(cell.total.seconds) : "rest"}`}
              style={style}
            />
          );
        })}
        {Array.from({ length: trailingPad }, (_, i) => (
          <div key={`pad-end-${i}`} aria-hidden="true" className="aspect-square" />
        ))}
      </div>
      <p className="sr-only">
        {activeDays} of {cells.length} days trained, {totalHoursLabel} total.
      </p>
    </div>
  );
}
