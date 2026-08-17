"use client";

import { useState, type KeyboardEvent } from "react";
import type { WeeklyBucket } from "@/lib/types";
import { formatDistanceKmCompact, formatHours } from "@/lib/training-derive";
import { ChartInspector, type InspectorRow } from "./chart-inspector";

type Row = {
  key: "swim" | "bike" | "run";
  label: string;
  opacity: number;
};

// Swim strongest, run lightest — an arbitrary but consistent ordering so the
// three rows read as one family rather than three unrelated charts. Opacity
// on --acc (never a hardcoded colour) is what keeps this working in dark mode.
const ROWS: Row[] = [
  { key: "swim", label: "Swim", opacity: 0.85 },
  { key: "bike", label: "Bike", opacity: 0.55 },
  { key: "run", label: "Run", opacity: 0.3 },
];

const VIEW_HEIGHT = 40;
const BAR_GAP_RATIO = 0.25; // fraction of each slot left as gap between bars
const MARKER_WIDTH = 0.5; // viewBox units — a hairline regardless of chart width

function formatWeekLabel(iso: string): string {
  // weekStart is always a UTC-midnight ISO date; format with UTC accessors so
  // this never drifts a week relative to the bucket it's labelling.
  const date = new Date(iso);
  const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  return `${month} ${date.getUTCDate()}`;
}

/** Three small-multiple rows (swim/bike/run) sharing one x-axis and one
 * y-scale, rendered as hand-rolled SVG bars. Hours, not distance — the only
 * unit that means anything compared across disciplines.
 *
 * Client component: hovering or arrowing through a week highlights that
 * week's column in all three rows at once and drives the shared
 * ChartInspector readout below the chart. */
export function WeeklyVolume({ buckets }: { buckets: WeeklyBucket[] }) {
  // Hooks run unconditionally on every render, so this is declared before
  // the buckets.length guard below rather than after it.
  const [active, setActive] = useState<number | null>(null);

  if (buckets.length === 0) return null;

  const hoursByRow = ROWS.map((row) => buckets.map((bucket) => bucket[row.key].seconds / 3600));

  // One max shared across all three rows so they stay comparable to each
  // other. Guarded: an all-zero range would otherwise divide by zero and put
  // NaN into every bar's height attribute.
  const max = Math.max(0, ...hoursByRow.flat());
  const safeMax = max > 0 ? max : 1;

  const n = buckets.length;
  const slot = 100 / n;
  const barWidth = slot * (1 - BAR_GAP_RATIO);
  const activeIndex = active !== null && active >= 0 && active < n ? active : null;
  const activeBucket = activeIndex !== null ? buckets[activeIndex] : null;

  const totalsText = ROWS.map(
    (row, i) => `${row.label.toLowerCase()} ${formatHours(hoursByRow[i].reduce((a, b) => a + b, 0) * 3600)}`,
  ).join(", ");

  const totalSeconds = buckets.reduce((sum, bucket) => sum + bucket.total.seconds, 0);
  const totalMetres = buckets.reduce((sum, bucket) => sum + bucket.total.metres, 0);
  const weekWord = n === 1 ? "week" : "weeks";
  const idleHeadline =
    totalSeconds > 0
      ? `${n} ${weekWord} · ${formatHours(totalSeconds)} · ${formatDistanceKmCompact(totalMetres)}`
      : `${n} ${weekWord} · no recorded training in this range`;

  const headline = activeBucket
    ? `Week of ${formatWeekLabel(activeBucket.weekStart)} · ${formatHours(activeBucket.total.seconds)} · ${formatDistanceKmCompact(activeBucket.total.metres)}`
    : idleHeadline;

  // All three disciplines are always listed, unlike the heatmap's per-day
  // readout: the rows hold their positions as you arrow across weeks, so the
  // eye can track one discipline without re-reading the labels. A week with
  // no swimming shows an em dash rather than "0.0h 0 km", which reads as a
  // measurement rather than an absence.
  const inspectorRows: InspectorRow[] | undefined = activeBucket
    ? ROWS.map((row) => {
        const volume = activeBucket[row.key];
        return {
          label: row.label.toLowerCase(),
          hours: volume.seconds > 0 ? formatHours(volume.seconds) : "—",
          distance: volume.seconds > 0 ? formatDistanceKmCompact(volume.metres) : "",
        };
      })
    : undefined;

  function moveActive(next: number) {
    setActive(Math.min(Math.max(next, 0), n - 1));
  }

  // Single tab stop for the whole chart, not one per bar — 30+ individually
  // tabbable weeks would trap keyboard users. Arrow keys step the active
  // week; Home/End jump to the ends; Escape clears back to the idle summary.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        moveActive(active === null ? 0 : active + 1);
        break;
      case "ArrowLeft":
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

  return (
    <div className="mt-[clamp(28px,4vw,44px)]">
      <div className="label-mono tracking-[0.18em] text-faint">Weekly volume</div>
      <div
        className="mt-4 flex flex-col gap-4"
        tabIndex={0}
        // No outline-none here: the :focus-visible ring in globals.css is the
        // only signal that this chart is keyboard-operable at all, and it
        // fires on keyboard focus only, never on a mouse click.
        role="group"
        aria-label={`Weekly training volume, ${n} ${weekWord}. Use left and right arrow keys to inspect a week, Home and End to jump to the first or last week, Escape to clear.`}
        onKeyDown={handleKeyDown}
        onMouseLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
      >
        {ROWS.map((row, rowIndex) => (
          <div key={row.key} className="flex items-center gap-4">
            <div className="label-mono w-10 shrink-0 tracking-[0.1em] text-faint">
              {row.label}
            </div>
            <svg
              viewBox={`0 0 100 ${VIEW_HEIGHT}`}
              preserveAspectRatio="none"
              className="h-8 w-full"
              aria-hidden="true"
            >
              {activeIndex !== null && (
                <rect
                  x={activeIndex * slot + slot / 2 - MARKER_WIDTH / 2}
                  y={0}
                  width={MARKER_WIDTH}
                  height={VIEW_HEIGHT}
                  fill="var(--rule)"
                />
              )}
              {hoursByRow[rowIndex].map((hours, i) => {
                const height = (hours / safeMax) * VIEW_HEIGHT;
                const x = i * slot + (slot - barWidth) / 2;
                const y = VIEW_HEIGHT - height;
                return (
                  <rect
                    key={buckets[i].weekStart}
                    x={x}
                    y={y}
                    width={barWidth}
                    // A 0-height rect renders nothing, which reads as a gap
                    // rather than a zero week — floor it to a hairline sliver.
                    height={Math.max(height, 0.6)}
                    fill="var(--acc)"
                    fillOpacity={activeIndex === i ? 1 : row.opacity}
                    // Single-property transition (matches the rest of the
                    // site's motion vocabulary) — the global
                    // prefers-reduced-motion guard in globals.css collapses
                    // this to near-instant for users who ask for it.
                    className="transition-[fill-opacity] duration-300 ease-out"
                  />
                );
              })}
              {/* Full-height, full-slot-width hit targets — bars are often
                  only a couple of pixels tall, so hovering the bar itself
                  isn't a reasonable target. Transparent fills don't hit-test
                  by default in SVG, hence the explicit pointerEvents. */}
              {buckets.map((bucket, i) => (
                <rect
                  key={`hit-${bucket.weekStart}`}
                  x={i * slot}
                  y={0}
                  width={slot}
                  height={VIEW_HEIGHT}
                  fill="transparent"
                  style={{ pointerEvents: "all" }}
                  onMouseEnter={() => setActive(i)}
                />
              ))}
            </svg>
          </div>
        ))}
      </div>
      <div className="mt-2 ml-14 flex justify-between">
        <span className="label-mono tracking-[0.1em] text-faint">
          {formatWeekLabel(buckets[0].weekStart)}
        </span>
        <span className="label-mono tracking-[0.1em] text-faint">
          {formatWeekLabel(buckets[buckets.length - 1].weekStart)}
        </span>
      </div>
      <ChartInspector headline={headline} rows={inspectorRows} />
      <p className="sr-only">Weekly totals: {totalsText}.</p>
    </div>
  );
}
