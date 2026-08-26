"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { EASE } from "@/lib/motion";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <m.div
        key={pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } }}
        exit={{ opacity: 0, filter: "blur(3px)", transition: { duration: 0.4, ease: EASE } }}
      >
        {children}
      </m.div>
    </AnimatePresence>
  );
}
