import Link from "next/link";
import { MetaStrip } from "@/components/meta-strip";
import { Reveal } from "@/components/reveal";
import { StaggerGroup } from "@/components/stagger-group";
import { HomeHero } from "@/components/home-hero";
import { IdentityBand } from "@/components/identity-band";
import { PlotSpine, type PlotSpineItem } from "@/components/plot-spine";
import { ProjectIndexRow } from "@/components/project-index-row";
import { HomeTrainingBand } from "@/components/training/home-training-band";
import { getAllProjects, getFeaturedWork, getPlotSpineData } from "@/lib/content";

// 24h backstop only — the webhook and cron call revalidatePath("/") when
// Strava data actually changes, so this timer isn't tracking the training
// schedule. It only covers the cron dying silently.
export const revalidate = 86400;

export default async function HomePage() {
  const featuredProjects = getAllProjects().filter(
    (project) => project.featured,
  );
  const { flagship } = getFeaturedWork();
  const heroProof = flagship?.results[0];
  const plotSpineItems: PlotSpineItem[] = getPlotSpineData().map(
    ({ plot, noteCount, latestNote }) => ({
      slug: plot.slug,
      name: plot.name,
      accent: plot.accent,
      index: plot.index,
      noteCount,
      latestNote: latestNote
        ? {
            slug: latestNote.slug,
            title: latestNote.title,
            stage: latestNote.stage,
            date: latestNote.plantedLabel,
          }
        : undefined,
    }),
  );

  return (
    <div className="px-[clamp(24px,6vw,120px)] pb-[clamp(70px,9vw,120px)] pt-[clamp(40px,6vw,80px)]">
      <MetaStrip
        items={["A Digital Garden — Est. 2026"]}
      />

      <HomeHero
        headline="Field notes from a growing mind."
        lede="Code, competition, and everything in the space between. Nothing here is finished — that's the point."
        proof={
          flagship && heroProof
            ? {
                figure: heroProof.figure,
                caption: heroProof.caption,
                href: `/work/${flagship.slug}`,
                linkLabel: "Read the build",
              }
            : undefined
        }
      />

      <Reveal delay={0.26}>
        <IdentityBand />
      </Reveal>

      <div className="label-mono mt-[clamp(28px,4vw,48px)] flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1.5 border-t border-hair pt-3.5 tracking-[0.18em] text-dim">
        <h2 className="text-ink">The four plots</h2>
        <Link href="/notes" className="navlink">
          All notes →
        </Link>
      </div>

      <PlotSpine plots={plotSpineItems} />

      <div className="label-mono mt-[clamp(56px,8vw,110px)] flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1.5 border-t border-hair pt-3.5 tracking-[0.18em] text-dim">
        <h2 className="text-ink">From the workshop</h2>
        <Link href="/work" className="navlink">
          All work →
        </Link>
      </div>

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

      <HomeTrainingBand />
    </div>
  );
}
