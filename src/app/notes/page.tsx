import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { StaggerGroup } from "@/components/stagger-group";
import { NoteIndexRow } from "@/components/note-index-row";
import { PLOTS } from "@/lib/plots";
import { getNotesByPlot } from "@/lib/content";

export function generateMetadata(): Metadata {
  return {
    title: "The Plots — Matthew Rizky Hartadi",
    description:
      "Every note across the garden's four plots — engineering, taekwondo, triathlon, and life.",
  };
}

export default function NotesPage() {
  const groups = PLOTS.map((plot) => ({
    plot,
    notes: getNotesByPlot(plot.slug),
  })).filter((group) => group.notes.length > 0);

  const totalNotes = groups.reduce((sum, group) => sum + group.notes.length, 0);

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

      <div className="label-mono mt-[22px] tracking-[0.14em] text-faint">
        {totalNotes} {totalNotes === 1 ? "note" : "notes"} in total
      </div>

      <div className="mt-3 flex flex-col gap-[clamp(28px,4vw,44px)]">
        {groups.map(({ plot, notes }) => (
          <div key={plot.slug} style={{ ["--acc" as string]: plot.accent }}>
            <h2>
              <Link
                href={`/plots/${plot.slug}`}
                className="navlink label-mono inline-flex gap-2 tracking-[0.14em]"
                style={{ color: plot.accent }}
              >
                §{plot.index} {plot.name} →
              </Link>
            </h2>
            <StaggerGroup className="mt-2 flex flex-col">
              {notes.map((note) => (
                <NoteIndexRow
                  key={note.slug}
                  note={{
                    slug: note.slug,
                    title: note.title,
                    excerpt: note.excerpt,
                    stage: note.stage,
                    accent: plot.accent,
                  }}
                />
              ))}
            </StaggerGroup>
          </div>
        ))}
      </div>
    </div>
  );
}
