"use client";

import Link from "next/link";
import { m, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { AssetSlot } from "@/components/asset-slot";
import { CountUpFigure } from "@/components/count-up-figure";
import { MagneticLink } from "@/components/magnetic-link";
import { Reveal } from "@/components/reveal";
import { AVAILABILITY } from "@/lib/me";

export interface HomeHeroProof {
  figure: string;
  caption: string;
}

export interface HomeHeroProps {
  headline: string;
  lede: string;
  /** Optional so the hero still renders (as a single column) on the rare
   * path where getFeaturedWork()'s flagship lookup comes back empty — see
   * that function's own fallback comment in src/lib/content.ts. */
  proof?: HomeHeroProof;
}

/** The homepage hero as an asymmetric split: headline, lede and the single
 * primary CTA anchor the left column; the right carries a working-portrait
 * media slot with a small proof figure beneath it, sourced from the flagship
 * project, so the hero's "tech" claim stays in sync with /work rather than
 * repeating a hand-picked number here. */
export function HomeHero({ headline, lede, proof }: HomeHeroProps) {
  const mediaRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({
    target: mediaRef,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [-16, 16]);

  return (
    <div className="grid grid-cols-1 items-center gap-x-[clamp(32px,6vw,96px)] gap-y-10 py-[clamp(48px,8vw,96px)] md:grid-cols-[3fr_2fr]">
      <div>
        <Reveal as="wipein" delay={0.06}>
          <h1 className="display-lg max-w-[15ch] text-ink">{headline}</h1>
        </Reveal>
        <Reveal delay={0.16} className="mt-[clamp(28px,4vw,44px)]">
          <p className="lede max-w-[34ch] text-dim">{lede}</p>
        </Reveal>
        <Reveal delay={0.26} className="mt-[clamp(24px,4vw,36px)]">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <MagneticLink>
              <Link
                href="/work"
                className="navlink label-mono inline-flex gap-2 tracking-[0.16em] text-gardener"
              >
                See the work <span aria-hidden="true">→</span>
              </Link>
            </MagneticLink>
            <span className="label-mono tracking-[0.14em] text-faint">
              {AVAILABILITY}
            </span>
          </div>
        </Reveal>
      </div>

      {/* Static wrapper carries no transform of its own — the ref only
          gives useScroll a target to measure against. Parallax `y` lives on
          the outer m.div below, entrance lives on the inner one: the two
          transforms would silently collide on a single element. */}
      <div ref={mediaRef}>
        <m.div style={reduced ? undefined : { y }}>
          <Reveal delay={0.32}>
            <AssetSlot
              ratio="4/5"
              label="Working portrait"
              dimensions="1600x2000"
            />
          </Reveal>
          {proof && (
            <Reveal delay={0.4} className="mt-6">
              <div className="result-num text-ink">
                <CountUpFigure text={proof.figure} />
              </div>
              <div className="label-mono mt-2 tracking-[0.1em] text-faint">
                {proof.caption}
              </div>
            </Reveal>
          )}
        </m.div>
      </div>
    </div>
  );
}
