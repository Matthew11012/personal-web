import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { StaggerGroup } from "@/components/stagger-group";
import { ProjectIndexRow } from "@/components/project-index-row";
import { GithubActivityBand } from "@/components/engineering/github-activity-band";
import { getAllProjects } from "@/lib/content";

// 24h ISR — the GitHub activity band fetches live data on each revalidation.
export const revalidate = 86400;

export function generateMetadata(): Metadata {
  return {
    title: "The Workshop — Matthew Rizky Hartadi",
    description:
      "Projects explained, not hosted — what got built, and what it took.",
  };
}

export default function WorkPage() {
  const projects = getAllProjects();
  const featuredProjects = projects.filter((project) => project.featured);
  const stubProjects = projects.filter((project) => !project.featured);

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
          Projects explained, not hosted — what got built, and what it took.
        </p>
      </div>

      {/* h2, not a div: this is the section label the ProjectIndexRow h3s sit
          under. Without it /work goes h1 -> h3. */}
      <h2 className="label-mono mt-[22px] tracking-[0.14em] text-faint">
        {featuredProjects.length} case{" "}
        {featuredProjects.length === 1 ? "study" : "studies"}
      </h2>

      <StaggerGroup className="mt-3 flex flex-col">
        {featuredProjects.map((project) => (
          <ProjectIndexRow
            key={project.slug}
            project={{
              slug: project.slug,
              title: project.title,
              tagline: project.tagline,
              period: project.period,
              accent: project.accent,
            }}
          />
        ))}
      </StaggerGroup>

      {stubProjects.length > 0 && (
        <div className="mt-[clamp(36px,5vw,52px)]">
          <h2 className="label-mono border-b border-hair pb-3.5 tracking-[0.18em] text-ink">
            Also built
          </h2>
          <ul className="mt-3 divide-y divide-hair">
            {stubProjects.map((project) => (
              <li key={project.slug}>
                <Link
                  href={`/work/${project.slug}`}
                  className="navlink flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-2.5 text-dim"
                >
                  <h3 className="font-body text-[15px] text-ink">
                    {project.title}
                  </h3>
                  <span className="label-mono text-[11px] tracking-[0.1em] text-faint">
                    {project.period}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <GithubActivityBand />
    </div>
  );
}
