"use client";

import { m, useReducedMotion } from "motion/react";

/**
 * Four abstract, geometric marks, one per plot slug. All four share one
 * construction: a surveyor's corner frame (the same path in all four,
 * standing in for "this is a plotted field") plus one interior glyph that
 * is unique to the plot. Single stroke weight, no fills, no icons - the
 * family resemblance comes from shared geometry, not a shared subject.
 *
 * viewBox is a fixed 0 0 64 64 square so the mark scales cleanly at the
 * 120-200px unit 5 uses it at, with no vector-effect (non-scaling-stroke
 * breaks Motion's pathLength draw in Chrome - see project-conventions).
 */

const FRAME =
  "M10,16 L10,10 L16,10 M48,10 L54,10 L54,16 M54,48 L54,54 L48,54 M16,54 L10,54 L10,48";

const GLYPHS: Record<string, string[]> = {
  // Engineering: a bearing line with a perpendicular benchmark tick at its
  // midpoint - a surveyor sighting a line, not a blueprint icon.
  engineering: ["M20,44 L44,20", "M29,29 L35,35"],
  // Taekwondo: a single bent line, apex off-center - a struck trajectory,
  // abstracted to two line segments meeting at an angle.
  taekwondo: ["M20,40 L32,20 L44,40"],
  // Triathlon: three open concentric arcs - contour lines / laps, never a
  // literal wave or wheel.
  triathlon: [
    "M24.48,41.26 A8,8 0 0 1 39.52,41.26",
    "M18.84,39.21 A14,14 0 0 1 45.16,39.21",
    "M13.21,37.16 A20,20 0 0 1 50.79,37.16",
  ],
  // Life: a stem with two forking branches - a botanical-diagram
  // abstraction, not a leaf or tree pictogram.
  life: ["M32,46 L32,26", "M32,34 L22,24", "M32,30 L42,20"],
};

export interface PlotMarkProps {
  slug: string;
  accent: string;
  className?: string;
}

export function PlotMark({ slug, accent, className }: PlotMarkProps) {
  const reduced = useReducedMotion() ?? false;
  const glyphs = GLYPHS[slug] ?? [];
  const paths = [FRAME, ...glyphs];

  /* Gated by hand rather than left to MotionConfig reducedMotion="user".
     That setting suppresses transform and layout animations; pathLength is
     neither, so the draw would otherwise still play. And the failure mode of
     relying on it is the worst one available here: if the animation were
     skipped while initial={{ pathLength: 0 }} still applied, the mark would
     render permanently blank. Reduced motion gets plain, fully drawn paths
     with no initial state at all. */
  if (reduced) {
    return (
      <svg
        viewBox="0 0 64 64"
        className={className}
        fill="none"
        stroke={accent}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      stroke={accent}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths.map((d, i) => (
        <m.path
          key={d}
          d={d}
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.7, delay: i * 0.12, ease: "easeInOut" }}
        />
      ))}
    </svg>
  );
}
