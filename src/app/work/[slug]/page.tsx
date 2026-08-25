import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXContent } from "@content-collections/mdx/react";
import { Reveal } from "@/components/reveal";
import { ProjectRail } from "@/components/project-rail";
import { ResultFigures } from "@/components/result-figures";
import { createMdxComponents } from "@/components/mdx-components";
import { getAllProjects, getProject } from "@/lib/content";

export function generateStaticParams() {
  return getAllProjects().map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};

  return {
    title: `${project.title} — Matthew Rizky Hartadi`,
    description: project.tagline || project.excerpt,
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);

  if (!project) notFound();

  const mdxComponents = createMdxComponents(project.accent);

  return (
    <div
      className="px-[clamp(24px,6vw,120px)] pb-[clamp(70px,9vw,120px)] pt-[clamp(36px,5vw,64px)]"
      style={{ ["--acc" as string]: project.accent }}
    >
      <div className="label-mono flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-hair pb-3.5 tracking-[0.14em] text-faint">
        <Link href="/" className="navlink text-faint">
          <span aria-hidden="true">←</span> The garden
        </Link>
        <span style={{ color: project.accent }}>The workshop</span>
      </div>

      <div className="pb-2 pt-[clamp(40px,6vw,72px)]">
        <Reveal as="wipein">
          {/* The 22ch measure must sit on the h1 itself: `ch` resolves against
              the element's own font-size, so on a 16px wrapper it collapses to
              ~190px and breaks the display type to one word per line. */}
          <h1 className="display-note max-w-[22ch] text-pretty text-ink">
            {project.title}
          </h1>
        </Reveal>
      </div>

      <div className="label-mono flex flex-wrap gap-[clamp(16px,2vw,26px)] border-b border-rule py-5 tracking-[0.08em] text-faint">
        <span>{project.role}</span>
        <span>{project.period}</span>
      </div>

      <ResultFigures results={project.results} />

      <div
        className={
          project.featured
            ? "mt-[clamp(36px,5vw,52px)] grid grid-cols-1 gap-[clamp(32px,5vw,72px)] md:grid-cols-[minmax(0,1fr)_minmax(0,clamp(200px,22vw,300px))]"
            : "mt-[clamp(36px,5vw,52px)] flex flex-col gap-[clamp(32px,5vw,72px)]"
        }
      >
        <article className="prose-body max-w-[70ch] text-ink">
          <MDXContent code={project.mdx} components={mdxComponents} />
        </article>

        <ProjectRail
          role={project.role}
          period={project.period}
          stack={project.stack}
          links={project.links}
          backlinks={project.backlinks}
        />
      </div>

      <div className="label-mono mt-[clamp(40px,6vw,56px)] flex flex-wrap items-center justify-between gap-x-6 gap-y-2.5 border-t border-hair pt-5 tracking-[0.12em] text-faint">
        <Link href="/work" className="text-faint">
          More from the workshop
        </Link>
      </div>
    </div>
  );
}
