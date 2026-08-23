"use client";

import Image from "next/image";
import Link from "next/link";
import { m, useReducedMotion, useScroll, useSpring } from "motion/react";
import { useRef } from "react";
import { CV, GARDENER_ACCENT as ACCENT } from "@/lib/me";
import { EASE } from "@/lib/motion";

/**
 * Three stations strung along a route the reader draws by scrolling.
 *
 * `x`/`y` are percentages of the desktop box and are the single source of
 * truth for both the waypoint dot and the station's content block, which hangs
 * below and to the right of it. PATH is authored against the same numbers by
 * hand — move a station and the path has to move with it.
 *
 * The route is a staircase, not a spline: it runs straight down the left edge
 * of each station's content and only jogs right in the gap *between* two
 * stations. A diagonal looks better in the abstract and cuts straight through
 * the photographs in practice.
 */
const STATIONS = [
  {
    n: "01",
    x: 4,
    y: 4,
    phrase: "The retrieval systems I build",
    src: "/me/portrait-figure.png",
    alt: "Matthew Rizky Hartadi",
    caption: "Brisbane",
    /* Station 01 is the only one without a frame: a cut-out standing on the
       page itself. The contrast with the two framed photographs is the point —
       it reads as the person, where the others read as evidence. */
    frameless: true,
    width: "md:w-[clamp(120px,13vw,160px)]",
    ratio: "aspect-[6/13]",
  },
  {
    n: "02",
    x: 34,
    y: 44,
    phrase: "The weekends I lose to hackathons",
    src: "/me/hackathon.jpg",
    alt: "Matthew presenting UQuizzle on stage at UQ",
    caption: "UQuizzle, Team 1103 — UQ",
    frameless: false,
    width: "md:w-[clamp(220px,26vw,320px)]",
    ratio: "aspect-[3/2]",
  },
  {
    n: "03",
    x: 64,
    y: 71,
    phrase: "Triathlon training",
    src: "/me/riding.jpg",
    alt: "Matthew at a lookout with two road bikes, the city below",
    caption: "On the bike — Brisbane",
    frameless: false,
    width: "md:w-[clamp(180px,20vw,250px)]",
    ratio: "aspect-square",
  },
] as const;

/* Anchored on the station coordinates above: a vertical run beside each
   station, a rounded jog into the next, then off the bottom edge so the route
   reads as continuing into the rest of the page. */
const PATH =
  "M 4 4 V 36 Q 4 42 10 42 H 28 Q 34 42 34 48 V 64 Q 34 70 40 70 H 58 Q 64 70 64 76 V 100";

function StationFigure({
  station,
}: {
  station: (typeof STATIONS)[number];
}) {
  return (
    <figure className={`m-0 mt-5 w-[min(100%,300px)] ${station.width}`}>
      <div
        className={`relative w-full ${station.ratio} ${
          station.frameless ? "" : "overflow-hidden"
        }`}
      >
        <Image
          src={station.src}
          alt={station.alt}
          fill
          sizes="(max-width: 768px) 80vw, 30vw"
          className={station.frameless ? "object-contain" : "object-cover"}
          priority={station.n === "01"}
        />
      </div>
      <figcaption className="label-mono mt-2.5 border-t border-hair pt-2 tracking-[0.16em] text-faint">
        {station.caption}
      </figcaption>
    </figure>
  );
}

function StationHeading({ n, phrase }: { n: string; phrase: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="label-mono tracking-[0.2em]" style={{ color: ACCENT }}>
        {n}
      </span>
      <h3 className="idx-title m-0 font-normal text-ink">{phrase}</h3>
    </div>
  );
}

export function IntroBand() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.55"],
  });
  /* Smoothed, or the line advances in the wheel's own discrete steps and the
     drawing reads as stuttering rather than travelling. */
  const pathLength = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    restDelta: 0.001,
  });

  const rise = (delay = 0) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.4 },
          transition: { duration: 0.7, ease: EASE, delay },
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
        <span>Three stations</span>
      </div>

      <p className="lede max-w-[30ch] pt-[clamp(28px,4vw,48px)] text-dim">
        Three things take up most of my week. This garden is what falls out of
        them.
      </p>

      {/* Desktop: the stations are laid along a route the scroll draws. The
          box has a fixed height because the path is authored against it. */}
      <div className="relative mt-[clamp(32px,4vw,56px)] hidden h-[1200px] md:block">
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          {/* The unwalked route sits underneath in the hairline colour, so the
              drawn line reads as progress along something already there. */}
          <path
            d={PATH}
            fill="none"
            stroke="var(--rule)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <m.path
            d={PATH}
            fill="none"
            stroke={ACCENT}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            style={{ pathLength: reduced ? 1 : pathLength }}
          />
        </svg>

        <ol className="m-0 list-none p-0">
          {STATIONS.map((s, i) => (
            <li
              key={s.n}
              className="absolute"
              style={{ left: `${s.x}%`, top: `${s.y}%` }}
            >
              <m.span
                aria-hidden
                className="absolute -left-[5px] -top-[5px] block h-[10px] w-[10px] rounded-full"
                style={{ background: ACCENT }}
                {...(reduced
                  ? {}
                  : {
                      initial: { scale: 0 },
                      whileInView: { scale: 1 },
                      viewport: { once: true, amount: 1 },
                      transition: { duration: 0.45, ease: EASE },
                    })}
              />
              <m.div className="pl-7 -translate-y-[0.7em]" {...rise(i * 0.05)}>
                <StationHeading n={s.n} phrase={s.phrase} />
                <StationFigure station={s} />
              </m.div>
            </li>
          ))}
        </ol>
      </div>

      {/* Mobile: the same route, straightened into a rail. */}
      <ol className="m-0 mt-8 list-none border-l border-rule p-0 pl-6 md:hidden">
        {STATIONS.map((s) => (
          <li key={s.n} className="relative pb-10">
            <span
              aria-hidden
              className="absolute -left-[27px] top-[7px] block h-[9px] w-[9px] rounded-full"
              style={{ background: ACCENT }}
            />
            <StationHeading n={s.n} phrase={s.phrase} />
            <StationFigure station={s} />
          </li>
        ))}
      </ol>

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
