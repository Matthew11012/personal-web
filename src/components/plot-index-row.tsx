"use client";

import Link from "next/link";
import { m } from "motion/react";
import {
  idxArrowVariants,
  idxLeadVariants,
  idxRowVariants,
  idxTitleVariants,
} from "@/lib/motion";
import type { Plot } from "@/lib/types";

const MotionLink = m.create(Link);

export function PlotIndexRow({ plot }: { plot: Plot }) {
  return (
    <MotionLink
      href={`/plots/${plot.slug}`}
      variants={idxRowVariants}
      initial="rest"
      whileHover="hover"
      className="relative flex flex-wrap items-baseline gap-4 py-[clamp(13px,1.6vw,20px)]"
      style={{ ["--acc" as string]: plot.accent, color: "inherit" }}
    >
      <span className="font-mono text-xs text-faint">§{plot.index}</span>
      <m.span variants={idxTitleVariants} className="idx-title text-ink">
        {plot.name}
      </m.span>
      <m.span
        variants={idxLeadVariants}
        className="min-w-[40px] flex-1 -translate-y-1.5 border-b border-dotted"
      />
      <span className="font-body text-[clamp(13px,1.1vw,15px)] text-faint">
        {plot.description}
      </span>
      <m.span
        variants={idxArrowVariants}
        className="font-mono text-base"
        style={{ color: "var(--acc)" }}
      >
        →
      </m.span>
    </MotionLink>
  );
}
