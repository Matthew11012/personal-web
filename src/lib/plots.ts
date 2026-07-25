import type { Plot } from "./types";

/** The one hue absent from the plot wheel — engineering blue, taekwondo
 * rust, triathlon teal, life ochre — so the workshop reads as a distinct
 * department of the same publication, not a new palette. */
export const WORKSHOP_ACCENT = "#7d5a6b";

export const PLOTS: Plot[] = [
  {
    slug: "engineering",
    name: "Engineering & AI Lab",
    short: "Engineering",
    accent: "#4f6d9e",
    index: "01",
    description: "projects, write-ups, lessons",
    tagline:
      "Retrieval systems, model plumbing, and the write-ups I wish I'd found first. Where the work gets shown before it's clean.",
  },
  {
    slug: "taekwondo",
    name: "Taekwondo",
    short: "Taekwondo",
    accent: "#b0573f",
    index: "02",
    description: "competing, teaching, pressure",
    tagline:
      "Sparring, teaching Saturday classes, and the parts of pressure that transfer everywhere else.",
  },
  {
    slug: "triathlon",
    name: "Triathlon",
    short: "Triathlon",
    accent: "#3f8a8a",
    index: "03",
    description: "training logs, races, endurance",
    tagline:
      "Swim, bike, run, and the pacing lessons that keep showing up outside of race day.",
  },
  {
    slug: "life",
    name: "Life & Reflections",
    short: "Life",
    accent: "#9a8636",
    index: "04",
    description: "grad school, two countries",
    tagline:
      "Grad school, two countries, and the slower notes that don't fit anywhere else.",
  },
];

export function getPlot(slug: string): Plot | undefined {
  return PLOTS.find((p) => p.slug === slug);
}
