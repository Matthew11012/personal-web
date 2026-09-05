"use client";

import Image from "next/image";
import { m } from "motion/react";
import { useState } from "react";
import { AssetSlot } from "@/components/asset-slot";
import {
  ProjectIndexRow,
  type ProjectIndexCardData,
} from "@/components/project-index-row";
import { StaggerGroup } from "@/components/stagger-group";

/**
 * The /work project index: a column of typographic rows beside one preview
 * frame that shows whichever row the reader is on.
 *
 * The frame replaces the two AssetSlots the grid used to bookend itself with.
 * Those reserved space for covers that don't exist yet, which meant the index
 * spent a third of its area making a point about missing images instead of
 * showing work. One frame carries the same promise in a quarter of the page,
 * and the day the four covers in ASSETS.md land it needs no code change here -
 * each row already knows whether its project has one.
 *
 * The frame is sticky rather than fixed. Fixed would have put it in the same
 * layer conversation as the header and the side rail for no gain; sticky in
 * its own column keeps it beside the rows the whole way down and needs no
 * z-index at all.
 *
 * Hover state lives here rather than in the row because the row that is
 * hovered and the frame that reacts are siblings. Rows keep their own
 * whileHover; this is additive. Focus drives it too, so a keyboard reader
 * tabbing the list sees what a pointer would, and the frame is aria-hidden -
 * every word in it is already the row's own accessible name.
 */
export function IndexPreview({
  projects,
}: {
  projects: ProjectIndexCardData[];
}) {
  const [activeSlug, setActiveSlug] = useState(projects[0]?.slug);
  const active = projects.find((p) => p.slug === activeSlug) ?? projects[0];

  if (!active) return null;

  return (
    <div className="mt-[clamp(20px,2.5vw,32px)] grid grid-cols-1 gap-[clamp(28px,4vw,56px)] lg:grid-cols-12">
      <StaggerGroup className="flex flex-col gap-[clamp(28px,4vw,48px)] lg:col-span-7">
        {projects.map((project) => (
          <ProjectIndexRow
            key={project.slug}
            project={project}
            onActivate={() => setActiveSlug(project.slug)}
          />
        ))}
      </StaggerGroup>

      <div aria-hidden="true" className="hidden lg:col-span-5 lg:block">
        <div className="sticky top-[92px]">
          {/* Keyed on the slug, so each change remounts and fades in. Opacity
              is covered by MotionConfig's reducedMotion, unlike a
              scroll-driven value, so this needs no manual gate. */}
          <m.div
            key={active.slug}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            style={{ ["--acc" as string]: active.accent }}
          >
            {active.cover ? (
              <Image
                src={active.cover.src}
                alt=""
                width={1600}
                height={900}
                sizes="40vw"
                className="h-auto w-full border border-hair"
                style={{ aspectRatio: active.cover.ratio }}
              />
            ) : (
              <AssetSlot
                ratio="16/9"
                label={`${active.title} cover`}
                dimensions="1600x900"
              />
            )}
            <div className="label-mono mt-3 flex items-baseline justify-between gap-4 tracking-[0.16em] text-faint">
              <span style={{ color: "var(--acc)" }}>{active.title}</span>
              <span>{active.period}</span>
            </div>
          </m.div>
        </div>
      </div>
    </div>
  );
}
