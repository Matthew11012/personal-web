"use client";

import { useState, type KeyboardEvent } from "react";
import type { WeeklyBucket } from "@/lib/types";
import { formatDistanceKmCompact, formatHours } from "@/lib/training-derive";
import { ChartInspector, type InspectorFigure, type InspectorRow } from "./chart-inspector";

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

// Swim strongest, run lightest — same tint family as WeeklyVolume's ROWS
// (0.85 / 0.55 / 0.3) so the readout swatches match across pages even
// though this chart's bars are a single combined series, not three rows.
const ROW_LABELS: { key: "swim" | "bike" | "run"; label: string; tint: number }[] = [
  { key: "swim", label: "swim", tint: 0.85 },
  { key: "bike", label: "bike", tint: 0.55 },
  { key: "run", label: "run", tint: 0.3 },
];

/** One combined bar per week — swim + bike + run hours summed, unlike the
 * plot page's three small multiples. WeeklyVolume can't express a single
 * row without changing its shape, so this is a small local chart in the
 * same idiom rather than a reused-but-bent component.
 *
 * Client component: hovering or arrowing through a week highlights that
 * week's bar and drives the shared ChartInspector readout below the chart. */
export function HomeWeeklyVolume({ buckets }: { buckets: WeeklyBucket[] }) {
  // Hooks run unconditionally on every render, so this is declared before
  // the buckets.length guard below rather than after it.
  const [active, setActive] = useState<number | null>(null);

  if (buckets.length === 0) return null;

  const hours = buckets.map((bucket) => bucket.total.seconds / 3600);

  // Guarded the same way as WeeklyVolume: an all-zero window (no activity in
  // the last 12 weeks) would otherwise divide by zero and put NaN into every
  // bar's height attribute.
  const max = Math.max(0, ...hours);
  const safeMax = max > 0 ? max : 1;

  const n = buckets.length;
  const slot = 100 / n;
  const barWidth = slot * (1 - BAR_GAP_RATIO);
  const activeIndex = active !== null && active >= 0 && active < n ? active : null;
  const activeBucket = activeIndex !== null ? buckets[activeIndex] : null;

  const totalSeconds = buckets.reduce((sum, bucket) => sum + bucket.total.seconds, 0);
  const totalMetres = buckets.reduce((sum, bucket) => sum + bucket.total.metres, 0);
  const weekWord = n === 1 ? "week" : "weeks";

  // Same split as WeeklyVolume: a zero-training window has no figures worth
  // the display scale, so the whole sentence folds into the eyebrow and
  // figures stays empty rather than showing a dishonest "0.0h · 0 km".
  const eyebrow = activeBucket
    ? `Week of ${formatWeekLabel(activeBucket.weekStart)}`
    : totalSeconds > 0
      ? `Last ${n} ${weekWord}`
      : `Last ${n} ${weekWord} · no recorded training in this range`;

  const figures: InspectorFigure[] =
    activeBucket || totalSeconds > 0
      ? [
          {
            value: formatHours(activeBucket ? activeBucket.total.seconds : totalSeconds),
            label: "time",
          },
          {
            value: formatDistanceKmCompact(activeBucket ? activeBucket.total.metres : totalMetres),
            label: "distance",
          },
        ]
      : [];

  // All three disciplines are always listed so the rows hold their positions
  // as you arrow across weeks. A discipline with no time shows an em dash
  // rather than "0.0h 0 km", which reads as a measurement rather than an
  // absence. Matches WeeklyVolume on the plot page.
  const inspectorRows: InspectorRow[] | undefined = activeBucket
    ? ROW_LABELS.map((row) => {
        const volume = activeBucket[row.key];
        return {
          label: row.label,
          hours: volume.seconds > 0 ? formatHours(volume.seconds) : "—",
          distance: volume.seconds > 0 ? formatDistanceKmCompact(volume.metres) : "",
          tint: row.tint,
        };
      })
    : undefined;

  function moveActive(next: number) {
    setActive(Math.min(Math.max(next, 0), n - 1));
  }

  // Single tab stop for the whole chart, not one per bar — 12 individually
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
        <svg
          viewBox={`0 0 100 ${VIEW_HEIGHT}`}
          preserveAspectRatio="none"
          className="mt-4 h-10 w-full"
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
          {hours.map((h, i) => {
            const height = (h / safeMax) * VIEW_HEIGHT;
            const x = i * slot + (slot - barWidth) / 2;
            const y = VIEW_HEIGHT - height;
            return (
              <rect
                key={buckets[i].weekStart}
                x={x}
                y={y}
                width={barWidth}
                // A 0-height rect renders nothing, which reads as a gap rather
                // than a zero week — floor it to a hairline sliver.
                height={Math.max(height, 0.6)}
                fill="var(--acc)"
                fillOpacity={activeIndex === i ? 1 : 0.7}
                // Single-property transition (matches the rest of the site's
                // motion vocabulary) — the global prefers-reduced-motion
                // guard in globals.css collapses this to near-instant for
                // users who ask for it.
                className="transition-[fill-opacity] duration-300 ease-out"
              />
            );
          })}
          {/* Full-height, full-slot-width hit targets — bars are often only
              a couple of pixels tall, so hovering the bar itself isn't a
              reasonable target. Transparent fills don't hit-test by default
              in SVG, hence the explicit pointerEvents. */}
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
      <div className="mt-2 flex justify-between">
        <span className="label-mono tracking-[0.1em] text-faint">
          {formatWeekLabel(buckets[0].weekStart)}
        </span>
        <span className="label-mono tracking-[0.1em] text-faint">
          {formatWeekLabel(buckets[buckets.length - 1].weekStart)}
        </span>
      </div>
      <ChartInspector
        eyebrow={eyebrow}
        figures={figures}
        rows={inspectorRows}
        active={activeBucket !== null}
      />
    </div>
  );
}
