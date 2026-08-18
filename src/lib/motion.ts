import type { Variants } from "motion/react";

/** Standard easing used throughout the site: cubic-bezier(.2,.7,.2,1) */
export const EASE: [number, number, number, number] = [0.2, 0.7, 0.2, 1];

/**
 * Count-up easing: cubic-bezier(.33,.3,.3,1).
 *
 * EASE is wrong for a running number. It front-loads hard — ~76% of the value
 * is spent in the first 27% of the duration, leaving only ~4% for the final
 * 39%. On a figure that means the digits race, then sit almost still, then
 * land: the deceleration is real but too small to read, so the count appears
 * to stop dead on its last value.
 *
 * This curve front-loads much harder and then coasts: ~87% of the value is
 * spent in the first ~17% of the duration and ~99.7% by ~64%, leaving the
 * remainder to creep out across the final third as a long, soft landing.
 *
 * Worth knowing when tuning it: the tail is only visible on figures with the
 * magnitude to still be changing digits down there. On a large total (1823km)
 * the last stretch ticks out single kilometres; on a small one-decimal figure
 * (3.8km) the remainder rounds away, so the number reaches its final value
 * early and simply holds until the tween ends.
 */
export const COUNT_EASE: [number, number, number, number] = [.05,1,.07,1];

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

export const wipeIn: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.9, ease: EASE },
  },
};

export function staggerContainer(
  staggerChildren = 0.08,
  delayChildren = 0.1,
): Variants {
  return {
    hidden: {},
    show: {
      transition: { staggerChildren, delayChildren },
    },
  };
}

/**
 * Home entry-card: entrance (hidden/show, inherited from the grid's
 * staggerChildren parent) merged with the hover lift, so the same element
 * can both fade up on mount and lift on hover without prop conflicts.
 */
export const entryCardVariants: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
  hover: { y: -6, transition: { duration: 0.45, ease: EASE } },
};

export const entryRuleVariants: Variants = {
  rest: { scaleX: 0.32 },
  hover: { scaleX: 1, transition: { duration: 0.6, ease: EASE } },
};

export const entryPipVariants: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.4, transition: { duration: 0.45, ease: EASE } },
};

export const entryTitleVariants: Variants = {
  rest: { color: "var(--ink)" },
  hover: { color: "var(--acc)", transition: { duration: 0.35 } },
};

/** Home plot-index row hover choreography. */
export const idxRowVariants: Variants = {
  rest: { paddingLeft: 0 },
  hover: { paddingLeft: 24, transition: { duration: 0.4, ease: EASE } },
};

export const idxTitleVariants: Variants = {
  rest: { color: "var(--ink)" },
  hover: { color: "var(--acc)", transition: { duration: 0.35 } },
};

export const idxLeadVariants: Variants = {
  rest: { borderColor: "var(--rule)" },
  hover: { borderColor: "var(--acc)", transition: { duration: 0.35 } },
};

export const idxArrowVariants: Variants = {
  rest: { opacity: 0, x: -10 },
  hover: {
    opacity: 1,
    x: 0,
    transition: { opacity: { duration: 0.35 }, x: { duration: 0.4, ease: EASE } },
  },
};

/** Plot-page entry row hover choreography. */
export const engRowVariants: Variants = {
  rest: { paddingLeft: 0 },
  hover: { paddingLeft: 26, transition: { duration: 0.4, ease: EASE } },
};

export const engRuleVariants: Variants = {
  rest: { scaleY: 0 },
  hover: { scaleY: 1, transition: { duration: 0.45, ease: EASE } },
};

export const engNumVariants: Variants = {
  rest: { color: "var(--num)" },
  hover: { color: "var(--acc)", transition: { duration: 0.35 } },
};

export const engTitleVariants: Variants = {
  rest: { color: "var(--ink)" },
  hover: { color: "var(--acc)", transition: { duration: 0.35 } },
};

/** Theme-toggle pip. */
export const togglePipVariants: Variants = {
  rest: { rotate: 0, scale: 1 },
  hover: { rotate: 180, scale: 1.18, transition: { duration: 0.55, ease: EASE } },
};
