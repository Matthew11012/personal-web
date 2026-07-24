import Link from "next/link";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/reveal";
import { StaggerGroup } from "@/components/stagger-group";
import { EntryRow } from "@/components/entry-row";
import { getPlot, PLOTS } from "@/lib/plots";
import { getPlotEntries } from "@/lib/placeholder-content";

export function generateStaticParams() {
  return PLOTS.map((plot) => ({ plot: plot.slug }));
}

export default async function PlotPage({
  params,
}: {
  params: Promise<{ plot: string }>;
}) {
  const { plot: plotSlug } = await params;
  const plot = getPlot(plotSlug);

  if (!plot) notFound();

  const entries = getPlotEntries(plot.slug);

  return (
    <div
      className="px-[clamp(24px,6vw,120px)] pb-[clamp(70px,9vw,120px)] pt-[clamp(36px,5vw,64px)]"
      style={{ ["--acc" as string]: plot.accent }}
    >
      <Link
        href="/"
        className="navlink label-mono inline-flex gap-2 tracking-[0.18em] text-faint"
      >
        ← The garden
      </Link>

      <div className="mt-[22px] flex flex-wrap items-end justify-between gap-6 border-b border-hair pb-[clamp(22px,3vw,34px)]">
        <div>
          <Reveal>
            <div
              className="label-mono mb-4 tracking-[0.28em]"
              style={{ color: plot.accent }}
            >
              Plot §{plot.index}
            </div>
          </Reveal>
          <Reveal as="wipein">
            <h1 className="display-lg text-ink">{plot.name}</h1>
          </Reveal>
        </div>
        <p className="tagline mb-1.5 max-w-[34ch] text-dim">{plot.tagline}</p>
      </div>

      <div className="label-mono mt-[22px] flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 tracking-[0.14em] text-faint">
        <span>Six entries</span>
        <span className="flex flex-wrap gap-[18px]">
          <span style={{ color: "#3f8a8a" }}>● Seedling</span>
          <span style={{ color: "#b0573f" }}>◐ Budding</span>
          <span style={{ color: "#4f6d9e" }}>◍ Evergreen</span>
        </span>
      </div>

      <StaggerGroup className="mt-3">
        {entries.map((entry) => (
          <EntryRow key={entry.slug} entry={entry} />
        ))}
        <div className="border-t border-rule" />
      </StaggerGroup>
    </div>
  );
}
