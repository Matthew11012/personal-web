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
      className="relative flex flex-wrap items-baseline gap-x-4 gap-y-1.5 py-[clamp(13px,1.6vw,20px)] sm:flex-nowrap"
      style={{ color: "inherit" }}
    >
      <span className="label-mono flex shrink-0 items-center gap-2 tracking-[0.1em]">
        <StagePip stage={note.stage} accent={note.accent} />
      </span>
      <m.span
        variants={idxTitleVariants}
        className="idx-title min-w-0 text-ink sm:max-w-[46ch] sm:truncate"
      >
        {note.title}
      </m.span>
      {/* The leader and the arrow are decoration that only reads at width: on a
          phone the leader collapses to a meaningless stub and the arrow — which
          only appears on hover, so never on touch — lands mid-excerpt. Both are
          desktop-only; the excerpt takes its own line instead. */}
      <m.span
        variants={idxLeadVariants}
        className="hidden min-w-[40px] flex-1 -translate-y-1.5 border-b border-dotted sm:block"
      />
      <span className="w-full min-w-0 shrink font-body text-[clamp(13px,1.1vw,15px)] text-faint sm:w-auto sm:truncate">
        {note.excerpt}
      </span>
      <m.span
        variants={idxArrowVariants}
        className="hidden shrink-0 font-mono text-base sm:inline-block"
        style={{ color: "var(--acc)" }}
        aria-hidden="true"
      >
        →
      </m.span>
    </MotionLink>
  );
}
