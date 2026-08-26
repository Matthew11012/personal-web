import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXContent } from "@content-collections/mdx/react";
import { Reveal } from "@/components/reveal";
import { MarginNote } from "@/components/margin-note";
import { STAGE_LABEL, STAGE_SYMBOL } from "@/components/stage-pip";
import { createMdxComponents } from "@/components/mdx-components";
import { getAllNotes, getNote } from "@/lib/content";
import { getPlot } from "@/lib/plots";

export function generateStaticParams() {
  return getAllNotes().map((note) => ({ slug: note.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const note = getNote(slug);
  if (!note) return {};

  return {
    title: `${note.title} — Matthew Rizky Hartadi`,
    description: note.excerpt,
  };
}

export default async function NotePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const note = getNote(slug);

  if (!note) notFound();

  const plot = getPlot(note.plotSlug);
  const accent = plot?.accent ?? "#b0573f";
  const mdxComponents = createMdxComponents(accent);

  return (
    <div
      className="px-[clamp(24px,6vw,120px)] pb-[clamp(70px,9vw,120px)] pt-[clamp(36px,5vw,64px)]"
      style={{ ["--acc" as string]: accent }}
    >
      <div className="label-mono flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-hair pb-3.5 tracking-[0.14em] text-faint">
        <Link
          href="/"
          className="navlink text-faint underline underline-offset-4"
        >
          ← The garden
        </Link>
        <span style={{ color: accent }}>
          {plot?.name ?? note.plotSlug} · {STAGE_LABEL[note.stage]}{" "}
          {STAGE_SYMBOL[note.stage]}
        </span>
      </div>

      <div className="pb-2 pt-[clamp(40px,6vw,72px)]">
        <Reveal as="wipein">
          {/* The 22ch measure must sit on the h1 itself: `ch` resolves against
              the element's own font-size, so on a 16px wrapper it collapses to
              ~190px and breaks the display type to one word per line. */}
          <h1 className="display-note max-w-[22ch] text-pretty text-ink">
            {note.title}
          </h1>
        </Reveal>
      </div>

      <div className="label-mono flex flex-wrap gap-[clamp(16px,2vw,26px)] border-b border-rule py-5 tracking-[0.08em] text-faint">
        <span>
          Planted <time dateTime={note.plantedIso}>{note.plantedLabel}</time>
        </span>
        {note.tendedCount > 0 && <span>Tended {note.tendedCount}×</span>}
        <span>{note.readTime}</span>
      </div>

      <div className="mt-[clamp(36px,5vw,52px)] grid grid-cols-1 gap-[clamp(32px,5vw,72px)] md:grid-cols-[minmax(0,1fr)_minmax(0,clamp(200px,22vw,300px))]">
        <article className="prose-body max-w-[70ch] text-ink">
          <MDXContent code={note.mdx} components={mdxComponents} />
        </article>

        <MarginNote margin={note.margin} backlinks={note.backlinks} />
      </div>

      <div className="label-mono mt-[clamp(40px,6vw,56px)] flex flex-wrap items-center justify-between gap-x-6 gap-y-2.5 border-t border-hair pt-5 tracking-[0.12em] text-faint">
        <Link
          href={`/plots/${note.plotSlug}`}
          className="navlink underline underline-offset-4"
          style={{ color: accent }}
        >
          More from {plot?.name ?? note.plotSlug}
        </Link>
      </div>
    </div>
  );
}
