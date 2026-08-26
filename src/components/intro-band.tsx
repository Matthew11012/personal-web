"use client";

import Image from "next/image";
import {
  m,
  useReducedMotion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CredentialsStrip } from "@/components/credentials-strip";
import { GARDENER_ACCENT as ACCENT } from "@/lib/me";
import { EASE } from "@/lib/motion";
import {
  buildPath,
  INTRO_ROUTES,
  type Chapter,
  type Figure,
  type IntroVariant,
  type Strand,
  type StrandKey,
  type Thread,
} from "@/lib/intro-route";

/**
 * The waypoint. A dull hairline mark is always there — it is where the thing
 * is, and that must not depend on scroll ever firing. The accent overlay is
 * driven by the route's own progress, so a marker lights up at the moment the
 * line arrives at it.
 *
 * `dot` is a waypoint you passed through. `tick` is a strand ending — a
 * cross-stroke instead of a circle, the way a transit map ends a line rather
 * than dotting it.
 */
function Marker({
  progress,
  at,
  reduced,
  mark = "dot",
}: {
  progress: MotionValue<number>;
  at: number;
  reduced: boolean;
  mark?: "dot" | "tick";
}) {
  const lit = useTransform(progress, [at, Math.min(at + 0.06, 1)], [0, 1]);
  const grow = useTransform(lit, [0, 1], [0.4, 1]);

  if (mark === "tick") {
    return (
      <span
        aria-hidden
        className="absolute -left-[8px] -top-[8px] block h-4 w-4"
      >
        <span
          className="absolute left-0 top-[7px] h-[2px] w-4"
          style={{ background: "var(--rule)" }}
        />
        <m.span
          className="absolute left-0 top-[7px] h-[2px] w-4 origin-left"
          style={
            reduced
              ? { background: ACCENT }
              : { background: ACCENT, opacity: lit, scaleX: grow }
          }
        />
      </span>
    );
  }

  return (
    <span aria-hidden className="absolute -left-[8px] -top-[8px] block h-4 w-4">
      <span
        className="absolute inset-[5px] rounded-full"
        style={{ background: "var(--rule)" }}
      />
      <m.span
        className="absolute inset-0 rounded-full border"
        style={
          reduced
            ? { borderColor: ACCENT }
            : { borderColor: ACCENT, opacity: lit, scale: grow }
        }
      />
      <m.span
        className="absolute inset-[5px] rounded-full"
        style={
          reduced
            ? { background: ACCENT }
            : { background: ACCENT, opacity: lit }
        }
      />
    </span>
  );
}

/**
 * One strand's own drawing. The spine reads the smoothed scroll value
 * directly; a forked strand (Jakarta) remaps that same value across its own
 * span so both advance together off the one scroll source, rather than
 * needing a scroll target of their own.
 */
function StrandPath({
  drawn,
  strand,
  d,
  reduced,
}: {
  drawn: MotionValue<number>;
  strand: Strand;
  d: string;
  reduced: boolean;
}) {
  const spanInput: [number, number] = strand.span ? [...strand.span] : [0, 1];
  const spanned = useTransform(drawn, spanInput, [0, 1]);
  const pathLength = strand.span ? spanned : drawn;

  return (
    <>
      <path
        d={d}
        fill="none"
        stroke="var(--rule)"
        strokeWidth={strand.weight}
        strokeDasharray="2 6"
        strokeLinecap="round"
      />
      <m.path
        d={d}
        fill="none"
        stroke={ACCENT}
        strokeWidth={strand.weight}
        strokeLinecap="round"
        style={{ pathLength: reduced ? 1 : pathLength }}
      />
    </>
  );
}

/** A thread's spur: leaves the route at its first point, ends at the content. */
function ThreadSpur({
  drawn,
  thread,
  d,
  reduced,
}: {
  drawn: MotionValue<number>;
  thread: Thread;
  d: string;
  reduced: boolean;
}) {
  const pathLength = useTransform(
    drawn,
    [thread.at, Math.min(thread.at + 0.08, 1)],
    [0, 1],
  );

  return (
    <>
      <path
        d={d}
        fill="none"
        stroke="var(--rule)"
        strokeWidth={1}
        strokeDasharray="2 6"
        strokeLinecap="round"
      />
      <m.path
        d={d}
        fill="none"
        stroke={ACCENT}
        strokeWidth={1}
        strokeLinecap="round"
        style={{ pathLength: reduced ? 1 : pathLength }}
      />
    </>
  );
}

/**
 * A figure's parallax drift, on its own element. Parallax and the rise-in
 * entrance both write `y` — put them on the same element and Motion's inline
 * transform silently drops one, so parallax lives here on the outer wrapper
 * and rise lives on the inner one, passed in as children.
 */
function FigureParallax({
  drawn,
  at,
  drift,
  reduced,
  children,
}: {
  drawn: MotionValue<number>;
  at: number;
  drift?: number;
  reduced: boolean;
  children: ReactNode;
}) {
  const travel = drift ?? 0;
  const y = useTransform(drawn, [at - 0.15, at + 0.25], [travel, -travel]);
  const shouldDrift = drift !== undefined && !reduced;

  return <m.div style={shouldDrift ? { y } : undefined}>{children}</m.div>;
}

function ItemFigure({ figure, above }: { figure: Figure; above?: boolean }) {
  const { shape } = figure;
  return (
    <figure
      className={`m-0 ${above ? "" : "mt-6"} ${figure.narrow} ${figure.width}`}
    >
      <div
        className={`relative w-full ${figure.ratio} ${
          shape === "cutout" ? "" : "overflow-hidden"
        } ${
          shape === "disc"
            ? "rounded-full"
            : shape === "cutout"
              ? ""
              : "rounded-md"
        }`}
      >
        {shape === "placeholder" ? (
          <div className="absolute inset-0 bg-[var(--rule)]/40" />
        ) : (
          <Image
            src={figure.src}
            alt={figure.alt}
            fill
            sizes="(max-width: 1024px) 80vw, 30vw"
            className={shape === "cutout" ? "object-contain" : "object-cover"}
          />
        )}
      </div>
      <figcaption className="label-mono mt-3 border-t border-hair pt-2 tracking-[0.16em] text-faint">
        {figure.caption}
      </figcaption>
    </figure>
  );
}

/** Shared eyebrow + phrase treatment: a chapter's stamp or a thread's cadence,
    over an idx-title phrase. Some chapters (the two terminals) carry no
    phrase — no heading element renders for those, just the stamp. */
function StationHeading({
  eyebrow,
  phrase,
}: {
  eyebrow: string;
  phrase: string;
}) {
  return (
    <div>
      <span className="label-mono block tracking-[0.26em] text-gardener">
        {eyebrow}
      </span>
      {phrase && (
        <div className="idx-title mb-0 mt-2.5 max-w-[18ch] font-normal text-ink">
          {phrase}
        </div>
      )}
    </div>
  );
}

/** Narrow-rail geometry, in the two numbers every offset here is derived from:
    a mark sits MARK_Y below its row's top, and the split and merge curves are
    BRAID_H tall. The measuring pass in IntroBand reads the same constants, so
    a mark's scroll trigger lands exactly where the mark is drawn. */
const MARK_Y = 9;
const BRAID_H = 24;

/** Every mark is centred by `-translate-x-1/2` at RAIL_X rather than by a
    hand-tuned left offset per shape — the row's own left edge sits a full
    `pl-7` plus the rail's 1px border away from the line, so eyeballed offsets
    put the ring and the dot at two different centres, neither of them the
    rail's. One constant, one transform, and all three marks agree. */
const RAIL_X = { spine: "-left-[28.5px]", branch: "-left-[16.5px]" } as const;

type Rail = keyof typeof RAIL_X;

/** A strictly increasing range. `useTransform` needs one, and an unmeasured
    rail hands it a pair of equal numbers. */
function span(from: number, to: number): [number, number] {
  return [from, Math.max(to, from + 0.0001)];
}

/**
 * Narrow-rail marker. A dull hairline mark underneath, accent on top — the
 * same two layers as the desktop `Marker`, and for the same reason: the mark
 * must be there whether or not scroll ever fires, and only its LIGHTING is
 * scrubbed.
 *
 * `at` is this mark's own y as a fraction of the rail's height, measured from
 * the DOM rather than authored: the rows are as tall as the photographs in
 * them, so no table could say where a mark falls.
 */
function NarrowMarker({
  mark,
  rail,
  progress,
  at,
  reduced,
}: {
  mark: "dot" | "tick";
  rail: Rail;
  progress: MotionValue<number>;
  at: number;
  reduced: boolean;
}) {
  const x = RAIL_X[rail];
  /* A short ramp in rail fractions: the rail runs to several thousand pixels,
     so 0.006 of it is roughly a thumb's worth of scroll — long enough not to
     snap on, short enough that the mark lights as the tip reaches it. */
  const lit = useTransform(progress, span(at, at + 0.006), [0, 1]);
  const grow = useTransform(lit, [0, 1], [0.55, 1]);

  /* The pulse is a one-shot, NOT a scrub. Driving its scale off the scroll
     value would tie the ring's expansion to scroll speed, so a flick past a
     marker would start and finish the pulse inside a single frame. Crossing
     `at` bumps a key instead, remounting the ring so its enter animation
     plays at its own tempo however fast the reader is going. The band below
     `at` is hysteresis: the rail's spring overshoots, and without it a mark
     sitting under the tip rings over and over. */
  const [ping, setPing] = useState(0);
  const passed = useRef(false);
  useMotionValueEvent(progress, "change", (p) => {
    const now = passed.current ? p >= at - 0.004 : p >= at;
    if (now === passed.current) return;
    passed.current = now;
    if (now && !reduced) setPing((n) => n + 1);
  });

  const pulse = !reduced && ping > 0 && (
    <m.span
      key={ping}
      aria-hidden
      className={`absolute ${x} top-[3px] block h-3 w-3 -translate-x-1/2 rounded-full border`}
      style={{ borderColor: ACCENT }}
      initial={{ scale: 0.6, opacity: 0.55 }}
      animate={{ scale: 2.6, opacity: 0 }}
      transition={{ duration: 0.7, ease: EASE }}
    />
  );

  if (mark === "tick") {
    return (
      <>
        {pulse}
        <span
          aria-hidden
          className={`absolute ${x} top-[8px] block h-[2px] w-3 -translate-x-1/2`}
          style={{ background: "var(--rule)" }}
        />
        <m.span
          aria-hidden
          className={`absolute ${x} top-[8px] block h-[2px] w-3 -translate-x-1/2`}
          style={
            reduced
              ? { background: ACCENT }
              : { background: ACCENT, opacity: lit, scaleX: grow }
          }
        />
      </>
    );
  }

  return (
    <>
      {pulse}
      <span
        aria-hidden
        className={`absolute ${x} top-[3px] block h-3 w-3 -translate-x-1/2 rounded-full border`}
        style={{ borderColor: "var(--rule)" }}
      />
      <span
        aria-hidden
        className={`absolute ${x} top-[6px] block h-1.5 w-1.5 -translate-x-1/2 rounded-full`}
        style={{ background: "var(--rule)" }}
      />
      <m.span
        aria-hidden
        className={`absolute ${x} top-[3px] block h-3 w-3 -translate-x-1/2 rounded-full border`}
        style={
          reduced
            ? { borderColor: ACCENT }
            : { borderColor: ACCENT, opacity: lit, scale: grow }
        }
      />
      <m.span
        aria-hidden
        className={`absolute ${x} top-[6px] block h-1.5 w-1.5 -translate-x-1/2 rounded-full`}
        style={
          reduced ? { background: ACCENT } : { background: ACCENT, opacity: lit }
        }
      />
    </>
  );
}

/**
 * The narrow rail's fork: the branch leaving the spine, and rejoining it.
 *
 * Drawn the way the desktop strands are — a dull dashed path with an accent
 * path scrubbed over it — so the split and the merge arrive as the reader
 * reaches them rather than whenever they happened to enter the viewport.
 *
 * The braid is a fixed 15×24 box rather than a stretched one: an SVG scaled
 * non-uniformly to fill a row would need `preserveAspectRatio="none"`, which
 * smears the stroke to a different weight at the top of the curve than at the
 * bottom. The straight run between the two braids is a plain border, which is
 * what the spine is too, so the branch matches it exactly.
 */
function ForkBraid({
  kind,
  progress,
  from,
  to,
  reduced,
}: {
  kind: "split" | "merge";
  progress: MotionValue<number>;
  from: number;
  to: number;
  reduced: boolean;
}) {
  const d =
    kind === "split"
      ? "M0.5 0C0.5 12 12.5 12 12.5 24"
      : "M12.5 0C12.5 12 0.5 12 0.5 24";
  const drawn = useTransform(progress, span(from, to), [0, 1]);

  return (
    <svg
      aria-hidden
      width="15"
      height={BRAID_H}
      viewBox="0 0 15 24"
      fill="none"
      className={`absolute -left-[29px] ${kind === "split" ? "top-[9px]" : "-bottom-[9px]"}`}
    >
      <path
        d={d}
        stroke="var(--rule)"
        strokeWidth={1}
        strokeDasharray="2 6"
        strokeLinecap="round"
      />
      <m.path
        d={d}
        stroke={ACCENT}
        strokeWidth={1}
        strokeLinecap="round"
        style={{ pathLength: reduced ? 1 : drawn }}
      />
    </svg>
  );
}

/** Where the rail's marks and curves sit, as fractions of the rail's own
    height. Measured, not authored — see the measuring pass in IntroBand. */
type RailGeometry = {
  stops: Record<string, number>;
  split: [number, number];
  merge: [number, number];
  branch: [number, number];
};

/* Past the end of the rail, so nothing lights until a real measurement lands:
   a mark whose position is still unknown should stay dull rather than flash
   on at the top of the page and jump once it is measured. */
const UNMEASURED: RailGeometry = {
  stops: {},
  split: [2, 2],
  merge: [2, 2],
  branch: [2, 2],
};

/** Piecewise-linear lookup through the route's year stops, rounded to a whole
    year. Read inside `useTransform`'s function form, so the year renders as a
    MotionValue child rather than as a re-render on every scroll frame. */
function yearAt(stops: IntroYearStops, p: number): number {
  if (p <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [pa, ya] = stops[i - 1];
    const [pb, yb] = stops[i];
    if (p <= pb) {
      const t = pb === pa ? 1 : (p - pa) / (pb - pa);
      return Math.round(ya + (yb - ya) * t);
    }
  }
  return stops[stops.length - 1][1];
}

type IntroYearStops = readonly (readonly [number, number])[];

type NarrowItem =
  | ({ kind: "chapter" } & Chapter)
  | ({ kind: "thread" } & Thread);

export function IntroBand({ variant = "home" }: { variant?: IntroVariant }) {
  const route = INTRO_ROUTES[variant];
  const ref = useRef<HTMLElement>(null);
  const routeRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLUListElement>(null);
  const bracketRef = useRef<HTMLLIElement>(null);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const reduced = useReducedMotion() ?? false;

  /* The route is drawn in pixels, so it needs the box's real width. Seeded
     with a plausible desktop width so the server-rendered route is already
     close to right, rather than absent until hydration. */
  const [boxW, setBoxW] = useState(1100);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setBoxW(entry.contentRect.width),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Tracked against the ROUTE BOX, not the whole section. Every `at` in the
     route table is a fraction of a path's arc length, and those paths live in
     the box — track the section instead and the lede above it eats ~19% of the
     range before the line starts, so the year reads 2024 while the reader is
     still looking at the 2021 chapter. */
  const { scrollYProgress } = useScroll({
    target: routeRef,
    /* The range is anchored so the drawn tip tracks roughly the MIDDLE of the
       viewport. Anchoring progress 0 to the box top reaching the viewport top
       is what made the line lag: at that moment the reader can already see a
       full viewport into the box — past the 2024 fork — while nothing has been
       drawn at all. Starting half a viewport earlier puts the tip where the
       eye is instead of a screen behind it. */
    offset: ["start 0.5", "end end"],
  });
  /* Smoothed, or the line advances in the wheel's own discrete steps and the
     drawing reads as stuttering rather than travelling. Every scroll-linked
     value in this band — the strands, the markers, the year, the parallax —
     is derived from this one spring, so they never drift out of sync. */
  const drawn = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  /* The narrow rail gets its own scroll target: the desktop route box is
     `hidden lg:grid`, so below lg it has no height and its progress is
     meaningless. */
  const { scrollYProgress: railScroll } = useScroll({
    target: railRef,
    /* BOTH ends anchored at the viewport middle, unlike the desktop box's
       "end end". That makes progress exactly the fraction of the rail lying
       above the middle of the screen — the same space the marks below are
       measured in — so a mark's `at` compares to it directly, with no fudge
       factor. Anchoring the far end at "end end" instead would leave the tip
       ~8% short of the rail's foot, and the last marks would never light. */
    offset: ["start 0.5", "end 0.5"],
  });
  const railDrawn = useSpring(railScroll, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  /* Where each mark falls along the rail is a DOM fact, not something the
     route table could state: the rows are as tall as the photographs in them.
     Measured after layout and again whenever the rail's height changes —
     which is exactly what happens as each photograph loads. */
  const [railGeom, setRailGeom] = useState<RailGeometry>(UNMEASURED);
  useEffect(() => {
    const ul = railRef.current;
    if (!ul) return;

    const measure = () => {
      const r = ul.getBoundingClientRect();
      if (!r.height) return; // hidden at lg — nothing to measure
      const f = (y: number) => (y - r.top) / r.height;
      const stops: Record<string, number> = {};
      rowRefs.current.forEach((el, key) => {
        stops[key] = f(el.getBoundingClientRect().top + MARK_Y);
      });
      const b = bracketRef.current?.getBoundingClientRect();
      /* The same offsets the braids and the branch are POSITIONED with, so
         the drawing and its trigger cannot drift apart. */
      setRailGeom({
        stops,
        split: b ? [f(b.top + MARK_Y), f(b.top + MARK_Y + BRAID_H)] : [2, 2],
        merge: b
          ? [f(b.bottom - BRAID_H + MARK_Y), f(b.bottom + MARK_Y)]
          : [2, 2],
        branch: b
          ? [f(b.top + MARK_Y + BRAID_H), f(b.bottom - BRAID_H + MARK_Y)]
          : [2, 2],
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(ul);
    return () => ro.disconnect();
  }, [variant]);

  const branchDrawn = useTransform(
    railDrawn,
    span(railGeom.branch[0], railGeom.branch[1]),
    [0, 1],
  );

  const jakartaStrand = route.strands.find((s) => s.key === "jakarta");
  const jakartaSpanInput: [number, number] = jakartaStrand?.span
    ? [...jakartaStrand.span]
    : [0, 1];
  const jakartaProgress = useTransform(drawn, jakartaSpanInput, [0, 1]);
  const progressByStrand: Record<StrandKey, MotionValue<number>> = {
    spine: drawn,
    jakarta: jakartaProgress,
  };

  const yearText = useTransform(() =>
    reduced
      ? String(route.yearStops[route.yearStops.length - 1][1])
      : String(yearAt(route.yearStops, drawn.get())),
  );

  /* Entrances stay on whileInView rather than on the path, so the words and
     photographs are never gated behind a scroll value — only the markers and
     strands are. MotionConfig's reducedMotion covers whileInView but not the
     scroll values above, so both are gated explicitly. */
  const rise = (delay = 0) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 26 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.3 },
          transition: { duration: 0.75, ease: EASE, delay },
        };

  /* Ordered by the route's authored `railOrder`, NOT by `at`. A chapter's `at`
     is a fraction of its own strand's arc length, and the two strands' scales
     aren't comparable — sorting by it put "now" ahead of the September
     graduation. Concatenating the two tables instead dropped every thread
     below every chapter, which stranded the hackathons after the portrait
     when they belong inside the fork years. Anything missing from railOrder
     falls to the end in table order rather than vanishing. */
  const narrowItems: NarrowItem[] = [
    ...route.chapters.map((c) => ({ kind: "chapter" as const, ...c })),
    ...route.threads.map((t) => ({ kind: "thread" as const, ...t })),
  ].sort((a, b) => {
    const rank = (key: string) => {
      const i = route.railOrder.indexOf(key);
      return i === -1 ? Number.POSITIVE_INFINITY : i;
    };
    return rank(a.key) - rank(b.key);
  });
  /* The bracket spans from the fork to the last terminal — the stretch where
     two strands were running at once. If either key ever goes missing the rail
     falls back to one flat list rather than slicing on -1. */
  const foundStart = narrowItems.findIndex(
    (it) => it.kind === "chapter" && it.key === "fork",
  );
  const foundEnd = narrowItems.findIndex(
    (it) => it.kind === "chapter" && it.key === "ui",
  );
  const hasBracket = foundStart >= 0 && foundEnd > foundStart;
  const before = hasBracket ? narrowItems.slice(0, foundStart) : narrowItems;
  const bracketed = hasBracket
    ? narrowItems.slice(foundStart, foundEnd + 1)
    : [];
  const after = hasBracket ? narrowItems.slice(foundEnd + 1) : [];

  const renderNarrowRow = (item: NarrowItem) => {
    const mark: "dot" | "tick" = item.kind === "chapter" ? item.mark : "dot";
    const eyebrow = item.kind === "chapter" ? item.stamp : item.cadence;
    /* Which of the two rails this row's mark sits on. Only the UI terminal is
       on the Jakarta strand, so only its tick lands on the branch — which is
       the whole point of forking the rail: the two degrees visibly end in two
       different places, rather than in one queue. */
    const rail: Rail =
      item.kind === "chapter" && item.strand === "jakarta" ? "branch" : "spine";
    const id = `${item.kind}-${item.key}`;
    return (
      <li
        key={id}
        ref={(el) => {
          if (el) rowRefs.current.set(id, el);
          else rowRefs.current.delete(id);
        }}
        className="relative pb-12"
      >
        <NarrowMarker
          mark={mark}
          rail={rail}
          progress={railDrawn}
          at={railGeom.stops[id] ?? 2}
          reduced={reduced}
        />
        <StationHeading eyebrow={eyebrow} phrase={item.phrase} />
        {item.figure && <ItemFigure figure={item.figure} />}
      </li>
    );
  };

  return (
    <section
      ref={ref}
      aria-label="About Matthew"
      className="mt-[clamp(24px,4vw,56px)]"
      style={{ ["--acc" as string]: "var(--gardener)" }}
    >
      <div className="label-mono flex justify-between border-b border-hair pb-3 tracking-[0.28em] text-faint">
        <span className="text-gardener">The gardener</span>
        <span>Two cities, two degrees</span>
      </div>

      <p className="lede max-w-[30ch] pt-[clamp(28px,4vw,48px)] text-dim">
        The line is where I&rsquo;ve been — Jakarta, then both cities at once.
        What hangs off it is what fills the days.
      </p>

      {/* The route: a sticky year in a left gutter, and the route box beside
          it. lg-and-up only: below that the content blocks are wide enough
          relative to the box that they start colliding with each other. */}
      <div
        ref={routeRef}
        className="mt-[clamp(32px,4vw,56px)] hidden lg:grid lg:grid-cols-[clamp(88px,7vw,132px)_1fr] lg:gap-x-[clamp(16px,2vw,32px)]"
      >
        <div className="relative">
          <div className="sticky top-[32vh]">
            <m.span className="block font-mono text-[clamp(56px,7vw,96px)] leading-none tabular-nums text-ink">
              {yearText}
            </m.span>
            <div className="mt-[clamp(10px,1.4vw,16px)] h-px w-8 bg-hair" />
          </div>
        </div>

        <div
          ref={boxRef}
          className="relative"
          style={{ height: `${route.boxH}px` }}
        >
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox={`0 0 ${boxW} ${route.boxH}`}
            aria-hidden
          >
            {route.strands.map((strand) => (
              <StrandPath
                key={strand.key}
                drawn={drawn}
                strand={strand}
                d={buildPath(strand.points, boxW, route.boxH)}
                reduced={reduced}
              />
            ))}
            {route.threads.map((thread) => (
              <ThreadSpur
                key={thread.key}
                drawn={drawn}
                thread={thread}
                d={buildPath(thread.spur, boxW, route.boxH)}
                reduced={reduced}
              />
            ))}
          </svg>

          <ul className="m-0 list-none p-0">
            {route.chapters.map((c) => (
              <li
                key={c.key}
                className="absolute"
                style={{ left: `${c.x}%`, top: `${c.y}%` }}
              >
                <Marker
                  progress={progressByStrand[c.strand]}
                  at={c.at}
                  reduced={reduced}
                  mark={c.mark}
                />
                {/* The lift/indent live on a static wrapper: motion writes its
                    own inline transform, which would silently drop a
                    translate class applied to the same element. */}
                <div className={`relative ${c.pad} ${c.lift}`}>
                  {/* `figureAbove` lifts only the PHOTOGRAPH over the marker,
                      anchored by its bottom edge, leaving the stamp in flow
                      beside the marker it belongs to. Translating the whole
                      block instead would carry the date 300px away from the
                      tick it labels. , not : an absolute child
                      anchors to the BORDER box, so the wrapper's pl-* never
                      reaches it, and above the UI terminal the Jakarta strand
                      is still swinging in from the fork and needs clearing. */}
                  {c.figure && c.figureAbove && (
                    <div className="absolute bottom-full left-12 mb-4 w-max">
                      <FigureParallax
                        drawn={drawn}
                        at={c.at}
                        drift={c.drift}
                        reduced={reduced}
                      >
                        <m.div {...rise(0.08)}>
                          <ItemFigure figure={c.figure} above />
                        </m.div>
                      </FigureParallax>
                    </div>
                  )}
                  <m.div {...rise()}>
                    <StationHeading eyebrow={c.stamp} phrase={c.phrase} />
                  </m.div>
                  {c.figure && !c.figureAbove && (
                    <FigureParallax
                      drawn={drawn}
                      at={c.at}
                      drift={c.drift}
                      reduced={reduced}
                    >
                      <m.div {...rise(0.08)}>
                        <ItemFigure figure={c.figure} />
                      </m.div>
                    </FigureParallax>
                  )}
                </div>
              </li>
            ))}

            {route.threads.map((t) => (
              <li
                key={t.key}
                className="absolute"
                style={{ left: `${t.x}%`, top: `${t.y}%` }}
              >
                <Marker
                  progress={drawn}
                  at={t.at}
                  reduced={reduced}
                  mark="dot"
                />
                <div className={`${t.pad} ${t.lift}`}>
                  <m.div {...rise()}>
                    <StationHeading eyebrow={t.cadence} phrase={t.phrase} />
                  </m.div>
                  {t.figure && (
                    <FigureParallax
                      drawn={drawn}
                      at={t.at}
                      drift={t.drift}
                      reduced={reduced}
                    >
                      <m.div {...rise(0.08)}>
                        <ItemFigure figure={t.figure} />
                      </m.div>
                    </FigureParallax>
                  )}
                </div>
              </li>
            ))}

            {/* The shared phrase, in the gap between the two terminals. No
                marker — it belongs to both strands, so it can't sit on
                either. */}
            <li
              className="absolute"
              style={{
                left: `${route.terminalNote.x}%`,
                top: `${route.terminalNote.y}%`,
              }}
            >
              <m.p
                {...rise()}
                className="idx-title m-0 max-w-[16ch] font-normal text-ink"
              >
                {route.terminalNote.text}
              </m.p>
            </li>
          </ul>
        </div>
      </div>

      {/* Narrow: a single rail, chapters and threads interleaved in route
          order. A hairline bracket outside the rail marks the years the two
          degrees ran in parallel. */}
      <ul
        ref={railRef}
        className="relative m-0 mt-10 list-none border-l border-dashed border-rule p-0 pl-7 lg:hidden"
      >
        {/* The lit spine, over the dashed one. A solid line scaled from its
            top, not a second dashed one: scaling a dashed border stretches
            its dashes with it, so the pattern would grow as the reader
            scrolls. `-left-px` puts it back onto the border it covers, since
            an absolute child is laid out from the PADDING box. */}
        <m.span
          aria-hidden
          className="absolute -left-px top-0 block h-full w-px origin-top"
          style={{ background: ACCENT, scaleY: reduced ? 1 : railDrawn }}
        />
        {before.map(renderNarrowRow)}
        {/* The bracketed stretch is a genuine sub-group — the years the two
            degrees ran at once — so it nests as a list inside a list rather
            than a bare <div>, which a <ul> may not contain. */}
        {/* Only when both ends of the fork were found: with no bracketed rows
            the braids would still draw, leaving two curves hooking into
            nothing. */}
        {hasBracket && (
          <li ref={bracketRef} className="relative list-none">
            {/* The second rail, running from the split to the merge. It lives
              INSIDE the 28px gutter rather than out past the section's left
              edge, where the old bracket sat — out there it clipped on narrow
              phones, and it read as a stray rule rather than as part of the
              rail it was annotating. */}
            <ForkBraid
              kind="split"
              progress={railDrawn}
              from={railGeom.split[0]}
              to={railGeom.split[1]}
              reduced={reduced}
            />
            <span
              aria-hidden
              className="absolute -left-[17px] bottom-[15px] top-[33px] w-0 border-l border-dashed border-rule"
            />
            <m.span
              aria-hidden
              className="absolute -left-[17px] bottom-[15px] top-[33px] block w-px origin-top"
              style={{ background: ACCENT, scaleY: reduced ? 1 : branchDrawn }}
            />
            <ForkBraid
              kind="merge"
              progress={railDrawn}
              from={railGeom.merge[0]}
              to={railGeom.merge[1]}
              reduced={reduced}
            />
            <ul className="m-0 list-none p-0">
              {bracketed.map(renderNarrowRow)}
            </ul>
          </li>
        )}
        {after.map(renderNarrowRow)}
      </ul>

      {/* No "The long version ->" link here any more: the band renders only on
          /about now, where that link pointed at the page you were already on.
          IdentityBand carries it on the homepage instead. */}
      <CredentialsStrip className="mt-[clamp(28px,4vw,44px)]" />
    </section>
  );
}
