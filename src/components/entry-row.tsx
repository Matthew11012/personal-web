"use client";

import Link from "next/link";
import { m } from "motion/react";
import { STAGE_LABEL } from "./stage-pip";
import {
  engNumVariants,
  engRowVariants,
  engRuleVariants,
  engTitleVariants,
} from "@/lib/motion";
import type { EntrySummary } from "@/lib/types";

const MotionLink = m.create(Link);

export function EntryRow({ entry }: { entry: EntrySummary }) {
  return (
    <MotionLink
      href={`/notes/${entry.slug}`}
      variants={engRowVariants}
      initial="rest"
      whileHover="hover"
      className="relative grid grid-cols-[clamp(48px,7vw,96px)_minmax(0,1fr)_minmax(0,auto)] items-baseline gap-[clamp(16px,2.5vw,32px)] border-t border-rule py-[clamp(22px,3vw,32px)]"
      style={{ color: "inherit" }}
    >
      <m.span
        variants={engRuleVariants}
        style={{ transformOrigin: "top", background: "var(--acc)" }}
        className="absolute left-0 top-[16%] bottom-[16%] w-[2px]"
      />
      <m.span variants={engNumVariants} className="eng-num">
        {entry.n}
      </m.span>
      <m.span variants={engTitleVariants} className="eng-title text-ink">
        {entry.title}
      </m.span>
      <span className="whitespace-nowrap text-right font-mono text-[11px] leading-[1.7] tracking-[0.05em] text-faint">
        {STAGE_LABEL[entry.stage]}
        <br />
        {entry.date}
      </span>
    </MotionLink>
  );
}
