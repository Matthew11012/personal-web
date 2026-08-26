import { AVAILABILITY, CV } from "@/lib/me";

/** Four facts at one typographic level is what made this read as clutter on a
    phone: same size, same tracking, near-same colour, and a 2-col grid that
    stranded "Brisbane" beside the hole left by the availability line wrapping.
    Mobile stacks into three rows instead — discipline, the two meta facts
    joined by a middot, then the CV link. The desktop row is untouched: the
    meta wrapper goes `display: contents` at sm so its children rejoin the
    parent flex and justify-between still spreads four items, not three. */
export function CredentialsStrip({ className = "" }: { className?: string }) {
  return (
    <div
      className={`label-mono flex flex-col gap-y-2 border-t border-hair pt-3.5 tracking-[0.1em] text-dim sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-8 sm:tracking-[0.18em] ${className}`}
    >
      <span className="text-ink">Computer science — applied AI</span>
      <span className="flex flex-wrap gap-x-2 sm:contents">
        <span className="text-dim">{AVAILABILITY}</span>
        <span aria-hidden="true" className="sm:hidden">
          ·
        </span>
        <span>Brisbane</span>
      </span>
      <a href={CV.href} download className="navlink text-gardener">
        {CV.label}
      </a>
    </div>
  );
}
