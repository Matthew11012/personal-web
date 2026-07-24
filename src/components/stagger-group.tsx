"use client";

import { m } from "motion/react";
import type { ReactNode } from "react";
import { staggerContainer } from "@/lib/motion";

export function StaggerGroup({
  children,
  className,
  stagger = 0.08,
  delayChildren = 0.1,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delayChildren?: number;
}) {
  return (
    <m.div
      initial="hidden"
      animate="show"
      variants={staggerContainer(stagger, delayChildren)}
      className={className}
    >
      {children}
    </m.div>
  );
}
