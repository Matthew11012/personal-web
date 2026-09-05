import Link from "next/link";
import { MagneticLink } from "@/components/magnetic-link";
import { MetaStrip } from "@/components/meta-strip";
import { Reveal } from "@/components/reveal";
import { HomeHero } from "@/components/home-hero";
import { IdentityBand } from "@/components/identity-band";
import { PlotSpine, type PlotSpineItem } from "@/components/plot-spine";
import { FeaturedProject } from "@/components/featured-project";
import { HomeTrainingBand } from "@/components/training/home-training-band";
import { getFeaturedWork, getPlotSpineData } from "@/lib/content";

// 24h backstop only — the webhook and cron call revalidatePath("/") when
// Strava data actually changes, so this timer isn't tracking the training
// schedule. It only covers the cron dying silently.
export const revalidate = 86400;

export default async function HomePage() {
  const { flagship } = getFeaturedWork();
  const heroProof = flagship?.results[0];
  const plotSpineItems: PlotSpineItem[] = getPlotSpineData().map(
    ({ plot, noteCount, latestNote }) => ({
      slug: plot.slug,
      name: plot.name,
      accent: plot.accent,
      index: plot.index,
      tagline: plot.tagline,
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
        items={["A Digital Garden, Est. 2026"]}
      />

      <HomeHero
        headline="Field notes from a growing mind."
        lede="Code, competition, and everything in the space between. Nothing here is finished. That's the point."
        proof={
          flagship && heroProof
            ? {
                figure: heroProof.figure,
                caption: heroProof.caption,
              }
            : undefined
        }
      />

      <div className="label-mono mt-[clamp(28px,4vw,48px)] flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1.5 border-t border-hair pt-3.5 tracking-[0.18em] text-dim">
        <h2 className="text-ink">The four plots</h2>
        <Link href="/notes" className="navlink">
          All notes →
        </Link>
      </div>

      <PlotSpine plots={plotSpineItems} />

      {flagship && (
        <>
          <FeaturedProject project={flagship} />
          <div className="mt-[clamp(20px,2.5vw,28px)]">
            <MagneticLink>
              <Link
                href="/work"
                className="navlink label-mono tracking-[0.18em] text-faint"
              >
                See all work →
              </Link>
            </MagneticLink>
          </div>
        </>
      )}

      <Reveal>
        <IdentityBand />
      </Reveal>

      <HomeTrainingBand />
    </div>
  );
}
