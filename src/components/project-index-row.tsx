"use client";

import Link from "next/link";
import { m } from "motion/react";
import { idxRowVariants, idxTitleVariants } from "@/lib/motion";
import type { Project } from "@/lib/types";

const MotionLink = m.create(Link);

/** Slim summary used on the /work project-index grid - a Pick off Project so
 * the two can't drift. Includes `cover`, unlike ProjectSummary, since the
 * media variant below needs it. */
export type ProjectIndexCardData = Pick<
  Project,
  "slug" | "title" | "tagline" | "period" | "accent" | "cover"
>;

/**
 * One row of the /work project index, replacing the old dotted-leader row
 * (see NoteIndexRow for that still-live pattern on /notes).
 *
 * Typographic only. The media half of this cell - a cover when the frontmatter
 * had one, an AssetSlot when it didn't - has moved out to the shared preview
 * frame in IndexPreview, so a page with no real covers shows one honest
 * placeholder instead of a grid of grey boxes.
 *
 * `onActivate` fires on pointer and on focus, so the preview follows a
 * keyboard reader down the list exactly as it follows a pointer. The row keeps
 * its own whileHover on top of that.
 *
 * The hover ground is the row's only statement of its own bounds. The whole
 * block is one link and there is nothing in the resting state to say where it
 * starts and stops, so a reader aiming at a 200px target has to guess at it.
 * The negative margin exactly cancels the padding, so the plate grows outward
 * into the gutter and every line of type stays on the column it was already
 * on - the row gains a shape without moving.
 *
 * That bleed is 8px and fixed rather than a clamp, because this column is the
 * leftmost thing on the page and the rail is fixed above it at z-30. The gap
 * the plate has to live in is the page gutter minus the rail, which is
 * narrowest at the lg breakpoint: 61px less 51px, so 10px. A clamp scaled to
 * the viewport overran that and slid the plate's left corners under the rail,
 * where they read as a square cut rather than a corner.
 */
export function ProjectIndexRow({
  project,
  onActivate,
  className = "",
}: {
  project: ProjectIndexCardData;
  onActivate?: () => void;
  className?: string;
}) {
  return (
    <MotionLink
      href={`/work/${project.slug}`}
      variants={idxRowVariants}
      whileHover="hover"
      whileTap="tap"
      onMouseEnter={onActivate}
      onFocus={onActivate}
      className={`group -mx-2 flex flex-col gap-4 rounded-[var(--corner)] px-2 py-[clamp(14px,1.8vw,22px)] transition-colors duration-300 hover:bg-panel ${className}`}
      style={{ ["--acc" as string]: project.accent, color: "inherit" }}
    >
      <div>
        <div className="label-mono tracking-[0.08em] text-faint">
          {project.period}
        </div>
        <m.h3 variants={idxTitleVariants} className="idx-title mt-2 text-ink">
          {project.title}
        </m.h3>
        <p className="tagline mt-2 max-w-[46ch] text-dim">{project.tagline}</p>
        <span
          className="label-mono mt-3 inline-flex items-center gap-2 tracking-[0.12em]"
          style={{ color: "var(--acc)" }}
          aria-hidden="true"
        >
          Read the build <span>→</span>
        </span>
      </div>
    </MotionLink>
  );
}
