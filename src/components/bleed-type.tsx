import type { ReactNode } from "react";

/** A word or numeral set far past body scale and deliberately run off its
 * container's edge, sitting behind the real content as a background layer.
 *
 * It is ornament and nothing else, which is what dictates the three fixed
 * attributes: `aria-hidden` so it is not announced (the real heading is still
 * in the DOM, unchanged, for screen readers and search), `pointer-events-none`
 * so it never intercepts a click meant for what sits over it, and
 * `select-none` so a drag-select of the page's actual prose doesn't sweep it
 * up.
 *
 * Colour is --num, the muted numeral token, which is already tuned to sit a
 * step off the ground in both themes and inside a band. Position and size are
 * left to the call site via className: the crop is the whole effect, and where
 * a word should be cut depends entirely on what it is being cut by.
 *
 * The caller owns two things this cannot: a positioning context to be absolute
 * against, and `overflow-hidden` on whatever should do the cropping.
 */
export function BleedType({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute select-none whitespace-nowrap font-display leading-[0.78] tracking-[-0.02em] text-num ${className}`}
    >
      {children}
    </span>
  );
}
