"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { animate, useInView, useReducedMotion } from "motion/react";
import { CountUpFigure } from "@/components/count-up-figure";
import { MagneticLink } from "@/components/magnetic-link";
import { ResultFigures } from "@/components/result-figures";
import { Reveal } from "@/components/reveal";
import { COUNT_EASE } from "@/lib/motion";
import type { Project, ResultFigure as ResultFigureData } from "@/lib/types";

// Mirrors CountUpFigure's own token shape (see count-up-figure.tsx) — kept as
// a private copy rather than an import: it's a one-line regex, and importing
// it would couple this file to CountUpFigure's internals for no real reuse.
const NUMERIC_TOKEN = /^(\D*)(\d+(?:\.\d+)?)(\D*)$/;

function decimalsOf(numberToken: string): number {
  const dot = numberToken.indexOf(".");
  return dot === -1 ? 0 : numberToken.length - dot - 1;
}

/** Splits a "before → after" result figure (e.g. "5.3s → 0.37s", the shape
 * ResultFigure.figure documents in src/lib/types.ts) into its two sides.
 * Anything else — a plain "99.8%" — isn't this shape and returns null. */
function splitTransition(figure: string): { before: string; after: string } | null {
  const match = figure.match(/^(.+?)\s*→\s*(.+)$/);
  if (!match) return null;
  return { before: match[1], after: match[2] };
}

/** A "before → after" proof figure as one scroll-triggered tween rather than
 * two static halves: the number starts at the before value and eases down to
 * the real after value once the figure enters view, reusing CountUpFigure's
 * own COUNT_EASE curve — the front-loaded "fast drop, long settle" shape
 * reads as a real optimization landing, not a generic count-up.
 *
 * Falls back to the plain "before → after" string when either side isn't a
 * single numeric token, and — since this drives an imperative `animate()`
 * call, which MotionConfig's reducedMotion="user" does not cover — is
 * manually gated by useReducedMotion() to a static final value with no
 * scrub, matching CountUpFigure's own gating. */
function TransitionFigure({ figure }: { figure: string }) {
  const reducedMotion = useReducedMotion() ?? false;
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });

  // Memoised on `figure` alone: `figure` never changes at runtime (it comes
  // from static project content), but `.match()` returns a fresh array every
  // render, and an unstable dependency here would restart the tween on every
  // frame's own onUpdate-triggered re-render instead of running once.
  const parsed = useMemo(() => {
    const split = splitTransition(figure);
    if (!split) return null;
    const beforeMatch = split.before.match(NUMERIC_TOKEN);
    const afterMatch = split.after.match(NUMERIC_TOKEN);
    if (!beforeMatch || !afterMatch) return null;
    return {
      before: split.before,
      after: split.after,
      from: Number(beforeMatch[2]),
      to: Number(afterMatch[2]),
      prefix: afterMatch[1],
      suffix: afterMatch[3],
      decimals: decimalsOf(afterMatch[2]),
    };
  }, [figure]);

  // Only the animated path ever calls setDisplay from this effect — the
  // reduced-motion final value is computed inline below instead, so a
  // reader with reduced motion never triggers the tween's setState at all.
  const [display, setDisplay] = useState(parsed?.before ?? figure);

  useEffect(() => {
    if (!parsed || reducedMotion || !inView) return;

    const controls = animate(parsed.from, parsed.to, {
      duration: 1.4,
      ease: COUNT_EASE,
      onUpdate(value) {
        setDisplay(`${parsed.prefix}${value.toFixed(parsed.decimals)}${parsed.suffix}`);
      },
    });
    return () => controls.stop();
  }, [parsed, inView, reducedMotion]);

  if (!parsed) {
    return <span ref={ref}>{figure}</span>;
  }

  return (
    <span ref={ref} className="inline-flex flex-wrap items-baseline gap-3">
      <span aria-hidden="true" className="text-faint line-through decoration-1">
        {parsed.before}
      </span>
      <span aria-hidden="true" className="text-faint">
        →
      </span>
      {/* The live (animated) value: the server sends the `before` start frame
          and the client tweens it down to `after`. Hidden under reduced-motion
          (CSS) and no-JS (the noscript in layout.tsx), where .countup-static
          carries the true final value instead — mirrors CountUpFigure so the
          flagship metric is never understated in prerendered or script-off
          HTML. */}
      <span className="countup-live" aria-hidden="true">
        {display}
      </span>
      <span className="countup-static" aria-hidden="true">
        {parsed.after}
      </span>
      <span className="sr-only">
        {parsed.before} to {parsed.after}
      </span>
    </span>
  );
}

export interface FeaturedProjectProps {
  project: Project;
  /** "primary" is the large, Mandareen-scale treatment; "secondary" is the
   * lighter one notch down (UQuizzle) — same component, not two forks, so
   * the two features can't drift out of the same visual language. */
  size?: "primary" | "secondary";
  /** Defaults to the project's own frontmatter results; overridable so a
   * future call site (the homepage) can show a shorter cut. */
  figures?: ResultFigureData[];
}

/** A project promoted out of the compact index into a large, standalone
 * case-study block. "primary" (Mandareen) gets the full display type scale
 * and the bespoke proof figures below; "secondary" (UQuizzle) is deliberately
 * one notch down — a smaller display class, a narrower column pulled to one
 * side, and its figures rendered through the plain ResultFigures the project
 * detail page already uses, rather than a second bespoke figure treatment.
 * That asymmetry between the two blocks (full-width grid vs. a narrower,
 * offset column) is the composition's variance, not a coat of centered
 * boilerplate repeated twice. */
export function FeaturedProject({
  project,
  size = "primary",
  figures = project.results,
}: FeaturedProjectProps) {
  const isPrimary = size === "primary";

  const cta = (
    <Link
      href={`/work/${project.slug}`}
      className="navlink label-mono mt-6 inline-flex gap-2 tracking-[0.16em]"
      style={{ color: project.accent }}
    >
      Read the build <span aria-hidden="true">→</span>
    </Link>
  );

  const body = (
    <div>
      <div className="label-mono flex flex-wrap gap-x-4 gap-y-1 tracking-[0.08em] text-faint">
        <span>{project.role}</span>
        <span>{project.period}</span>
      </div>
      <Reveal as="wipein" delay={0.05}>
        <h2
          className={`${isPrimary ? "display-lg" : "display-note"} mt-3 max-w-[16ch] text-pretty text-ink`}
        >
          {project.title}
        </h2>
      </Reveal>
      <Reveal delay={0.12}>
        <p
          className={`${isPrimary ? "lede" : "tagline"} mt-4 max-w-[46ch] text-dim`}
        >
          {project.tagline}
        </p>
      </Reveal>
      <Reveal delay={0.18}>
        {isPrimary ? <MagneticLink>{cta}</MagneticLink> : cta}
      </Reveal>
    </div>
  );

  return (
    <section
      className={isPrimary ? "mt-[clamp(44px,6vw,72px)]" : "mt-[clamp(56px,7vw,96px)]"}
      style={{ ["--acc" as string]: project.accent }}
    >
      {isPrimary ? (
        <div className="grid grid-cols-1 gap-x-[clamp(32px,5vw,72px)] gap-y-10 lg:grid-cols-[3fr_2fr]">
          {body}
          {figures.length > 0 && (
            <div className="flex flex-col gap-8 lg:mt-16">
              {figures.map((figure, index) => (
                <div key={index}>
                  <div className="result-num">
                    {splitTransition(figure.figure) ? (
                      <TransitionFigure figure={figure.figure} />
                    ) : (
                      <CountUpFigure text={figure.figure} />
                    )}
                  </div>
                  <div className="label-mono mt-2 tracking-[0.1em] text-faint">
                    {figure.caption}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-[52ch] lg:ml-auto">
          {body}
          <ResultFigures results={figures} countUp />
        </div>
      )}
    </section>
  );
}
