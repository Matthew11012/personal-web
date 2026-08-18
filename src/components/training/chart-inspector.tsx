"use client";

import { m } from "motion/react";
import { EASE } from "@/lib/motion";

export interface InspectorFigure {
  value: string; // "6.2h" — already formatted by the caller
  label: string; // "time"
}

export interface InspectorRow {
  label: string; // "swim"
  hours: string; // "1.2h" — already formatted by the caller
  distance: string; // "3.1 km" — already formatted by the caller
  tint?: number; // opacity against --acc, ties the row's swatch to its bar
}

/** Shared readout for the training charts: an idle summary of the whole
 * range, or a per-week/per-day breakdown once something is active. Purely
 * presentational — the caller owns all state and formatting, this only lays
 * it out in three tiers (eyebrow context, headline figures, discipline
 * rows) so a hovered bar's numbers get their own scale instead of being
 * welded into one flat sentence. Shared by weekly-volume, the home band and
 * the heatmap, so the props stay serialisable and chart-agnostic. */
export function ChartInspector({
  eyebrow,
  figures,
  rows,
  active,
}: {
  eyebrow: string;
  figures: InspectorFigure[];
  rows?: InspectorRow[];
  active: boolean;
}) {
  return (
    // min-h reserves the tallest state so moving between idle and active
    // never reflows the page. Measured, not estimated, against the classes
    // actually used below:
    // mobile — pt-3 (12) + eyebrow line (16.5) + mt-2 (8) + figures column
    // (22 value + gap-1 4 + 16.5 caption = 42.5, using the clamp's 22px
    // floor) + mt-2 (8) + two stacked rows of three, grid-cols-2 (2x16.5 +
    // gap-y-1 4 = 37) = 124px, +2px buffer.
    // sm+ — same stack, but the figure value can reach the clamp's 30px
    // ceiling on wide viewports (30 + 4 + 16.5 = 50.5) while rows collapse
    // to one wrapped line (16.5): 12 + 16.5 + 8 + 50.5 + 8 + 16.5 = 111.5px,
    // +2px buffer.
    <div className="mt-2 min-h-[126px] border-t border-rule pt-3 sm:min-h-[114px]">
      {/* tabular-nums throughout: these figures change on every arrow key and
          every hover, and proportional digits make the whole line shuffle
          sideways as they do. */}
      <div aria-live="polite" className="tabular-nums">
        <p
          className={
            "label-mono tracking-[0.1em] transition-colors duration-300" +
            (active ? " text-[var(--acc)]" : " text-faint")
          }
        >
          {eyebrow}
        </p>
        {figures.length > 0 && (
          // Keyed on eyebrow so this block remounts and fades in whenever
          // the active bar changes. Deliberately short — users arrow across
          // 30+ weeks, and a slow fade would strobe rather than read as a
          // transition.
          <m.div
            key={eyebrow}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-2"
          >
            {figures.map((figure) => (
              <div key={figure.label} className="flex flex-col gap-1">
                <span className="inspector-num">{figure.value}</span>
                <span className="label-mono tracking-[0.1em] text-faint">{figure.label}</span>
              </div>
            ))}
          </m.div>
        )}
        {rows && rows.length > 0 && (
          // Two columns on narrow screens rather than three stacked rows:
          // stacking reserved ~92px, most of it empty in the idle state, which
          // read as a hole between the chart and whatever followed it.
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:flex sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-1">
            {rows.map((row) => (
              <div key={row.label} className="label-mono flex items-center gap-2 tracking-[0.1em]">
                {/* Small swatch on --acc, tinted to match the bar/day this
                    row was read off — ties the breakdown back to what's
                    highlighted above it rather than floating unattached. */}
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0"
                  style={{ backgroundColor: "var(--acc)", opacity: row.tint ?? 1 }}
                />
                <span className="text-faint">{row.label}</span>
                <span className="text-ink">{row.hours}</span>
                <span className="text-ink">{row.distance}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
