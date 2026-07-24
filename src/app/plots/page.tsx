import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { StaggerGroup } from "@/components/stagger-group";
import { PlotIndexRow } from "@/components/plot-index-row";
import { PLOTS } from "@/lib/plots";
import { getNotesByPlot } from "@/lib/content";

export default function PlotsPage() {
  const totalNotes = PLOTS.reduce(
    (sum, plot) => sum + getNotesByPlot(plot.slug).length,
    0,
  );

  return (
    <div className="px-[clamp(24px,6vw,120px)] pb-[clamp(70px,9vw,120px)] pt-[clamp(36px,5vw,64px)]">
      <Link
        href="/"
        className="navlink label-mono inline-flex gap-2 tracking-[0.18em] text-faint"
      >
        ← The garden
      </Link>

      <div className="mt-[22px] flex flex-wrap items-end justify-between gap-6 border-b border-hair pb-[clamp(22px,3vw,34px)]">
        <div>
          <Reveal>
            <div className="label-mono mb-4 tracking-[0.28em] text-faint">
              Four plots
            </div>
          </Reveal>
          <Reveal as="wipein">
            <h1 className="display-lg text-ink">The plots</h1>
          </Reveal>
        </div>
        <p className="tagline mb-1.5 max-w-[34ch] text-dim">
          The garden is divided into four beds. Each one grows at its own pace.
        </p>
      </div>

      <div className="label-mono mt-[22px] flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 tracking-[0.14em] text-faint">
        <span>
          {totalNotes} {totalNotes === 1 ? "note" : "notes"} in total
        </span>
        <span className="flex flex-wrap gap-[18px]">
          <span style={{ color: "#3f8a8a" }}>● Seedling</span>
          <span style={{ color: "#b0573f" }}>◐ Budding</span>
          <span style={{ color: "#4f6d9e" }}>◍ Evergreen</span>
        </span>
      </div>

      <StaggerGroup className="mt-3 flex flex-col">
        {PLOTS.map((plot) => (
          <PlotIndexRow key={plot.slug} plot={plot} />
        ))}
      </StaggerGroup>
    </div>
  );
}
