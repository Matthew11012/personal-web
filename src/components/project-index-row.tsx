"use client";

import Link from "next/link";
import { m } from "motion/react";
import {
  idxArrowVariants,
  idxLeadVariants,
  idxRowVariants,
  idxTitleVariants,
} from "@/lib/motion";
import type { ProjectSummary } from "@/lib/types";

const MotionLink = m.create(Link);

/** One of the two index-row variants (see also NoteIndexRow): a baseline row of
 * lead / title / dotted leader / trailing text, sharing the idx* hover
 * choreography. Here the lead is the project's year — a real year, so the
 * numeric slot carries information — and the tagline sits beneath the title
 * line rather than trailing it. */
export function ProjectIndexRow({ project }: { project: ProjectSummary }) {
  return (
    <MotionLink
      href={`/work/${project.slug}`}
      variants={idxRowVariants}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      className="relative flex flex-col gap-2 py-[clamp(13px,1.6vw,20px)]"
      style={{ ["--acc" as string]: project.accent, color: "inherit" }}
    >
      <span className="flex flex-wrap items-baseline gap-4">
        <span className="font-mono text-xs text-faint">{project.period}</span>
        <m.h3
          variants={idxTitleVariants}
          className="idx-title min-w-0 text-ink"
        >
          {project.title}
        </m.h3>
        <m.span
          variants={idxLeadVariants}
          className="min-w-[40px] flex-1 -translate-y-1.5 border-b border-dotted"
        />
        <m.span
          variants={idxArrowVariants}
          className="font-mono text-base"
          style={{ color: "var(--acc)" }}
          aria-hidden="true"
        >
          →
        </m.span>
      </span>
      <p className="tagline min-w-0 max-w-[52ch] text-dim">
        {project.tagline}
      </p>
    </MotionLink>
  );
}
