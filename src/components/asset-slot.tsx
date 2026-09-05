export interface AssetSlotProps {
  /** CSS aspect-ratio, e.g. "16/9", "4/5", "1/1". Drives the reserved box. */
  ratio: string;
  /** What this asset must be, in plain words. Shown in the slot. */
  label: string;
  /** Suggested pixel dimensions, e.g. "1600x900". Shown in the slot. */
  dimensions: string;
  className?: string;
}

/**
 * A deliberate placeholder for an image that doesn't exist yet. It reserves
 * the exact space the real asset will occupy (via `aspect-ratio` on the
 * element itself, not a padding-top hack) so there is zero layout shift
 * whenever the swap happens, and it reads as obviously provisional in both
 * themes rather than as finished design.
 *
 * This is a plain server component on purpose - it renders nothing that
 * needs to hydrate. Motion is the CALLER's job: wrap it in `<Reveal>` or a
 * parallax `m.div` exactly as you would wrap a real `<Image>`, so swapping
 * the placeholder out later is a one-line change (replace this element with
 * `<Image>` at the same ratio) rather than a rewire of the motion nesting.
 *
 * Promoted from the `placeholder()` shape in src/lib/intro-route.ts, which
 * this generalizes into a reusable, self-contained component.
 */
export function AssetSlot({ ratio, label, dimensions, className = "" }: AssetSlotProps) {
  return (
    <div
      className={`flex items-center justify-center border border-rule bg-panel ${className}`}
      style={{ aspectRatio: ratio }}
    >
      <div className="flex flex-col items-center gap-1 px-4 text-center">
        <span className="label-mono tracking-[0.16em] text-faint">{label}</span>
        <span className="label-mono tracking-[0.16em] text-faint">{dimensions}</span>
      </div>
    </div>
  );
}
