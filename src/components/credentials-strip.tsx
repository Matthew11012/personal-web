import { AVAILABILITY, CV } from "@/lib/me";

/** Wrapping a justify-between row on a phone is what made this read as
    four ragged lines with holes in them: each item claimed its own row and
    the spare space landed in the middle. A 2-col grid instead — the
    discipline line across the top, the two facts paired under it, the CV
    link on its own — so it reads as a data block, which is what it is. */
export function CredentialsStrip({ className = "" }: { className?: string }) {
  return (
    <div
      className={`label-mono grid grid-cols-2 items-baseline gap-x-6 gap-y-2 border-t border-hair pt-3.5 tracking-[0.1em] text-dim sm:flex sm:flex-wrap sm:justify-between sm:gap-x-8 sm:tracking-[0.18em] ${className}`}
    >
      <span className="col-span-2 text-ink">
        Computer science ×2 — retrieval &amp; applied AI
      </span>
      <span className="text-dim">{AVAILABILITY}</span>
      <span>Brisbane</span>
      <a href={CV.href} download className="navlink text-gardener">
        {CV.label}
      </a>
    </div>
  );
}
