"use client";

import Link from "next/link";
import { CountUpFigure } from "@/components/count-up-figure";
import { MagneticLink } from "@/components/magnetic-link";
import { Reveal } from "@/components/reveal";
import { AVAILABILITY } from "@/lib/me";

export interface HomeHeroProof {
  figure: string;
  caption: string;
  href: string;
  linkLabel: string;
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
 * primary CTA anchor the left column; the right carries one animated proof
 * figure sourced from the flagship project, so the hero's "tech" claim stays
 * in sync with /work rather than repeating a hand-picked number here. */
export function HomeHero({ headline, lede, proof }: HomeHeroProps) {
  return (
    <div className="grid grid-cols-1 items-center gap-x-[clamp(32px,6vw,96px)] gap-y-10 py-[clamp(48px,8vw,96px)] md:grid-cols-[3fr_2fr]">
      <div>
        <Reveal as="wipein" delay={0.06}>
          <h1 className="display-xl max-w-[15ch] text-ink">{headline}</h1>
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

      {proof && (
        <Reveal delay={0.32}>
          <div className="md:border-l md:border-hair md:pl-[clamp(24px,3vw,40px)]">
            <div className="result-num text-ink">
              <CountUpFigure text={proof.figure} />
            </div>
            <div className="label-mono mt-2 tracking-[0.1em] text-faint">
              {proof.caption}
            </div>
            <Link
              href={proof.href}
              className="navlink label-mono mt-4 inline-flex gap-2 tracking-[0.14em] text-gardener"
            >
              {proof.linkLabel} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </Reveal>
      )}
    </div>
  );
}
