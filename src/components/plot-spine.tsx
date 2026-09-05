"use client";

import Link from "next/link";
import {
  m,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useRef } from "react";
import { StagePip } from "./stage-pip";
import type { Stage } from "@/lib/types";

const MotionLink = m.create(Link);

/** Serializable view model the server page hands the client spine — a slim
 * projection of PlotSpineEntry (src/lib/content.ts), not the raw Plot/Note
 * objects, so this component's props stay a flat, purpose-built shape. */
export interface PlotSpineItem {
  slug: string;
  name: string;
  accent: string;
  index: string;
  noteCount: number;
  latestNote?: {
    slug: string;
    title: string;
    stage: Stage;
    date: string;
  };
}

/** One plot's content: index/count row, the plot's own name (linking to its
 * plot page) and its latest note (linking to the note itself). `titleColor`
 * is the only piece that differs between the scrub and the static
 * fallback — a scroll-derived MotionValue in one, a plain accent string in
 * the other — everything else about a plot's presentation is identical so
 * the reader sees the same content whichever version renders. */
function PlotEntry({
  item,
  titleColor,
  accentEmphasis = 1,
}: {
  item: PlotSpineItem;
  titleColor: MotionValue<string> | string;
  /** Drives the decorative accent bar's opacity — a MotionValue in the scrub
   * (brightens as the plot becomes active), a plain 1 in the static list. The
   * plot's colour identity lives here, on a non-text marker, rather than on the
   * title: the raw plot accents fail WCAG contrast as display text on --bg
   * (e.g. life ochre is ~2.8:1), so the title stays --ink/--faint and the
   * colour rides a bar where low contrast is acceptable decoration. */
  accentEmphasis?: MotionValue<number> | number;
}) {
  return (
    <div>
      <m.span
        aria-hidden="true"
        className="mb-3 block h-[3px] w-10"
        style={{ backgroundColor: item.accent, opacity: accentEmphasis }}
      />
      <div className="label-mono flex items-center gap-3 tracking-[0.2em] text-faint">
        <span>{item.index}</span>
        <span>
          {item.noteCount} note{item.noteCount === 1 ? "" : "s"} planted
        </span>
      </div>
      <MotionLink
        href={`/plots/${item.slug}`}
        className="navlink mt-2 inline-block"
        style={{ color: titleColor }}
      >
        <h3 className="idx-title max-w-[18ch]">{item.name}</h3>
      </MotionLink>
      {item.latestNote ? (
        <Link
          href={`/notes/${item.latestNote.slug}`}
          className="navlink mt-3 flex flex-wrap items-center gap-2.5"
        >
          <StagePip stage={item.latestNote.stage} accent={item.accent} />
          <span className="font-body text-[clamp(14px,1.1vw,16px)] text-dim">
            {item.latestNote.title}
          </span>
          <span className="font-mono text-xs text-faint">
            {item.latestNote.date}
          </span>
        </Link>
      ) : (
        <p className="font-body text-[clamp(14px,1.1vw,16px)] text-faint">
          Nothing planted here yet.
        </p>
      )}
    </div>
  );
}

/** One plot inside the desktop scrub. Every derived value (how "active" this
 * plot is, its opacity/scale/title color) comes off the shared scroll
 * MotionValue via useTransform — nothing here calls setState on scroll, so
 * the four plots re-emphasise every frame with zero React re-renders. */
function ScrubPlotEntry({
  item,
  index,
  total,
  progress,
}: {
  item: PlotSpineItem;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const step = 1 / total;
  const center = (index + 0.5) * step;
  /* A triangular pulse centred on this plot's slice of the scroll range:
     1 when the reader is centred on it, falling linearly to 0 a full slice
     away either side. Neighbouring plots' pulses overlap, which is what
     makes the crossfade read as one plot handing off to the next rather
     than a hard cut. */
  const activeAmount = useTransform(progress, (p) =>
    Math.max(0, 1 - Math.abs(p - center) / step),
  );
  const opacity = useTransform(activeAmount, [0, 1], [0.55, 1]);
  const scale = useTransform(activeAmount, [0, 1], [0.97, 1]);
  /* Active plot title crossfades --faint -> --ink, never the plot accent: the
     raw accents fail WCAG contrast as display text on --bg (light) and are
     marginal on dark, so the readable text stays on the neutral tokens (both
     AA-safe) and the plot's colour identity rides the decorative accent bar in
     PlotEntry instead. */
  const titleColor = useTransform(
    activeAmount,
    (v) =>
      `color-mix(in srgb, var(--ink) ${Math.round(v * 100)}%, var(--faint) ${Math.round((1 - v) * 100)}%)`,
  );
  const accentEmphasis = useTransform(activeAmount, [0, 1], [0.3, 1]);

  return (
    <m.div
      style={{ opacity, scale, transformOrigin: "left center" }}
      className="border-t border-hair pt-[clamp(18px,2.4vw,28px)] first:border-t-0 first:pt-0"
    >
      <PlotEntry item={item} titleColor={titleColor} accentEmphasis={accentEmphasis} />
    </m.div>
  );
}

/** Desktop-only sticky-pin scrub: a tall wrapper gives scroll something to
 * consume, the inner sticky box stays pinned in the viewport for that whole
 * distance, and each plot's emphasis walks across it. Mirrors IntroBand's
 * useScroll/useSpring/useTransform recipe (src/components/intro-band.tsx) —
 * same shape, new content. Rendered only when motion isn't reduced; the
 * `hidden md:block` on top of that collapses it to zero height below md, so
 * mobile never pays for this section's scroll distance. */
function ScrubSection({ items }: { items: PlotSpineItem[] }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <div ref={sectionRef} className="relative hidden h-[320vh] md:block">
      <div className="sticky top-0 flex h-screen flex-col justify-center gap-[clamp(18px,2.6vw,32px)]">
        {items.map((item, i) => (
          <ScrubPlotEntry
            key={item.slug}
            item={item}
            index={i}
            total={items.length}
            progress={progress}
          />
        ))}
      </div>
    </div>
  );
}

/** The reduced-motion and mobile fallback: every plot, always at full
 * emphasis, in document order — no pin, no tall spacer, no scrub. */
function CompactList({
  items,
  className = "",
}: {
  items: PlotSpineItem[];
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-[clamp(28px,5vw,44px)] ${className}`}>
      {items.map((item) => (
        <PlotEntry key={item.slug} item={item} titleColor="var(--ink)" />
      ))}
    </div>
  );
}

/**
 * The homepage's four-plot scroll-spine: the headline scroll interaction on
 * desktop, a plain static list everywhere motion shouldn't drive layout.
 *
 * `useScroll`/`useTransform` aren't covered by MotionConfig's
 * `reducedMotion="user"`, so reduced motion is gated by hand here exactly
 * like IntroBand: when reduced, the whole scrub section is skipped (not
 * just visually hidden — no tall wrapper exists at all) and CompactList
 * renders unconditionally instead of only below md.
 */
export function PlotSpine({ plots }: { plots: PlotSpineItem[] }) {
  const reduced = useReducedMotion() ?? false;

  return (
    <div className="mt-[clamp(44px,6vw,72px)]">
      {!reduced && <ScrubSection items={plots} />}
      <CompactList items={plots} className={reduced ? "" : "md:hidden"} />
    </div>
  );
}
