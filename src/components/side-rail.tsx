"use client";

import { m, useReducedMotion, useScroll } from "motion/react";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/nav";
import { useActiveBand } from "@/lib/use-active-band";

/** The persistent identity frame down the left edge of every page.
 *
 * It fits in padding that already exists. The page wrapper is
 * px-[clamp(24px,6vw,120px)], which is 61px of empty gutter at the lg
 * breakpoint and 86px at 1440, so a --rail-w of clamp(44px,4.5vw,72px) shown
 * only from lg overlays space nothing was using. Nothing is inset for it -
 * which matters more than it sounds, because the plot pan resolves its panel
 * widths against 100vw, and insetting the page would have put every panel on
 * calc(100vw - var(--rail-w)) and reopened the pan's travel arithmetic.
 *
 * aria-hidden and pointer-events-none: every word in here is already in the
 * header, the footer, or the page itself, so to a screen reader this is
 * three duplicate announcements down the side of every page. It is chrome,
 * and it is treated as chrome.
 */
export function SideRail() {
  const pathname = usePathname();
  const band = useActiveBand();
  const reduced = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll();
  const section = NAV.find((item) => item.match(pathname))?.label ?? "The garden";

  return (
    <aside
      aria-hidden="true"
      /* The interpolation is deliberately its own leading-space segment
         rather than appended straight onto `lg:flex`: Tailwind extracts class
         candidates from the source text, and a utility written flush against
         a `${` is not one of them, so the class silently never gets
         generated. */
      /* It paints its own ground rather than sitting transparent over
         whatever it happens to be above. Transparent looks identical almost
         everywhere - the ground it would show through is the same one its
         tokens came from - but the rail is a full viewport tall while the
         band is decided at the header, so at a boundary its lower half would
         sit over the other ground with the wrong tokens, at around 3:1. An
         opaque rail can never disagree with itself, and it costs nothing:
         everywhere but a crossing it is the exact colour behind it.

         The interpolation is its own leading-space segment because Tailwind
         does not extract a class written flush against a `${`. */
      className={`pointer-events-none fixed left-0 top-0 z-30 hidden h-screen w-[var(--rail-w)] flex-col items-center justify-between bg-bg py-[clamp(18px,2.4vw,32px)] transition-colors duration-300 lg:flex ${
        band === "invert" ? "invert-band" : ""
      }`}
    >
      {/* Where you are. The wordmark deliberately isn't repeated here - the
          header states it in full a couple of centimetres away, and three
          rotated labels in a 47px column is a crowded rail, not an identity
          frame. */}
      <span className="label-mono [writing-mode:vertical-rl] tracking-[0.28em] text-faint">
        {section}
      </span>

      {/* Scroll progress. useScroll is NOT covered by MotionConfig's
          reducedMotion="user", so it is gated by hand: when motion is reduced
          the track renders on its own with no fill - a static hairline, not an
          element frozen in its initial frame. */}
      <div className="relative my-[clamp(20px,2.6vw,36px)] w-px flex-1 bg-hair opacity-40">
        {!reduced && (
          <m.div
            className="absolute inset-x-0 top-0 h-full origin-top bg-ink"
            style={{ scaleY: scrollYProgress }}
          />
        )}
      </div>

      <span className="label-mono [writing-mode:vertical-rl] tracking-[0.28em] text-faint">
        &copy; 2026
      </span>

    </aside>
  );
}
