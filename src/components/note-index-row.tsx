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

/** One of the two index-row variants (see also ProjectIndexRow): a baseline row
 * of lead / title / dotted leader / trailing text, sharing the idx* hover
 * choreography. Here the lead is a StagePip rather than a numeral — notes
 * aren't a sequence, so a positional number would encode something false — and
 * the trailing text is the note's excerpt. */
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
      <m.h3
        variants={idxTitleVariants}
        className="idx-title min-w-0 text-ink sm:max-w-[46ch] sm:truncate"
      >
        {note.title}
      </m.h3>
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
