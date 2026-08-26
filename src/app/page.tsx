import Link from "next/link";
import { MetaStrip } from "@/components/meta-strip";
import { Reveal } from "@/components/reveal";
import { StaggerGroup } from "@/components/stagger-group";
import { EntryCard, type HomeEntry } from "@/components/entry-card";
import { IdentityBand } from "@/components/identity-band";
import { ProjectIndexRow } from "@/components/project-index-row";
import { HomeTrainingBand } from "@/components/training/home-training-band";
import { getAllProjects, getRecentNotes } from "@/lib/content";
import { getPlot } from "@/lib/plots";

// 24h backstop only — the webhook and cron call revalidatePath("/") when
// Strava data actually changes, so this timer isn't tracking the training
// schedule. It only covers the cron dying silently.
export const revalidate = 86400;

const TITLE_CLASSES = [
  "entry-title-1",
  "entry-title-2",
  "entry-title-3",
  "entry-title-4",
];
const STAGGER_CLASSES = ["stagger-0", "stagger-1", "stagger-2", "stagger-3"];

export default async function HomePage() {
  const featuredProjects = getAllProjects().filter(
    (project) => project.featured,
  );
  const entries: HomeEntry[] = getRecentNotes(4).map((note, i) => {
    const plot = getPlot(note.plotSlug);
    return {
      slug: note.slug,
      n: String(i + 1).padStart(2, "0"),
      plotName: plot?.short ?? note.plotSlug,
      stage: note.stage,
      accent: plot?.accent ?? "#b0573f",
      title: note.title,
      titleClass: TITLE_CLASSES[i % TITLE_CLASSES.length],
      staggerClass: STAGGER_CLASSES[i % STAGGER_CLASSES.length],
      excerpt: note.excerpt,
    };
  });

  return (
    <div className="px-[clamp(24px,6vw,120px)] pb-[clamp(70px,9vw,120px)] pt-[clamp(40px,6vw,80px)]">
      <MetaStrip
        items={[
          "A place to think out loud",
          "A Digital Garden — Est. 2026",
          "Brisbane / Jakarta",
        ]}
      />

      <div className="py-[clamp(48px,8vw,96px)]">
        <Reveal as="wipein" delay={0.06}>
          <h1 className="display-xl max-w-[15ch] text-ink">
            Field notes from a growing mind.
          </h1>
        </Reveal>
        <Reveal delay={0.16} className="mt-[clamp(28px,4vw,44px)]">
          <p className="lede max-w-[34ch] text-dim">
            Code, competition, and everything in the space between. Nothing
            here is finished — that&rsquo;s the point.
          </p>
        </Reveal>
      </div>

      <Reveal delay={0.26}>
        <IdentityBand />
      </Reveal>

      <div className="label-mono mt-[clamp(28px,4vw,48px)] flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1.5 border-t border-hair pt-3.5 tracking-[0.18em] text-dim">
        <h2 className="text-ink">Lately in the garden</h2>
        <Link href="/notes" className="navlink">
          All notes →
        </Link>
      </div>

      <StaggerGroup
        className="mt-[clamp(44px,6vw,72px)] grid grid-cols-[repeat(auto-fit,minmax(min(100%,400px),1fr))] items-start gap-x-[clamp(48px,6vw,110px)] gap-y-[clamp(40px,5vw,80px)] supports-[grid-template-rows:subgrid]:gap-y-0"
      >
        {entries.map((entry) => (
          <EntryCard key={entry.slug} entry={entry} />
        ))}
      </StaggerGroup>

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
