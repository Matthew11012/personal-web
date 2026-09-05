"use client";

import Image from "next/image";
import Link from "next/link";
import { m } from "motion/react";
import { AssetSlot } from "@/components/asset-slot";
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
 * One cell of the /work project-index grid, replacing the old dotted-leader
 * row (see NoteIndexRow for that still-live pattern on /notes). Two variants,
 * chosen by the caller per cell so the grid can mix media and type-only
 * sizes rather than repeating one card four times:
 *
 * - "media": renders `project.cover` via next/image when frontmatter sets
 *   one, otherwise an AssetSlot at the same 16/9 ratio ASSETS.md specifies
 *   for these covers. The day a `.mdx` adds `cover`, this cell switches to
 *   the real image with no code change here.
 * - "text": typographic only - title, tagline, period, accent. No AssetSlot,
 *   so a page with zero real covers doesn't read as a wall of grey boxes.
 */
export function ProjectIndexRow({
  project,
  variant = "text",
  className = "",
}: {
  project: ProjectIndexCardData;
  variant?: "media" | "text";
  className?: string;
}) {
  return (
    <MotionLink
      href={`/work/${project.slug}`}
      variants={idxRowVariants}
      whileHover="hover"
      whileTap="tap"
      className={`group flex flex-col gap-4 ${className}`}
      style={{ ["--acc" as string]: project.accent, color: "inherit" }}
    >
      {variant === "media" &&
        (project.cover ? (
          <Image
            src={project.cover.src}
            alt={project.cover.alt}
            width={1600}
            height={900}
            sizes="(min-width: 640px) 55vw, 100vw"
            className="h-auto w-full border border-hair"
            style={{ aspectRatio: project.cover.ratio }}
          />
        ) : (
          <AssetSlot
            ratio="16/9"
            label={`${project.title} cover`}
            dimensions="1600x900"
          />
        ))}
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
