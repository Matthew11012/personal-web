"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
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

// Day-of-week track: 7 equal rows for the side day-label column, sized to
// line up with the heatmap's own 7 cell rows without any hand-picked pixel
// offsets. Used at all widths now — see the label-track blocks in the JSX.
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

/** Columns of clearance a month marker needs before the next one.
 *
 * Below `sm` a column is 14px + a 3px gap, so two columns is 34px of run —
 * comfortably more than a three-character label at `label-mono`'s 10px, and
 * wider still on the desktop track. Only the forced opening marker is ever
 * close enough to matter: real month boundaries are at least four weeks apart. */
const MIN_MARKER_GAP_WEEKS = 2;

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
  //
  // But only when there is room for it. A label is ~3 characters wide and a
  // column is 14px below sm, so a marker needs a couple of columns of
  // clearance before the next one or the two render as one run-on word
  // ("AUGSEP"). Real month markers can never collide — months are at least
  // four weeks apart — so this forced opening label is the only one that can,
  // and it is also the one we can most afford to drop: the first marker is
  // then at most two weeks away, close enough to place the leading days.
  if (markers[0] === null) {
    const nextMarker = markers.findIndex((label) => label !== null);
    const hasRoom = nextMarker === -1 || nextMarker >= MIN_MARKER_GAP_WEEKS;
    const opening = paddedDates.slice(0, 7).find((date) => date !== null);
    if (hasRoom && opening) markers[0] = formatMonthLabel(opening);
  }

  return markers;
}

/** GitHub contribution heatmap: one cell per day, filled by pre-computed
 * relative level.
 *
 * Deliberately a CSS grid, not SVG — weeks as columns, days as rows, at
 * every width (matching github.com). Below `sm` there's no room for ~53
 * columns, so instead of transposing (which used to blow the grid out to
 * ~3000px tall — a 14px-wide mobile cell is still 14px *tall* under
 * `aspect-square`) the grid keeps its desktop shape and cell size and
 * scrolls horizontally, anchored to the most recent week on mount. The cell
 * order is always chronological (Mon..Sun per week); `grid-auto-flow: column`
 * reads that as columns-of-7 at every width, so nothing is ever reordered.
 *
 * Client component: hovering or arrowing through a day highlights that
 * day's cell and drives the shared ChartInspector readout below the grid —
 * same interaction model as the training charts. */
export function GithubHeatmap({ days }: { days: ContributionDay[] }) {
  // Hooks run unconditionally on every render, so these are declared before
  // the days.length guard below rather than after it.
  const [active, setActive] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Anchor initial scroll to the most recent week (the right edge) on
  // mount/data change. A no-op on desktop, where the container never
  // overflows so scrollWidth === clientWidth.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [days]);

  // Keeps the keyboard-focused day in view when arrowing scrolls the active
  // cell off the visible (mobile, horizontally-scrolled) area.
  useEffect(() => {
    if (active === null) return;
    cellRefs.current[active]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);

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
  // left/right step by a week (±7), up/down step by a day (±1) — matching
  // the grid's orientation (weeks as columns) at every width now.
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
    // inline max-width because the cap must apply at sm+ only — below sm
    // cells are a flat 14px instead, and the grid is meant to overflow its
    // container and scroll rather than be capped.
    <div className="mt-4" style={{ ["--heatmap-max-w" as string]: `${weeksMaxWidth}px` }}>
      {/* Wraps the month-label row and the day grid together so they scroll
          in lockstep below sm — two independent overflow-x-auto elements
          would drift out of sync on a swipe. overscroll-behavior-x: contain
          stops a swipe at the scroll edge from bubbling into page scroll. */}
      <div
        ref={scrollRef}
        className="overflow-x-auto sm:overflow-x-visible"
        style={{ overscrollBehaviorX: "contain" }}
      >
        {/* w-max below sm is what makes the sticky gutter work. A sticky
            element is constrained by its containing block, so while this row
            was the scrollport's width (342px) the gutter ran out of travel at
            ~310px and sat off-screen at the right-anchored default position.
            Sizing the row to its content (930px) gives sticky the full range.
            sm:w-auto restores the flex-1 + max-w desktop layout untouched. */}
        <div className="flex w-max sm:w-auto">
          {/* Sticky so the day-label gutter below stays aligned with this
              spacer while the weeks scroll underneath it on mobile. bg-bg is
              load-bearing: without it scrolled cells show through. */}
          <div aria-hidden="true" className="sticky left-0 z-10 w-8 shrink-0 bg-bg" />
          <div className="min-w-0 flex-1 sm:max-w-[var(--heatmap-max-w)]">
            {/* Must use the SAME column mechanism as the day grid below, not
                an equivalent-looking one. `minmax(0,1fr)` tracks stretch to
                fill available width and never overflow, so below sm this row
                would render ~358px wide while the fixed-14px day grid spans
                ~898px — the labels would bunch up at the far left of a scroll
                range whose default position is the far RIGHT, i.e. invisible.
                One mechanism, one width, both rows scroll together. */}
            <div
              aria-hidden="true"
              className="grid grid-flow-col auto-cols-[14px] gap-[3px] sm:auto-cols-[minmax(0,1fr)]"
            >
              {monthMarkers.map((label, i) => (
                <div key={i} className="label-mono text-faint">
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-1 flex w-max sm:w-auto">
          <div aria-hidden="true" className="sticky left-0 z-10 w-8 shrink-0 bg-bg">
            <div className="grid h-full gap-[3px]" style={{ gridTemplateRows: AXIS_TRACK }}>
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
                  each row its height from the column width. Below `sm` that
                  width is a flat 14px (no container-width cap to lean on —
                  the grid is meant to overflow and scroll instead): 7 rows x
                  14px + 6 gaps x 3px = 116px tall, ~53 weeks wide ~= 898px —
                  two orders of magnitude shorter than the old transposed
                  layout's ~3000px. At sm+ the width is capped `1fr`
                  (MAX_CELL_PX) as before. */}
              <div
                aria-hidden="true"
                className="grid grid-flow-col auto-cols-[14px] grid-rows-[repeat(7,auto)] gap-[3px] sm:auto-cols-[minmax(0,1fr)]"
              >
                {Array.from({ length: leadingPad }, (_, i) => (
                  <div key={`pad-start-${i}`} className="aspect-square" />
                ))}
                {days.map((day, i) => (
                  <div
                    key={day.date}
                    ref={(el) => {
                      cellRefs.current[i] = el;
                    }}
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
