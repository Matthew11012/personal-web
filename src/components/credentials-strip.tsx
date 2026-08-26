import { CV } from "@/lib/me";

/** Four facts at one typographic level is what made this read as clutter on a
    phone: same size, same tracking, near-same colour, and a 2-col grid that
    stranded "Brisbane" beside the hole left by the availability line wrapping.
    Three facts stacked in a single column instead — no grid, no holes, one
    line each at 390px. The desktop row is untouched: flex, justify-between,
    wider tracking from sm up. */
export function CredentialsStrip({ className = "" }: { className?: string }) {
  return (
    <div
      className={`label-mono flex flex-col gap-y-2 border-t border-hair pt-3.5 tracking-[0.1em] text-dim sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-8 sm:tracking-[0.18em] ${className}`}
    >
      <span className="text-ink">Computer science — applied AI</span>
      <span>Brisbane</span>
      <a href={CV.href} download className="navlink text-gardener">
        {CV.label}
      </a>
    </div>
  );
}
