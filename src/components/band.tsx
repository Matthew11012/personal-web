import type { ReactNode } from "react";

/** A full-bleed horizontal band on a padded page.
 *
 * Two jobs, and the second is the reason this is a component rather than a
 * pair of classes at each call site.
 *
 * 1. It escapes the page wrapper's px-[clamp(24px,6vw,120px)] with a matching
 *    negative margin, then puts the same padding back on the inside. The band
 *    therefore spans the viewport while its content stays on the page's
 *    column. A child that wants true edge-to-edge (PlotSpine's pan) cancels
 *    the inner padding with its own -mx and lands exactly where it did before
 *    this wrapper existed - the arithmetic is unchanged, not merely
 *    compensated for.
 *
 * 2. `invert` applies .invert-band (src/app/globals.css), which redeclares the
 *    colour tokens to the opposite of the page theme. Descendants inherit, so
 *    nothing inside needs to know it is in a band.
 *
 * The 500ms colour transition matches `html, body`, so a theme toggle
 * crossfades the band in step with the page around it. .invert-band itself
 * declares no transition - the header reuses that class and needs a faster
 * one.
 *
 * `data-band` is the hook the header and rail observe (use-active-band.ts) to
 * recolour themselves as a band passes under them. Base bands carry it too:
 * the observer needs to know when a band has ENDED, not only when one began.
 */
export function Band({
  invert = false,
  className = "",
  children,
}: {
  invert?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-band={invert ? "invert" : "base"}
      className={`-mx-[clamp(24px,6vw,120px)] px-[clamp(24px,6vw,120px)] transition-colors duration-500${
        invert ? " invert-band" : ""
      }${className ? ` ${className}` : ""}`}
    >
      {children}
    </div>
  );
}
