"use client";

import Link from "next/link";
import { m } from "motion/react";
import { StagePip } from "./stage-pip";
import {
  idxArrowVariants,
  idxLeadVariants,
  idxTitleVariants,
  noteRowVariants,
} from "@/lib/motion";
import type { Stage } from "@/lib/types";

const MotionLink = m.create(Link);

/** Mirrors PlotIndexRow's row geometry, with a StagePip in the numeral slot
 * (notes aren't a sequence, so a positional number would encode something
 * false) and the note's excerpt trailing instead of a plot description. */
export interface NoteIndexSummary {
  slug: string;
  title: string;
  excerpt: string;
  stage: Stage;
  accent: string;
}

export function NoteIndexRow({ note }: { note: NoteIndexSummary }) {
  return (
    <MotionLink
      href={`/notes/${note.slug}`}
      variants={noteRowVariants}
      whileHover="hover"
      className="relative flex flex-wrap items-baseline gap-4 py-[clamp(13px,1.6vw,20px)]"
      style={{ color: "inherit" }}
    >
      <span className="label-mono flex items-center gap-2 tracking-[0.1em]">
        <StagePip stage={note.stage} accent={note.accent} />
      </span>
      <m.span variants={idxTitleVariants} className="idx-title text-ink">
        {note.title}
      </m.span>
      <m.span
        variants={idxLeadVariants}
        className="min-w-[40px] flex-1 -translate-y-1.5 border-b border-dotted"
      />
      <span className="font-body text-[clamp(13px,1.1vw,15px)] text-faint">
        {note.excerpt}
      </span>
      <m.span
        variants={idxArrowVariants}
        className="font-mono text-base"
        style={{ color: "var(--acc)" }}
        aria-hidden="true"
      >
        →
      </m.span>
    </MotionLink>
  );
}
