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
import { BleedType } from "./bleed-type";
import { PlotMark } from "./plot-mark";
import { StagePip } from "./stage-pip";
import type { Stage } from "@/lib/types";

const MotionLink = m.create(Link);

/* The pan's geometry, solved once rather than measured at runtime. Each
   panel is PANEL_VW wide with no gap between them (a gap would break the
   percentage math below), so the track is PANEL_COUNT * PANEL_VW wide. The
   visible width is always 100vw, so the travel needed is
   (trackVw - 100)vw, and a CSS percentage translateX resolves against the
   element's OWN width, so that travel expressed as a percentage of the
   track's width is (travelVw / trackVw) * 100. Changing PANEL_VW or
   PANEL_COUNT keeps this correct without touching the numbers by hand. */
const PANEL_VW = 42;
const PANEL_COUNT = 4;
const TRACK_VW = PANEL_VW * PANEL_COUNT;
const TRAVEL_VW = TRACK_VW - 100;
const TRAVEL_PCT = (TRAVEL_VW / TRACK_VW) * 100;
const OUTER_HEIGHT_VH = 150 + TRAVEL_VW;

/** The scroll progress at which panel `index` sits centred in the viewport.
 * The panel's untranslated left edge is index * PANEL_VW, the track has
 * shifted left by TRAVEL_VW * progress, and centring wants the panel's
 * midpoint at 50vw. Clamped, and the clamp is the point: panel 0 is already
 * centred when the pan begins and the last one still is when it ends, so
 * their centres are exactly 0 and 1. Emphasis (PanPanel) and keyboard focus
 * (revealPanel) both read this, so what looks active and what focus scrolls
 * to can never disagree. */
function panelCenter(index: number) {
  return clamp01((index * PANEL_VW + PANEL_VW / 2 - 50) / TRAVEL_VW);
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

/** Half-width, in progress, of the crossfade between two adjacent panels. */
const HANDOVER = 0.08;

/** Serializable view model the server page hands the client spine — a slim
 * projection of PlotSpineEntry (src/lib/content.ts), not the raw Plot/Note
 * objects, so this component's props stay a flat, purpose-built shape. */
export interface PlotSpineItem {
  slug: string;
  name: string;
  accent: string;
  index: string;
  /** The plot's one-sentence framing, from src/lib/plots.ts. Rendered only
   * in the desktop pan, where each panel is a full viewport and needs the
   * content; CompactList deliberately omits it to keep the mobile page
   * height within budget. */
  tagline: string;
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
  showTagline = false,
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
  /** Desktop pan only. Each panel is a full viewport, so without it the
   * content occupies a thin band in a lot of empty space. */
  showTagline?: boolean;
}) {
  return (
    <div>
      <m.span
        aria-hidden="true"
        className="mb-3 block h-[3px] w-10"
        style={{ backgroundColor: item.accent, opacity: accentEmphasis }}
      />
      {/* Chapter framing. The four plots are a complete set of peers read in
          order, so numbering them earns the word: "01" alone was an index,
          "Chapter 01" is a position in a sequence. Arabic rather than roman so
          it matches the oversized numeral behind the panel exactly - two
          numbering schemes on one panel would read as two different facts. */}
      <div className="label-mono flex items-center gap-3 tracking-[0.2em] text-faint">
        <span>Chapter {item.index}</span>
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
      {showTagline && (
        <p className="tagline mt-3 max-w-[34ch] text-dim">{item.tagline}</p>
      )}
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

/** One plot's panel inside the horizontal pan. Every derived value (how
 * "active" this panel is, its opacity/scale/title color) comes off the
 * shared scroll MotionValue via useTransform — nothing here calls setState
 * on scroll, so the four panels re-emphasise every frame with zero React
 * re-renders. The emphasis lives on THIS element (the panel), never on the
 * track: the track already carries the pan's own `x` transform, and a
 * second inline transform on the same node would silently replace it. */
function PanPanel({
  item,
  index,
  progress,
  onFocusPanel,
}: {
  item: PlotSpineItem;
  index: number;
  progress: MotionValue<number>;
  /** Fired when focus enters this panel, so the pan can bring it into
   * view. See the handler in PanSection for why this is required. */
  onFocusPanel: (index: number) => void;
}) {
  /* Full emphasis for as long as this panel is the active one, rather than a
     pulse peaking at a single instant. The handover points are the midpoints
     between this panel's centre and its neighbours', and emphasis crossfades
     over a HANDOVER band around each. The first and last panels have no
     neighbour on one side, so they hold at full from the moment the pan
     starts and until it ends - previously panel 0 opened at half emphasis,
     peaked, and was already dark while it was still the panel on screen. */
  const center = panelCenter(index);
  const enter =
    index > 0 ? (center + panelCenter(index - 1)) / 2 : Number.NEGATIVE_INFINITY;
  const leave =
    index < PANEL_COUNT - 1
      ? (center + panelCenter(index + 1)) / 2
      : Number.POSITIVE_INFINITY;
  const activeAmount = useTransform(progress, (p) => {
    const rising = clamp01((p - enter + HANDOVER) / (2 * HANDOVER));
    const falling = clamp01((p - leave + HANDOVER) / (2 * HANDOVER));
    return rising * (1 - falling);
  });
  const opacity = useTransform(activeAmount, [0, 1], [0.55, 1]);
  const scale = useTransform(activeAmount, [0, 1], [0.97, 1]);
  /* Active plot title crossfades --faint -> --ink, never the plot accent: the
     raw accents fail WCAG contrast as display text on --bg (light) and are
     marginal on dark, so the readable text stays on the neutral tokens (both
     AA-safe) and the plot's colour identity rides the decorative accent bar in
     PlotEntry (and now the PlotMark) instead. */
  const titleColor = useTransform(
    activeAmount,
    (v) =>
      `color-mix(in srgb, var(--ink) ${Math.round(v * 100)}%, var(--faint) ${Math.round((1 - v) * 100)}%)`,
  );
  const accentEmphasis = useTransform(activeAmount, [0, 1], [0.3, 1]);

  return (
    <div
      style={{ width: `${PANEL_VW}vw` }}
      /* The extra left padding from lg up is the side rail's clearance. The
         pan is the one thing on the page that deliberately escapes the wrapper
         padding the rail hides in, so it is the one thing that has to make
         room for it by hand. Every panel gets it, so this reads as a uniform
         shift of the whole track rather than a ragged first panel, and it
         costs no width: box-sizing is border-box, so the panel stays 42vw and
         the travel arithmetic is untouched. */
      className="relative flex flex-shrink-0 items-center px-[clamp(20px,3.2vw,48px)] lg:pl-[calc(var(--rail-w)+clamp(20px,3.2vw,48px))]"
      onFocus={() => onFocusPanel(index)}
    >
      {/* The plot's number at a scale that reads as ground rather than text,
          cropped by the sticky wrapper as the track slides past it. It is not
          clipped to the panel: panels have no overflow of their own, so a
          numeral runs under its neighbour and the pan crops it at the viewport
          edge, which is the whole effect. */}
      <BleedType className="left-[clamp(20px,3.2vw,48px)] top-1/2 -translate-y-[58%] text-[clamp(200px,26vw,420px)] opacity-40 lg:left-[calc(var(--rail-w)+clamp(20px,3.2vw,48px))]">
        {item.index}
      </BleedType>
      <m.div
        className="relative"
        style={{ opacity, scale, transformOrigin: "left center" }}
      >
        <PlotMark
          slug={item.slug}
          accent={item.accent}
          className="mb-[clamp(16px,2.4vw,28px)] h-[clamp(90px,10vw,140px)] w-[clamp(90px,10vw,140px)]"
        />
        <PlotEntry
          item={item}
          titleColor={titleColor}
          accentEmphasis={accentEmphasis}
          showTagline
        />
      </m.div>
    </div>
  );
}

/** Desktop-only pinned horizontal pan: a tall wrapper gives scroll something
 * to consume, the inner sticky box stays pinned in the viewport for that
 * whole distance, and the track of four panels slides left underneath it.
 * Mirrors IntroBand's useScroll/useSpring/useTransform recipe
 * (src/components/intro-band.tsx) — same spring constants, new content and a
 * horizontal `x` instead of a drawn path. Rendered only when motion isn't
 * reduced; the `hidden md:block` on top of that collapses it to zero height
 * below md, so mobile never pays for this section's scroll distance. */
function PanSection({ items }: { items: PlotSpineItem[] }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ["start start", "end end"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });
  const x = useTransform(progress, [0, 1], ["0%", `-${TRAVEL_PCT.toFixed(2)}%`]);

  /* Keyboard access. All four panels are always in the DOM, but panels 2-4
     are translated outside the viewport, and the sticky wrapper is
     overflow-hidden (it has to be, or the off-screen panels give the
     document a horizontal scrollbar). That combination defeats the
     browser's native scroll-into-view-on-focus: there is no scrollable
     ancestor that can satisfy the request horizontally, so tabbing into a
     link on panel 3 would focus something the reader cannot see.

     Since the pan's horizontal position is a pure function of vertical
     scroll, the fix is to scroll the page to the offset where the focused
     panel is centred. Focus then drives the pan exactly the way the mouse
     wheel does. Only fires on focus, so it never fights the reader's own
     scrolling. PanSection renders only when motion is not reduced, so
     smooth behaviour here is safe. */
  const revealPanel = (index: number) => {
    const el = outerRef.current;
    if (!el) return;
    const travel = el.offsetHeight - window.innerHeight;
    if (travel <= 0) return;
    window.scrollTo({
      top: el.offsetTop + travel * panelCenter(index),
      behavior: "smooth",
    });
  };

  return (
    /* Full-bleed, cancelling the page wrapper's own px-[clamp(24px,6vw,120px)].
       Not decoration: the travel percentage assumes the track starts at x=0,
       but inside the padded wrapper it starts one padding-width in, so the
       last panel finished ~106px past the right edge with its content
       clipped. Escaping the padding makes the arithmetic exact. Panels carry
       their own padding, so nothing sits flush against the viewport. */
    <div
      ref={outerRef}
      className="relative -mx-[clamp(24px,6vw,120px)] hidden md:block"
      style={{ height: `${OUTER_HEIGHT_VH}vh` }}
    >
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <m.div className="flex" style={{ x }}>
          {items.map((item, i) => (
            <PanPanel
              key={item.slug}
              item={item}
              index={i}
              progress={progress}
              onFocusPanel={revealPanel}
            />
          ))}
        </m.div>
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
 * The homepage's four-plot pan: the headline scroll interaction on desktop
 * pins the viewport and pans a track of four panels horizontally instead of
 * scrubbing emphasis down a 320vh vertical stack, plus a plain static list
 * everywhere motion shouldn't drive layout.
 *
 * `useScroll`/`useTransform` aren't covered by MotionConfig's
 * `reducedMotion="user"`, so reduced motion is gated by hand here exactly
 * like IntroBand: when reduced, the whole pan section is skipped (not
 * just visually hidden — no tall wrapper exists at all) and CompactList
 * renders unconditionally instead of only below md.
 */
export function PlotSpine({ plots }: { plots: PlotSpineItem[] }) {
  const reduced = useReducedMotion() ?? false;

  return (
    <div className="mt-[clamp(44px,6vw,72px)]">
      {!reduced && <PanSection items={plots} />}
      <CompactList items={plots} className={reduced ? "" : "md:hidden"} />
    </div>
  );
}
