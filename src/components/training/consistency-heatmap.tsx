"use client";

import { useState, type CSSProperties, type KeyboardEvent } from "react";
import type { DailyCell, Discipline } from "@/lib/types";
import {
  formatDistanceKmCompact,
  formatHours,
  HEATMAP_BANDS,
  heatmapBand,
  streakStats,
} from "@/lib/training-derive";
import { ChartInspector, type InspectorRow } from "./chart-inspector";

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

function formatMonthLabel(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", timeZone: "UTC" });
}

const DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

// Track sizing shared by the mobile and desktop label tracks so they can be
// separate grid elements (they must be — one is a header row, one is a side
// column, in each orientation) and still line up with the heatmap's own
// tracks without any hand-picked pixel offsets. See the two label-track
// blocks in the JSX below for how each dimension gets matched.
const AXIS_TRACK = "repeat(7, minmax(0, 1fr))";

// Strength of --acc for bands 1..5, as a percentage mixed against
// transparent (0 is rest, handled separately — see the render loop). Spaced
// for clearly separated lightness rather than the old 0.3/0.6/0.9: the
// previous bottom step sat almost on top of rest's --rule fill, which was the
// actual root cause of the heatmap reading as noise. Rest no longer has a
// fill at all, which also helps.
//
// Mixed into the background colour rather than set as the element's `opacity`
// on purpose: `opacity` fades the whole box including its outline, so the
// active-cell marker would render at 25% on a light day — exactly the case it
// exists to cover.
const BAND_STRENGTH = [0, 25, 45, 65, 85, 100];

function bandFill(band: number): string {
  return `color-mix(in srgb, var(--acc) ${BAND_STRENGTH[band]}%, transparent)`;
}

/** Beyond this many weeks, month labels start colliding in the available
 * width and we keep only every other one.
 *
 * There's no layout measurement available at render time here, so this is a
 * coarse index-based thinning rather than a measured one. The number comes
 * from the collision arithmetic: months sit ~4.3 weeks apart, so on a ~900px
 * desktop chart the gap between labels is 4.3/weeks × 900px. A three-letter
 * month needs ~40px, which is only breached past ~95 weeks. Set at 78 (18
 * months) to leave headroom on narrower containers — the previous value of 30
 * thinned a single season's worth of data that had ~110px between labels. */
const DENSE_WEEK_THRESHOLD = 78;

/** One label per week-of-the-grid: the month abbreviation if that week
 * contains the 1st of a month, else null. Identical computation in both
 * grid orientations — only where it's rendered (a row above vs. a column
 * beside the grid) differs, per the padded chronological cell order shared
 * with the heatmap itself. */
function computeMonthMarkers(paddedDates: (string | null)[], weeksCount: number): (string | null)[] {
  const markers: (string | null)[] = new Array(weeksCount).fill(null);
  let seen = 0;
  for (let week = 0; week < weeksCount; week++) {
    const weekDates = paddedDates.slice(week * 7, week * 7 + 7);
    const firstOfMonth = weekDates.find((date) => date !== null && new Date(date).getUTCDate() === 1);
    if (!firstOfMonth) continue;
    const keep = weeksCount <= DENSE_WEEK_THRESHOLD || seen % 2 === 0;
    if (keep) markers[week] = formatMonthLabel(firstOfMonth);
    seen += 1;
  }
  return markers;
}

const DISCIPLINES: Discipline[] = ["swim", "bike", "run"];

/** Consistency heatmap: one cell per day, filled by total training time.
 *
 * Deliberately a CSS grid, not SVG — the desktop layout (weeks as columns)
 * and the mobile layout (weeks as rows, so nothing overflows a 375px
 * viewport horizontally) are both just `grid-auto-flow` + template swaps at
 * a breakpoint. In SVG the same transpose would be a full re-layout of every
 * rect's x/y. The cell order below is always chronological (Mon..Sun per
 * week) — auto-flow: column reads that as columns-of-7; auto-flow: row (the
 * mobile default) reads the same order as rows-of-7. No reordering needed.
 *
 * Client component: hovering or arrowing through a day highlights that
 * day's cell and drives the shared ChartInspector readout below the grid —
 * same interaction model as WeeklyVolume. */
export function ConsistencyHeatmap({ cells }: { cells: DailyCell[] }) {
  // Hooks run unconditionally on every render, so this is declared before
  // the cells.length guard below rather than after it.
  const [active, setActive] = useState<number | null>(null);

  if (cells.length === 0) return null;

  const leadingPad = mondayIndex(cells[0].date);
  const trailingPad = (7 - ((leadingPad + cells.length) % 7)) % 7;

  const paddedDates: (string | null)[] = [
    ...new Array(leadingPad).fill(null),
    ...cells.map((cell) => cell.date),
    ...new Array(trailingPad).fill(null),
  ];
  const weeksCount = paddedDates.length / 7;
  const monthMarkers = computeMonthMarkers(paddedDates, weeksCount);
  // Same template string used as columns (desktop month header row, above
  // the heatmap's own week-columns) and as rows (mobile month side column,
  // beside the heatmap's own week-rows) — one week axis, two orientations.
  const weeksTrackTemplate = `repeat(${weeksCount}, minmax(0, 1fr))`;

  const stats = streakStats(cells);
  const totalHoursLabel = formatHours(cells.reduce((sum, cell) => sum + cell.total.seconds, 0));
  const statLine =
    stats.activeDays > 0
      ? `${stats.activeDays} of ${stats.totalDays} days trained · longest streak ${stats.longestStreak} day${
          stats.longestStreak === 1 ? "" : "s"
        } · ${formatHours(stats.meanSecondsPerActiveDay)} per active day`
      : `0 of ${stats.totalDays} days trained in this range`;

  const n = cells.length;
  const activeIndex = active !== null && active >= 0 && active < n ? active : null;
  const activeCell = activeIndex !== null ? cells[activeIndex] : null;

  const headline = activeCell
    ? activeCell.total.seconds > 0
      ? `${formatDayLabel(activeCell.date)} · ${formatHours(activeCell.total.seconds)} · ${formatDistanceKmCompact(activeCell.total.metres)}`
      : `${formatDayLabel(activeCell.date)} · rest`
    : statLine;

  // Unlike the weekly chart, most days only have one discipline — empty ones
  // are skipped here rather than shown as zeroed rows.
  const inspectorRows: InspectorRow[] | undefined =
    activeCell && activeCell.total.seconds > 0
      ? DISCIPLINES.filter((discipline) => activeCell[discipline].seconds > 0).map((discipline) => ({
          label: discipline,
          hours: formatHours(activeCell[discipline].seconds),
          distance: formatDistanceKmCompact(activeCell[discipline].metres),
        }))
      : undefined;

  function moveActive(next: number) {
    setActive(Math.min(Math.max(next, 0), n - 1));
  }

  // Single tab stop for the whole grid, not one per day — 200+ individually
  // tabbable cells would trap keyboard users. Arrow keys are 2D here:
  // left/right step by a week (±7), up/down step by a day (±1). This mapping
  // matches the desktop orientation (weeks as columns, so left/right really
  // does move sideways); under the mobile transpose (weeks as rows) the same
  // keys move visually up/down instead of sideways. That's an accepted
  // trade — the keys stay tied to "a week" and "a day" rather than to
  // whichever axis happens to be horizontal — not an oversight.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        moveActive(active === null ? 0 : active + 7);
        break;
      case "ArrowLeft":
        event.preventDefault();
        moveActive(active === null ? n - 1 : active - 7);
        break;
      case "ArrowDown":
        event.preventDefault();
        moveActive(active === null ? 0 : active + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveActive(active === null ? n - 1 : active - 1);
        break;
      case "Home":
        event.preventDefault();
        moveActive(0);
        break;
      case "End":
        event.preventDefault();
        moveActive(n - 1);
        break;
      case "Escape":
        event.preventDefault();
        setActive(null);
        break;
      default:
        break;
    }
  }

  function cellStyle(seconds: number, isActive: boolean): CSSProperties {
    // Absolute duration bands, not seconds-over-max: a shade must mean the
    // same duration in every range and on both pages, so switching the
    // range control from "All" to "12w" must never recolour a single cell —
    // only which cells exist changes. heatmapBand/HEATMAP_BANDS are the one
    // shared source of truth for both this fill and the legend below.
    const band = heatmapBand(seconds);
    const style: CSSProperties = {};
    if (band > 0) {
      style.backgroundColor = bandFill(band);
    }
    // The active-cell marker has to read on both a filled cell and a
    // borderless rest cell, so it can't just be an opacity bump — an
    // outline sits outside the box in its own layer either way.
    if (isActive) {
      style.outline = "1px solid var(--ink)";
      style.outlineOffset = "1px";
    }
    return style;
  }

  return (
    <div className="mt-[clamp(28px,4vw,44px)]">
      <div className="label-mono tracking-[0.18em] text-faint">Consistency</div>
      <p className="label-mono mt-2 tracking-[0.05em] text-dim">{statLine}</p>

      {/* Two responsive tracks, computed once from the same padded,
          chronological week chunks as the heatmap itself:
          - a day-of-week track (Mo..Su, 7 entries) — a header row on mobile
            (days are columns there), a side column on desktop (days are
            rows there).
          - a month-marker track (one entry per week) — a side column on
            mobile, a header row on desktop, inverted from the day track.
          Each track reuses the heatmap's own track sizing (AXIS_TRACK / the
          weeks-count template) rather than being positioned by hand, so
          they line up with the grid automatically. The corner spacer keeps
          the header row offset by exactly the side column's width. */}
      <div className="mt-4">
        <div className="flex">
          <div aria-hidden="true" className="w-8 shrink-0" />
          <div className="min-w-0 flex-1">
            <div
              aria-hidden="true"
              className="grid gap-[3px] sm:hidden"
              style={{ gridTemplateColumns: AXIS_TRACK }}
            >
              {DAY_LABELS.map((label, i) => (
                <div key={i} className="label-mono text-center text-faint">
                  {label}
                </div>
              ))}
            </div>
            <div
              aria-hidden="true"
              className="hidden gap-[3px] sm:grid"
              style={{ gridTemplateColumns: weeksTrackTemplate }}
            >
              {monthMarkers.map((label, i) => (
                <div key={i} className="label-mono text-faint">
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-1 flex">
          <div aria-hidden="true" className="w-8 shrink-0">
            <div
              className="grid h-full gap-[3px] sm:hidden"
              style={{ gridTemplateRows: weeksTrackTemplate }}
            >
              {monthMarkers.map((label, i) => (
                <div key={i} className="label-mono flex items-center text-faint">
                  {label}
                </div>
              ))}
            </div>
            <div
              className="hidden h-full gap-[3px] sm:grid"
              style={{ gridTemplateRows: AXIS_TRACK }}
            >
              {DAY_LABELS.map((label, i) => (
                <div key={i} className="label-mono flex items-center text-faint">
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            {/* Single tab stop for the whole grid; the visual grid itself is
                aria-hidden below, with the group's aria-label and the
                sr-only paragraph carrying the accessible description. */}
            <div
              tabIndex={0}
              role="group"
              aria-label={`Daily training consistency over ${n} days. Use left and right arrow keys to inspect the previous or next week, up and down for the previous or next day, Home and End to jump to the first or last day, Escape to clear.`}
              onKeyDown={handleKeyDown}
              onMouseLeave={() => setActive(null)}
              onBlur={() => setActive(null)}
              // No outline-none here: the :focus-visible ring in globals.css
              // is the only signal this grid is keyboard-operable at all.
            >
              {/* Tracks are `auto`, never `1fr`: the container has no explicit
                  height, and an empty div has no intrinsic height, so
                  fr-sized rows collapse to zero and the grid renders
                  invisible. The cells carry `aspect-square`, which gives
                  each row its height from the column width — and keeps the
                  cells square in both orientations. */}
              <div
                aria-hidden="true"
                className="grid auto-rows-auto grid-cols-[repeat(7,minmax(0,1fr))] gap-[3px] sm:grid-flow-col sm:auto-cols-[minmax(0,1fr)] sm:grid-cols-none sm:grid-rows-[repeat(7,auto)]"
              >
                {Array.from({ length: leadingPad }, (_, i) => (
                  <div key={`pad-start-${i}`} className="aspect-square" />
                ))}
                {cells.map((cell, i) => (
                  <div
                    key={cell.date}
                    className={
                      "aspect-square transition-[background-color] duration-300 ease-out" +
                      (heatmapBand(cell.total.seconds) === 0 ? " border border-rule" : "")
                    }
                    style={cellStyle(cell.total.seconds, activeIndex === i)}
                    onMouseEnter={() => setActive(i)}
                  />
                ))}
                {Array.from({ length: trailingPad }, (_, i) => (
                  <div key={`pad-end-${i}`} className="aspect-square" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend renders straight off HEATMAP_BANDS, the same array
          heatmapBand() indexes into for the cell fills above — the two
          can't drift out of sync since there's only one source of the
          band thresholds and labels. */}
      <div className="label-mono mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-faint">
        {HEATMAP_BANDS.map((band, i) => (
          <div key={band.label} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={"h-2.5 w-2.5" + (i === 0 ? " border border-rule" : "")}
              style={i === 0 ? undefined : { backgroundColor: bandFill(i) }}
            />
            <span>{band.label}</span>
          </div>
        ))}
      </div>

      <ChartInspector headline={headline} rows={inspectorRows} />

      <p className="sr-only">
        {stats.activeDays} of {cells.length} days trained, {totalHoursLabel} total.
      </p>
    </div>
  );
}
