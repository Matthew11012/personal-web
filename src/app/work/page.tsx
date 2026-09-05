import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { StaggerGroup } from "@/components/stagger-group";
import { ProjectIndexRow } from "@/components/project-index-row";
import { FeaturedProject } from "@/components/featured-project";
import { ProjectGallery, getProjectGallery } from "@/components/project-gallery";
import { GithubActivityBand } from "@/components/engineering/github-activity-band";
import { getFeaturedWork } from "@/lib/content";

// 24h ISR - the GitHub activity band fetches live data on each revalidation.
export const revalidate = 86400;

export function generateMetadata(): Metadata {
  return {
    title: "The Workshop - Matthew Rizky Hartadi",
    description:
      "Projects explained, not hosted. What got built, and what it took.",
  };
}

export default function WorkPage() {
  const { flagship, runnerUp, rest } = getFeaturedWork();
  const flagshipGallery = flagship ? getProjectGallery(flagship.slug) : undefined;

  // The runner-up (UQuizzle) plus everything else, as one mixed-rhythm
  // project index - the old second FeaturedProject block and the hairline
  // "Also built" list are both gone, replaced by this single grid.
  // Bookended with a media cell (the two most visually distinct products -
  // a live browser-extension overlay and a 1,600-person conference app),
  // typographic-only cells in between: giving every cell an AssetSlot would
  // read as four grey boxes before real covers exist.
  const indexProjects = [...(runnerUp ? [runnerUp] : []), ...rest];

  return (
    <div className="px-[clamp(24px,6vw,120px)] pb-[clamp(70px,9vw,120px)] pt-[clamp(36px,5vw,64px)]">
      <Link
        href="/"
        className="navlink label-mono inline-flex gap-2 tracking-[0.18em] text-faint"
      >
        <span aria-hidden="true">←</span> The garden
      </Link>

      <div className="mt-[22px] flex flex-wrap items-end justify-between gap-6 border-b border-hair pb-[clamp(22px,3vw,34px)]">
        <div>
          <Reveal>
            <div className="label-mono mb-4 tracking-[0.28em] text-faint">
              Selected work
            </div>
          </Reveal>
          <Reveal as="wipein">
            <h1 className="display-lg text-pretty text-ink">The workshop</h1>
          </Reveal>
        </div>
        <p className="tagline mb-1.5 max-w-[34ch] text-dim">
          Projects explained, not hosted. What got built, and what it took.
        </p>
      </div>

      {flagship && <FeaturedProject project={flagship} />}

      {/* Full-bleed: the page's one band that escapes the px-[clamp(...)]
          wrapper, negative-margined by exactly that clamp and re-padded
          internally so the plates can run to the viewport edge while the
          gallery's own scroll padding still lines the first plate up with
          the rest of the page. This is the wide-media half of the page's
          rhythm; FeaturedProject and the index grid below stay in the
          narrow container. */}
      {flagship && flagshipGallery && (
        <div
          className="-mx-[clamp(24px,6vw,120px)] mt-[clamp(32px,4vw,56px)] px-[clamp(24px,6vw,120px)]"
          style={{ ["--acc" as string]: flagship.accent }}
        >
          <ProjectGallery plates={flagshipGallery} />
        </div>
      )}

      {indexProjects.length > 0 && (
        <div className="mt-[clamp(56px,7vw,96px)]">
          {/* h2, not a div: this is the section label the ProjectIndexRow h3s
              sit under. Without it /work goes h1 -> h3. */}
          <h2 className="label-mono border-b border-hair pb-3.5 tracking-[0.18em] text-ink">
            More from the workshop
          </h2>
          <StaggerGroup className="mt-[clamp(20px,2.5vw,32px)] grid grid-cols-1 gap-x-[clamp(20px,3vw,40px)] gap-y-[clamp(32px,4vw,48px)] sm:grid-cols-12">
            {indexProjects.map((project, index) => (
              <ProjectIndexRow
                key={project.slug}
                project={{
                  slug: project.slug,
                  title: project.title,
                  tagline: project.tagline,
                  period: project.period,
                  accent: project.accent,
                  cover: project.cover,
                }}
                variant={index === 0 || index === indexProjects.length - 1 ? "media" : "text"}
                className={
                  index === 0 || index === indexProjects.length - 1
                    ? "sm:col-span-7"
                    : "sm:col-span-5 sm:self-center"
                }
              />
            ))}
          </StaggerGroup>
        </div>
      )}

      <GithubActivityBand />
    </div>
  );
}
