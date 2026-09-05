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
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

export const wipeIn: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: EASE },
  },
};

/** LineReveal's per-word rise. The y is in em so it scales with the heading:
 * a display-lg word has to travel further than a body-sized one to read as the
 * same gesture, and a fixed pixel offset would under-move the first and
 * over-move the second. */
export const lineWordVariants: Variants = {
  hidden: { y: "1.05em" },
  show: { y: 0, transition: { duration: 0.55, ease: EASE } },
};

/** The container for the above. The stagger is per word, so it is deliberately
 * short - at the 0.08 used for section-level groups a six-word headline would
 * take half a second just to start its last word. */
export function lineWordsContainer(delayChildren = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: 0.045, delayChildren } },
  };
}

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
 * /work project-index card: entrance (hidden/show, inherited from a
 * StaggerGroup parent) merged with hover/tap into ONE variants object, the
 * same fix noteRowVariants already models below. The old shape here was
 * rest/hover only, and ProjectIndexRow set initial="rest" on it - which
 * overrides variant inheritance from a parent, so the StaggerGroup wrapping
 * it on /work was a silent no-op and the cards never staggered in. A card
 * grid also reads better as a small lift on hover than the old indent, which
 * was built for a dotted-leader row layout this component no longer uses.
 */
export const idxRowVariants: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
  hover: { y: -4, transition: { duration: 0.25, ease: EASE } },
  tap: { scale: 0.97, transition: { duration: 0.12 } },
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
    transition: { opacity: { duration: 0.35 }, x: { duration: 0.25, ease: EASE } },
  },
};

/**
 * Note-index row: entrance (hidden/show, inherited from a StaggerGroup
 * parent) merged with the hover indent, so the same element can both fade
 * up on mount and indent on hover without prop conflicts. idxRowVariants
 * can't do this — it's rest/hover only, so setting initial="rest" on it
 * overrides variant inheritance and silently defeats a StaggerGroup parent.
 */
export const noteRowVariants: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
  hover: { paddingLeft: 24, transition: { duration: 0.25, ease: EASE } },
  tap: { scale: 0.97, transition: { duration: 0.12 } },
};

/** Plot-page entry row hover choreography. */
export const engRowVariants: Variants = {
  rest: { paddingLeft: 0 },
  hover: { paddingLeft: 26, transition: { duration: 0.25, ease: EASE } },
  tap: { scale: 0.97, transition: { duration: 0.12 } },
};

export const engRuleVariants: Variants = {
  rest: { scaleY: 0 },
  hover: { scaleY: 1, transition: { duration: 0.25, ease: EASE } },
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
