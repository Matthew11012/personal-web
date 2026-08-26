"use client";

import Link from "next/link";
import { m } from "motion/react";
import { StagePip, STAGE_LABEL } from "./stage-pip";
import {
  entryCardVariants,
  entryPipVariants,
  entryRuleVariants,
  entryTitleVariants,
} from "@/lib/motion";
import type { Stage } from "@/lib/types";

const MotionLink = m.create(Link);

/** View model EntryCard renders — presentational fields (titleClass,
 * staggerClass, accent, plotName) are derived at page level, not stored in
 * content. */
export interface HomeEntry {
  slug: string;
  n: string;
  plotName: string;
  stage: Stage;
  accent: string;
  title: string;
  titleClass: string;
  staggerClass: string;
  excerpt: string;
}

export function EntryCard({ entry }: { entry: HomeEntry }) {
  return (
    <MotionLink
      href={`/notes/${entry.slug}`}
      variants={entryCardVariants}
      whileHover="hover"
      className={`block supports-[grid-template-rows:subgrid]:grid supports-[grid-template-rows:subgrid]:grid-rows-subgrid supports-[grid-template-rows:subgrid]:row-span-4 ${entry.staggerClass}`}
      style={{ ["--acc" as string]: entry.accent, color: "inherit" }}
    >
      <div className="mb-3.5 flex items-baseline gap-3.5">
        <span className="entry-num">{entry.n}</span>
        <span
          className="label-mono flex items-center gap-2 tracking-[0.1em]"
          style={{ color: entry.accent }}
        >
          <m.span variants={entryPipVariants} className="inline-block">
            <StagePip stage={entry.stage} accent={entry.accent} />
          </m.span>
          {entry.plotName} · {STAGE_LABEL[entry.stage]}
        </span>
      </div>
      <m.h3
        variants={entryTitleVariants}
        className={`${entry.titleClass} max-w-[14ch] text-ink`}
      >
        {entry.title}
      </m.h3>
      <m.div
        variants={entryRuleVariants}
        style={{ transformOrigin: "left" }}
        className="my-[clamp(14px,1.8vw,22px)] h-px bg-hair"
      />
      <p className="lede max-w-[40ch] text-[clamp(14px,1.2vw,17px)] text-dim supports-[grid-template-rows:subgrid]:mb-[clamp(40px,5vw,80px)]">
        {entry.excerpt}
      </p>
    </MotionLink>
  );
}
