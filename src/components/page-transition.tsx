"use client";

import type { ReactNode } from "react";
import { AnimatePresence } from "motion/react";

/**
 * The pathname-keyed element itself lives in `src/app/template.tsx` — Next.js
 * remounts that fresh per navigation, which is what keeps its key in sync
 * with its content. This component just needs to persist across navigations
 * so AnimatePresence can see the old element being removed and animate it out
 * before the new one mounts.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return <AnimatePresence mode="wait">{children}</AnimatePresence>;
}
