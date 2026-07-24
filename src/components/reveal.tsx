"use client";

import { m, type Variants } from "motion/react";
import type { ReactNode } from "react";
import { fadeUp, wipeIn } from "@/lib/motion";

export function Reveal({
  children,
  as = "fadeup",
  delay = 0,
  className,
}: {
  children: ReactNode;
  as?: "fadeup" | "wipein";
  delay?: number;
  className?: string;
}) {
  const base = as === "wipein" ? wipeIn : fadeUp;
  const show = base.show as Record<string, unknown>;
  const baseTransition = (show.transition as Record<string, unknown>) ?? {};
  const variants: Variants = {
    hidden: base.hidden,
    show: { ...show, transition: { ...baseTransition, delay } },
  };

  return (
    <m.div initial="hidden" animate="show" variants={variants} className={className}>
      {children}
    </m.div>
  );
}
