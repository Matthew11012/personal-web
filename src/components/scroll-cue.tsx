"use client";

import { m, useReducedMotion } from "motion/react";
import { EASE } from "@/lib/motion";

/**
 * Pure scroll affordance for the hero — not a CTA, no copy/links. A quiet
 * looping cue that the page continues below the fold.
 */
export function ScrollCue() {
  const reduced = useReducedMotion();

  return (
    <div className="label-mono flex flex-col items-start gap-2 tracking-[0.18em] text-faint">
      <span>Scroll</span>
      <m.span
        className="h-6 w-px bg-current"
        animate={
          reduced
            ? { y: 0, opacity: 0.6 }
            : { y: [0, 6, 0], opacity: [0.3, 0.7, 0.3] }
        }
        transition={
          reduced
            ? undefined
            : { duration: 1.8, repeat: Infinity, ease: EASE }
        }
      />
    </div>
  );
}
