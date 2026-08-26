"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { m } from "motion/react";
import { EASE } from "@/lib/motion";

/**
 * Next.js remounts `template.tsx` fresh on every navigation (unlike
 * `layout.tsx`, which persists). That's what this needs: `usePathname()` and
 * `children` arrive together in the same new instance, so the AnimatePresence
 * in layout.tsx (which does persist) sees a genuine key change at the same
 * moment the content changes — no race between the two.
 *
 * No `exit` prop: the App Router swaps the outgoing page's content before
 * AnimatePresence gets a two-phase removal it can intercept, so an exit
 * animation here never actually plays — verified empirically, not assumed.
 * The old page just holds until the new one is ready, then this fades in.
 */
export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <m.div
      key={pathname}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } }}
    >
      {children}
    </m.div>
  );
}
