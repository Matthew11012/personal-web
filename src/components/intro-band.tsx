"use client";

import Image from "next/image";
import Link from "next/link";
import {
  m,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CV, GARDENER_ACCENT as ACCENT } from "@/lib/me";
import { EASE } from "@/lib/motion";

/**
 * Three things that take up the week, scattered along a path worn through the
 * garden rather than laid out on a grid.
 *
 * `x`/`y` are percentages of the desktop box and are the single source of
 * truth for the marker; the station's content hangs below and to the right of
 * it. PATH is authored against the same numbers by hand and routed through the
 * gaps *between* the content blocks — move a station and the path has to move
 * with it, or the line will run straight through a photograph.
 *
 * `at` is where along the path (0-1 of its arc length) the station sits, which
 * is what lets each marker light up as the drawn line actually reaches it
 * rather than when it happens to enter the viewport.
 *
 * No 01/02/03. These run concurrently — they are not a sequence, and numbering
 * them would claim an order that doesn't exist. The mono stamp carries cadence
 * instead, which is the thing the three actually differ on.
 */
const STATIONS = [
  {
    key: "work",
    cadence: "most days",
    x: 58,
    y: 2,
    at: 0,
    phrase: "The retrieval systems I build",
    src: "/me/portrait-figure.png",
    alt: "Matthew Rizky Hartadi",
    caption: "Brisbane",
    /* The only station without a frame: a cut-out standing on the page itself.
       The contrast with the two photographs is the point — it reads as the
       person, where the others read as evidence. */
    shape: "cutout",
    width: "lg:w-[clamp(120px,13vw,160px)]",
    ratio: "aspect-[6/13]",
    pad: "pl-8",
    lift: "-translate-y-[1.1em]",
  },
  {
    key: "hackathons",
    cadence: "a few weekends a year",
    x: 14,
    y: 28,
    at: 0.27,
    phrase: "The hackathons I lose them to",
    src: "/me/hackathon.jpg",
    alt: "Matthew presenting UQuizzle on stage at UQ",
    caption: "UQuizzle, Team 1103 — UQ",
    shape: "frame",
    width: "lg:w-[clamp(240px,28vw,340px)]",
    ratio: "aspect-[3/2]",
    pad: "pl-7",
    lift: "-translate-y-[0.5em]",
  },
  {
    key: "triathlon",
    cadence: "most mornings",
    x: 52,
    y: 67,
    at: 0.69,
    phrase: "The triathlon in the background",
    src: "/me/riding.jpg",
    alt: "Matthew at a lookout with two road bikes, the city below",
    caption: "On the bike — Brisbane",
    /* A disc, not a rectangle. The one curve in a page built entirely from
       hairlines and right angles, and it earns it: the subject is a wheel. */
    shape: "disc",
    width: "lg:w-[clamp(170px,19vw,240px)]",
    ratio: "aspect-square",
    pad: "pl-9",
    lift: "-translate-y-[0.9em]",
  },
] as const;

/**
 * Hand-authored to wander: it crosses the full width twice and doubles back on
 * itself, so it reads as a path someone walked rather than a diagram. Every
 * segment is routed through the empty space between the content blocks.
 *
 * Authored in the same 0-100 space as the station coordinates — a move point
 * followed by cubic segments — and scaled to pixels at render time.
 */
const BOX_H = 1450;
const ROUTE: readonly (readonly number[])[] = [
  [58, 2],
  [46, 10, 40, 4, 30, 9],
  [20, 14, 26, 22, 14, 28],
  [2, 33, 4, 46, 5, 57],
  [6, 64, 30, 58, 52, 67],
  /* The last segment runs to the box's bottom-left corner, which is exactly
     where the "long version" link sits — so the wander ends somewhere rather
     than trailing off the bottom of the page. */
  [40, 71, 14, 90, 0, 100],
];

/**
 * The route in pixels, against a 1:1 viewBox.
 *
 * The obvious alternative — a 0-100 viewBox with `preserveAspectRatio="none"`
 * — cannot work here. Stretching it needs `vector-effect: non-scaling-stroke`
 * to keep the stroke an even width, and Chrome then reads stroke-dasharray in
 * screen pixels, which silently defeats the `pathLength="1"` normalisation
 * Motion uses to draw the line: the whole route renders as a fixed dotted
 * pattern instead of one advancing stroke. Scaling the coordinates ourselves
 * keeps the stroke honest and the drawing intact.
 */
function buildRoute(w: number, h: number) {
  return ROUTE.map((seg, i) => {
    const pairs: string[] = [];
    for (let j = 0; j < seg.length; j += 2) {
      pairs.push(
        `${((seg[j] * w) / 100).toFixed(1)} ${((seg[j + 1] * h) / 100).toFixed(1)}`,
      );
    }
    return `${i === 0 ? "M" : "C"} ${pairs.join(", ")}`;
  }).join(" ");
}

/**
 * The waypoint. A dull hairline dot is always there — it is where the station
 * is, and that must not depend on scroll ever firing. The accent fill and the
 * ring around it are driven by the path's own progress, so a station lights up
 * at the moment the line arrives at it.
 */
function Marker({
  progress,
  at,
  reduced,
}: {
  progress: MotionValue<number>;
  at: number;
  reduced: boolean;
}) {
  const lit = useTransform(progress, [at, Math.min(at + 0.06, 1)], [0, 1]);
  const ring = useTransform(lit, [0, 1], [0.4, 1]);

  return (
    <span
      aria-hidden
      className="absolute -left-[8px] -top-[8px] block h-4 w-4"
    >
      <span
        className="absolute inset-[5px] rounded-full"
        style={{ background: "var(--rule)" }}
      />
      <m.span
        className="absolute inset-0 rounded-full border"
        style={
          reduced
            ? { borderColor: ACCENT }
            : { borderColor: ACCENT, opacity: lit, scale: ring }
        }
      />
      <m.span
        className="absolute inset-[5px] rounded-full"
        style={
          reduced ? { background: ACCENT } : { background: ACCENT, opacity: lit }
        }
      />
    </span>
  );
}

function StationFigure({ station }: { station: (typeof STATIONS)[number] }) {
  const { shape } = station;
  return (
    <figure className={`m-0 mt-6 w-[min(100%,300px)] ${station.width}`}>
      <div
        className={`relative w-full ${station.ratio} ${
          shape === "cutout" ? "" : "overflow-hidden"
        } ${shape === "disc" ? "rounded-full" : ""}`}
      >
        <Image
          src={station.src}
          alt={station.alt}
          fill
          sizes="(max-width: 1024px) 80vw, 30vw"
          className={shape === "cutout" ? "object-contain" : "object-cover"}
          priority={station.key === "work"}
        />
      </div>
      <figcaption className="label-mono mt-3 border-t border-hair pt-2 tracking-[0.16em] text-faint">
        {station.caption}
      </figcaption>
    </figure>
  );
}

function StationHeading({
  cadence,
  phrase,
}: {
  cadence: string;
  phrase: string;
}) {
  return (
    <div>
      <span
        className="label-mono block tracking-[0.26em]"
        style={{ color: ACCENT }}
      >
        {cadence}
      </span>
      <h3 className="idx-title mb-0 mt-2.5 max-w-[18ch] font-normal text-ink">
        {phrase}
      </h3>
    </div>
  );
}

export function IntroBand() {
  const ref = useRef<HTMLElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
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
  const d = buildRoute(boxW, BOX_H);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.8", "end 0.6"],
  });
  /* Smoothed, or the line advances in the wheel's own discrete steps and the
     drawing reads as stuttering rather than travelling. */
  const drawn = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    restDelta: 0.001,
  });

  /* Entrances stay on whileInView rather than on the path, so the words and
     photographs are never gated behind a scroll value — only the markers are.
     MotionConfig's reducedMotion covers whileInView but not the scroll values
     above, so both are gated explicitly. */
  const rise = (delay = 0) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 26 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.3 },
          transition: { duration: 0.75, ease: EASE, delay },
        };

  return (
    <section
      ref={ref}
      aria-label="About Matthew"
      className="mt-[clamp(24px,4vw,56px)]"
      style={{ ["--acc" as string]: ACCENT }}
    >
      <div className="label-mono flex justify-between border-b border-hair pb-3 tracking-[0.28em] text-faint">
        <span style={{ color: ACCENT }}>The gardener</span>
        <span>Where the week goes</span>
      </div>

      <p className="lede max-w-[30ch] pt-[clamp(28px,4vw,48px)] text-dim">
        Three things take up most of my week. This garden is what falls out of
        them.
      </p>

      {/* The route. Fixed height because the path is authored against it, and
          lg-and-up only: below that the content blocks are wide enough
          relative to the box that they start colliding with each other. */}
      <div
        ref={boxRef}
        className="relative mt-[clamp(32px,4vw,56px)] hidden h-[1450px] lg:block"
      >
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${boxW} ${BOX_H}`}
          aria-hidden
        >
          {/* The unwalked path, dashed, sits underneath — so the drawn line
              reads as progress along a route that was always there. */}
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
            strokeWidth={1.5}
            strokeLinecap="round"
            style={{ pathLength: reduced ? 1 : drawn }}
          />
        </svg>

        <ul className="m-0 list-none p-0">
          {STATIONS.map((s) => (
            <li
              key={s.key}
              className="absolute"
              style={{ left: `${s.x}%`, top: `${s.y}%` }}
            >
              <Marker progress={drawn} at={s.at} reduced={reduced} />
              {/* The lift/indent live on a static wrapper: motion writes its
                  own inline transform, which would silently drop a translate
                  class applied to the same element. */}
              <div className={`${s.pad} ${s.lift}`}>
                <m.div {...rise()}>
                  <StationHeading cadence={s.cadence} phrase={s.phrase} />
                </m.div>
                <m.div {...rise(0.08)}>
                  <StationFigure station={s} />
                </m.div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Narrow: the same route straightened into a rail, dashed to match. */}
      <ul className="m-0 mt-10 list-none border-l border-dashed border-rule p-0 pl-7 lg:hidden">
        {STATIONS.map((s) => (
          <li key={s.key} className="relative pb-12">
            <span
              aria-hidden
              className="absolute -left-[33px] top-[3px] block h-3 w-3 rounded-full border"
              style={{ borderColor: ACCENT }}
            />
            <span
              aria-hidden
              className="absolute -left-[29px] top-[7px] block h-1.5 w-1.5 rounded-full"
              style={{ background: ACCENT }}
            />
            <StationHeading cadence={s.cadence} phrase={s.phrase} />
            <StationFigure station={s} />
          </li>
        ))}
      </ul>

      <Link
        href="/about"
        className="navlink label-mono inline-flex tracking-[0.18em]"
        style={{ color: ACCENT }}
      >
        The long version →
      </Link>

      <div className="label-mono mt-[clamp(28px,4vw,44px)] flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-t border-hair pt-3.5 tracking-[0.18em] text-dim">
        <span className="text-ink">Grad student — retrieval &amp; applied AI</span>
        <span>Brisbane / Jakarta</span>
        <a href={CV.href} download className="navlink" style={{ color: ACCENT }}>
          {CV.label}
        </a>
      </div>
    </section>
  );
}
