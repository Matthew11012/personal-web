"use client";

import { useState, type CSSProperties, type KeyboardEvent } from "react";
import type { ContributionDay } from "@/lib/github";
import { ChartInspector, type InspectorFigure } from "@/components/training/chart-inspector";

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

// Gap between cells, in px. Declared here because the desktop width cap below
// has to account for it, and the two must not drift from the `gap-[3px]`
// utility on the grid itself.
const CELL_GAP_PX = 3;

/** Largest a cell is allowed to get on the desktop (weeks-as-columns) layout.
 *
 * Without a cap, `auto-cols-[minmax(0,1fr)]` divides the full width by the
 * number of weeks, so a SHORTER range produces WIDER columns — and
 * `aspect-square` turns that width straight into height. At the 4-week preset
 * that meant ~5 columns across the page, cells around 250px, and a grid
 * roughly 1750px tall that pushed the readout below the fold: you had to
 * scroll away from the cell you were hovering to read what it said.
 *
 * 40px is above the ~33px cells the full-history range already produces at a
 * typical desktop width, so the long ranges are unaffected and only the short
 * ones stop ballooning. It also fixes the grid's maximum height at
 * 7 x 40 + 6 x 3 = 298px regardless of range. Cells staying one size across
 * ranges is the same property this component's fixed 365-day window already
 * has — it just also protects against a future caller passing a shorter one. */
const MAX_CELL_PX = 40;

// Strength of --acc for levels 0..4, as a percentage mixed against
// transparent. Level 0 is a rest day, handled separately below with a border
// and no fill — see the render loop.
const LEVEL_STRENGTH = [0, 30, 55, 78, 100];

function levelFill(level: number): string {
  return `color-mix(in srgb, var(--acc) ${LEVEL_STRENGTH[level]}%, transparent)`;
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

  // A range that opens mid-month contains no boundary for the month it starts
  // in, so the leading weeks would sit unlabelled — the reader has to count
  // backwards from the first marker to place them. Label the opening week with
  // its own month unless it already earned a marker.
  if (markers[0] === null) {
    const opening = paddedDates.slice(0, 7).find((date) => date !== null);
    if (opening) markers[0] = formatMonthLabel(opening);
  }

  return markers;
}

/** GitHub contribution heatmap: one cell per day, filled by pre-computed
 * relative level.
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
 * same interaction model as the training charts. */
export function GithubHeatmap({ days }: { days: ContributionDay[] }) {
  // Hooks run unconditionally on every render, so this is declared before
  // the days.length guard below rather than after it.
  const [active, setActive] = useState<number | null>(null);

  if (days.length === 0) return null;

  const leadingPad = mondayIndex(days[0].date);
  const trailingPad = (7 - ((leadingPad + days.length) % 7)) % 7;

  const paddedDates: (string | null)[] = [
    ...new Array(leadingPad).fill(null),
    ...days.map((day) => day.date),
    ...new Array(trailingPad).fill(null),
  ];
  const weeksCount = paddedDates.length / 7;
  const monthMarkers = computeMonthMarkers(paddedDates, weeksCount);
  // Same template string used as columns (desktop month header row, above
  // the heatmap's own week-columns) and as rows (mobile month side column,
  // beside the heatmap's own week-rows) — one week axis, two orientations.
  const weeksTrackTemplate = `repeat(${weeksCount}, minmax(0, 1fr))`;
  // Applied to the month track and the grid alike (sm+ only), so capping the
  // cells can't desynchronise the labels from the columns they mark.
  const weeksMaxWidth = weeksCount * MAX_CELL_PX + (weeksCount - 1) * CELL_GAP_PX;

  const total = days.reduce((sum, day) => sum + day.count, 0);

  const n = days.length;
  const activeIndex = active !== null && active >= 0 && active < n ? active : null;
  const activeDay = activeIndex !== null ? days[activeIndex] : null;

  const eyebrow = activeDay ? formatDayLabel(activeDay.date) : `${total} contributions`;

  const figures: InspectorFigure[] = activeDay
    ? [{ value: String(activeDay.count), label: activeDay.count === 1 ? "contribution" : "contributions" }]
    : [];

  function moveActive(next: number) {
    setActive(Math.min(Math.max(next, 0), n - 1));
  }

  // Single tab stop for the whole grid, not one per day — 300+ individually
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

  function cellStyle(level: number, isActive: boolean): CSSProperties {
    const style: CSSProperties = {};
    if (level > 0) {
      style.backgroundColor = levelFill(level);
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
    // --heatmap-max-w caps the desktop grid so short ranges don't inflate
    // their cells (see MAX_CELL_PX). It's a custom property rather than an
    // inline max-width because the cap must apply at sm+ only — on mobile
    // the week axis runs vertically, where the column count is always 7 and
    // the cells never inflate.
    <div className="mt-4" style={{ ["--heatmap-max-w" as string]: `${weeksMaxWidth}px` }}>
      <div className="flex">
        <div aria-hidden="true" className="w-8 shrink-0" />
        <div className="min-w-0 flex-1 sm:max-w-[var(--heatmap-max-w)]">
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
          <div className="grid h-full gap-[3px] sm:hidden" style={{ gridTemplateRows: weeksTrackTemplate }}>
            {monthMarkers.map((label, i) => (
              <div key={i} className="label-mono flex items-center text-faint">
                {label}
              </div>
            ))}
          </div>
          <div className="hidden h-full gap-[3px] sm:grid" style={{ gridTemplateRows: AXIS_TRACK }}>
            {DAY_LABELS.map((label, i) => (
              <div key={i} className="label-mono flex items-center text-faint">
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1 sm:max-w-[var(--heatmap-max-w)]">
          {/* Single tab stop for the whole grid; the visual grid itself is
              aria-hidden below, with the group's aria-label and the
              sr-only paragraph carrying the accessible description. */}
          <div
            tabIndex={0}
            role="group"
            aria-label={`GitHub contributions over the last ${n} days. Use left and right arrow keys to inspect the previous or next week, up and down for the previous or next day, Home and End to jump to the first or last day, Escape to clear.`}
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
              {days.map((day, i) => (
                <div
                  key={day.date}
                  className={
                    "aspect-square transition-[background-color] duration-300 ease-out" +
                    (day.level === 0 ? " border border-rule" : "")
                  }
                  style={cellStyle(day.level, activeIndex === i)}
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

      <div className="label-mono mt-3 flex flex-wrap items-center gap-2 text-faint">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span
            key={level}
            aria-hidden="true"
            className={"h-2.5 w-2.5" + (level === 0 ? " border border-rule" : "")}
            style={level === 0 ? undefined : { backgroundColor: levelFill(level) }}
          />
        ))}
        <span>More</span>
      </div>

      <ChartInspector eyebrow={eyebrow} figures={figures} rows={undefined} active={activeDay !== null} />

      <p className="sr-only">
        {total} contributions over {days.length} days
      </p>
    </div>
  );
}
