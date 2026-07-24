import Link from "next/link";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/reveal";
import { MarginNote } from "@/components/margin-note";
import { STAGE_LABEL, STAGE_SYMBOL } from "@/components/stage-pip";
import { getAllNoteSlugs, getNote } from "@/lib/placeholder-content";
import { getPlot } from "@/lib/plots";

export function generateStaticParams() {
  return getAllNoteSlugs().map((slug) => ({ slug }));
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
  const [first, ...rest] = note.body;
  const firstLetter = first?.type === "p" ? first.text.charAt(0) : "";
  const firstRest = first?.type === "p" ? first.text.slice(1) : "";

  return (
    <div
      className="px-[clamp(24px,6vw,120px)] pb-[clamp(70px,9vw,120px)] pt-[clamp(36px,5vw,64px)]"
      style={{ ["--acc" as string]: accent }}
    >
      <div className="label-mono flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-hair pb-3.5 tracking-[0.14em] text-faint">
        <Link href="/" className="navlink text-faint">
          ← The garden
        </Link>
        <span style={{ color: accent }}>
          {plot?.name ?? note.plotSlug} · {STAGE_LABEL[note.stage]}{" "}
          {STAGE_SYMBOL[note.stage]}
        </span>
      </div>

      <div className="max-w-[22ch] pb-2 pt-[clamp(40px,6vw,72px)]">
        <Reveal as="wipein">
          <h1 className="display-note text-ink">{note.title}</h1>
        </Reveal>
      </div>

      <div className="label-mono flex flex-wrap gap-[clamp(16px,2vw,26px)] border-b border-rule py-5 tracking-[0.08em] text-faint">
        <span>
          Planted <time dateTime={note.plantedIso}>{note.plantedLabel}</time>
        </span>
        <span>Tended {note.tendedCount}×</span>
        <span>{note.readTime}</span>
      </div>

      <div className="mt-[clamp(36px,5vw,52px)] grid grid-cols-1 gap-[clamp(32px,5vw,72px)] md:grid-cols-[minmax(0,1fr)_minmax(0,clamp(200px,22vw,300px))]">
        <article className="prose-body max-w-[70ch] text-ink">
          <p className="mb-[26px]">
            {firstLetter && <span className="drop-cap">{firstLetter}</span>}
            {firstRest}
          </p>
          {rest.map((block, i) =>
            block.type === "h3" ? (
              <h3
                key={i}
                className="label-mono mb-[18px] mt-10 tracking-[0.18em]"
                style={{ color: accent }}
              >
                {block.text}
              </h3>
            ) : (
              <p key={i} className="mb-[26px] last:mb-0">
                {block.text}
              </p>
            ),
          )}
        </article>

        <MarginNote margin={note.margin} growsInto={note.growsInto} />
      </div>

      <div className="label-mono mt-[clamp(40px,6vw,56px)] flex flex-wrap items-center justify-between gap-x-6 gap-y-2.5 border-t border-hair pt-5 tracking-[0.12em] text-faint">
        <Link href={`/plots/${note.plotSlug}`} className="text-faint">
          More from {plot?.name ?? note.plotSlug}
        </Link>
        {note.stage !== "evergreen" && (
          <span style={{ color: accent }}>
            This note is still growing {STAGE_SYMBOL[note.stage]}
          </span>
        )}
      </div>
    </div>
  );
}
