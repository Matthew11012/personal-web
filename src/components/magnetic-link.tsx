"use client";

import { m, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import type { MouseEvent, ReactNode } from "react";

/** Fraction of the cursor's offset from the element's own centre that gets
 * applied as pull, and the hard cap on that pull in pixels — subtle on
 * purpose, so this reads as a premium detail rather than the link chasing
 * the cursor. */
const PULL = 0.2;
const MAX_PULL = 8;

function clamp(value: number, max: number): number {
  return Math.max(-max, Math.min(max, value));
}

/**
 * Thin wrapper that gives its child (a `<Link>`, passed as `children`) a
 * subtle magnetic pull toward the cursor on hover. Motion values only —
 * `useMotionValue` for the raw offset, `useSpring` to smooth it, applied via
 * `style.x`/`style.y` — so pointer movement never drives a React re-render.
 * Never use `useState` for the pointer position here; see AGENTS/run.md.
 *
 * `useReducedMotion` isn't covered by `MotionConfig` for motion values built
 * this way (only `animate`/`whileInView` are), so it's gated by hand: when
 * reduced, the child renders with no wrapper and no pull at all.
 */
export function MagneticLink({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 300, damping: 20, mass: 0.5 });

  if (reduced) return <>{children}</>;

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - (rect.left + rect.width / 2);
    const offsetY = event.clientY - (rect.top + rect.height / 2);
    x.set(clamp(offsetX * PULL, MAX_PULL));
    y.set(clamp(offsetY * PULL, MAX_PULL));
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <m.div
      className="inline-block"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
    >
      {children}
    </m.div>
  );
}
