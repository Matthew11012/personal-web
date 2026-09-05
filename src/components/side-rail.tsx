"use client";

import Link from "next/link";
import { m, useReducedMotion, useScroll } from "motion/react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { NAV } from "@/lib/nav";

/** The primary navigation, and the site's identity frame, down the left edge
 * of every page from lg up.
 *
 * It used to be decoration beside a top bar, and the two collided: both are
 * chrome pinned to the top-left corner, so the rail's label sat on the
 * wordmark. Rather than z-order around that, the rail took the nav and the top
 * bar retreated to below lg, where there is no rail and therefore no other
 * nav. Exactly one of the two is in the accessibility tree at any width.
 *
 * It fits in padding that already exists. The page wrapper is
 * px-[clamp(24px,6vw,120px)]; --rail-w is clamped strictly under that at
 * every width from lg up, so the rail overlays gutter nothing was using.
 * Nothing is inset for it - which matters more than it sounds, because the
 * plot pan resolves its panel widths against 100vw, and insetting the page
 * would have put every panel on calc(100vw - var(--rail-w)) and reopened the
 * pan's travel arithmetic. The pan pads its own panels past the rail instead.
 *
 * Labels run top-to-bottom in vertical-rl rather than rotated bottom-up: the
 * column then reads in the same direction as the DOM order and the same
 * direction as the page, so nothing has to be read against its own list.
 */
export function SideRail() {
  const pathname = usePathname();
  const reduced = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll();

  return (
    <div
      /* The interpolation is deliberately its own leading-space segment
         rather than appended straight onto `lg:flex`: Tailwind extracts class
         candidates from the source text, and a utility written flush against
         a `${` is not one of them, so the class silently never gets
         generated. */
      className="fixed left-0 top-0 z-30 hidden h-screen w-[var(--rail-w)] flex-col items-center justify-between border-r border-hair bg-bg py-[clamp(18px,2.4vw,32px)] lg:flex"
    >
      {/* The wordmark, initials only. The full name does not fit a 52px column
          and setting it vertically would make the one piece of identity on the
          page the slowest thing on it to read. */}
      <Link
        href="/"
        aria-label="Matthew Rizky Hartadi, home"
        className="label-mono rounded-[var(--corner-sm)] px-2 py-1 tracking-[0.18em] text-ink"
      >
        MRH
      </Link>

      <nav
        aria-label="Primary"
        className="flex flex-col items-center gap-[clamp(20px,2.4vw,34px)]"
      >
        {NAV.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`label-mono rounded-[var(--corner-sm)] px-1 py-2 [writing-mode:vertical-rl] tracking-[0.24em] transition-colors duration-300 ${
                active ? "text-ink" : "text-faint hover:text-link-hover"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* The toggle alone. The year lived here in the decorative version of
          this rail and was cut when the nav moved in: the footer already
          carries it, and a 52px column holding a wordmark, four labels, a
          control and a copyright line is a list, not an identity frame. */}
      <ThemeToggle compact />

      {/* Scroll progress, painted into the rail's own right-hand rule rather
          than given a track of its own: the rail already draws that line to
          separate itself from the page, so the progress fill costs no extra
          element in the reader's field of view.

          useScroll is NOT covered by MotionConfig's reducedMotion="user", so
          it is gated by hand: when motion is reduced the rule renders plain,
          which is a hairline rather than an element frozen in its first
          frame. */}
      {!reduced && (
        <m.div
          aria-hidden="true"
          className="absolute inset-y-0 right-[-1px] w-px origin-top bg-ink"
          style={{ scaleY: scrollYProgress }}
        />
      )}
    </div>
  );
}
