import type { EntrySummary, Note, NoteBlock, Stage } from "./types";
import { PLOTS } from "./plots";

/**
 * Temporary placeholder content. Phase 2 replaces this module with a real
 * MDX/content-collection layer — the shapes (Note, EntrySummary) are the
 * contract that the components consume, so the swap is drop-in.
 */

export interface HomeEntry {
  slug: string;
  n: string;
  plotSlug: string;
  plotName: string;
  stage: Stage;
  accent: string;
  title: string;
  titleClass: string;
  staggerClass: string;
  excerpt: string;
}

export const HOME_ENTRIES: HomeEntry[] = [
  {
    slug: "black-belt-debugging",
    n: "01",
    plotSlug: "taekwondo",
    plotName: "Taekwondo",
    stage: "budding",
    accent: "#b0573f",
    title: "What a black belt taught me about debugging",
    titleClass: "entry-title-1",
    staggerClass: "stagger-0",
    excerpt:
      "Panic makes you faster and worse. On the mat and in the stack trace, the fix is the same: slow down first.",
  },
  {
    slug: "rag-query-volume",
    n: "02",
    plotSlug: "engineering",
    plotName: "Engineering",
    stage: "evergreen",
    accent: "#4f6d9e",
    title: "Cutting RAG query volume by 99.8%",
    titleClass: "entry-title-2",
    staggerClass: "stagger-1",
    excerpt: "The cheapest retrieval is the one you don't run.",
  },
  {
    slug: "first-olympic-tri",
    n: "03",
    plotSlug: "triathlon",
    plotName: "Triathlon",
    stage: "seedling",
    accent: "#3f8a8a",
    title: "Race report: my first Olympic-distance tri",
    titleClass: "entry-title-3",
    staggerClass: "stagger-2",
    excerpt: "The swim was chaos, the bike was math, the run was honesty.",
  },
  {
    slug: "jakarta-brisbane",
    n: "04",
    plotSlug: "life",
    plotName: "Life",
    stage: "budding",
    accent: "#9a8636",
    title: "Living between Jakarta and Brisbane",
    titleClass: "entry-title-4",
    staggerClass: "stagger-3",
    excerpt:
      "Always slightly foreign in both. I've stopped calling that a problem.",
  },
];

const ENTRY_TEMPLATE: { title: string; stage: Stage; date: string }[] = [
  { title: "Cutting RAG query volume by 99.8%", stage: "evergreen", date: "May 2026" },
  { title: "A cache is a bet on the future", stage: "budding", date: "May 2026" },
  { title: "Evals I actually trust", stage: "budding", date: "Apr 2026" },
  {
    title: "When to fine-tune, and when to just ask nicely",
    stage: "seedling",
    date: "Mar 2026",
  },
  {
    title: "The observability I wish I had at 2am",
    stage: "evergreen",
    date: "Feb 2026",
  },
  {
    title: "Notes on shipping a model no one notices",
    stage: "seedling",
    date: "Jan 2026",
  },
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Six placeholder entries per plot page — the engineering set from the
 * prototype, reused across every plot as placeholder data. */
export function getPlotEntries(plotSlug: string): EntrySummary[] {
  return ENTRY_TEMPLATE.map((e, i) => {
    const n = pad(i + 1);
    const slug =
      plotSlug === "engineering" && n === "01"
        ? "rag-query-volume"
        : `${plotSlug}-entry-${n}`;
    return {
      slug,
      n,
      title: e.title,
      stage: e.stage,
      date: e.date,
      plotSlug,
    };
  });
}

function genericBody(title: string, plotName: string): NoteBlock[] {
  return [
    {
      type: "p",
      text: `This is a placeholder note for "${title}." In the ${plotName} plot, this entry will eventually carry real, tended writing — for now it exists to prove the routing, typography, and layout hold up before there's real prose to fill them.`,
    },
    {
      type: "p",
      text: "The garden format cares more about the shape of thinking than the shape of the finished piece. Structure comes first: a title, a stage, a date, a place in the index. The words arrive after.",
    },
    { type: "h3", text: "What goes here eventually" },
    {
      type: "p",
      text: "A real version of this note will replace this paragraph once the content layer in phase two is wired up — same slug, same URL, same place in the plot.",
    },
    {
      type: "p",
      text: "Until then, treat this as scaffolding: load-bearing, but not the finished room.",
    },
  ];
}

const BLACK_BELT_DEBUGGING: Note = {
  slug: "black-belt-debugging",
  title: "What a black belt taught me about debugging",
  plotSlug: "taekwondo",
  stage: "budding",
  plantedIso: "2026-06-01",
  plantedLabel: "Jun 2026",
  tendedCount: 3,
  readTime: "~6 min",
  excerpt:
    "Panic makes you faster and worse. On the mat and in the stack trace, the fix is the same: slow down first.",
  margin: [
    '"Slow is smooth, smooth is fast" is a shooting-range aphorism too.',
    "It travels well because it's true anywhere speed is a trap.",
  ].join(" "),
  growsInto: {
    slug: "rag-query-volume",
    title: "Cutting RAG query volume by 99.8% →",
    blurb: "The same slow-down instinct, applied to a retrieval budget.",
  },
  body: [
    {
      type: "p",
      text: "Panic makes you faster and worse. I learned that on a mat, sparring someone a full belt above me, throwing techniques so quickly that none of them landed. My instructor stopped the round and said one thing: slow is smooth, smooth is fast.",
    },
    {
      type: "p",
      text: "Years later I watched myself do the exact same thing at 2am, staring at a production incident. Reflexive changes. Restart the service. Roll back the deploy. Add a log line, redeploy, refresh, repeat — the debugging equivalent of throwing wild kicks and hoping one connects.",
    },
    { type: "h3", text: "Read the whole board first" },
    {
      type: "p",
      text: "In taekwondo you don't react to the hand — you read the hips. The tell is upstream of the strike. Debugging is the same discipline: the exception you see is rarely where the fault is. Resisting the urge to fix the first red line, and instead reading the whole trace, is the entire skill.",
    },
    {
      type: "p",
      text: "So now I do the boring thing. I reproduce it once, deliberately, before I touch anything. I write down what I expect to be true. Half the time the act of writing it down is the fix.",
    },
    { type: "h3", text: "The fix is the same" },
    {
      type: "p",
      text: "Pressure narrows attention — that's biology, not weakness. The counter isn't to feel calmer; it's to have a slower ritual you fall back into when you don't. On the mat it's your guard and your breathing. In the stack trace it's reproduce, hypothesize, isolate. Same nervous system. Same fix.",
    },
  ],
};

function buildNotesMap(): Record<string, Note> {
  const notes: Record<string, Note> = {
    "black-belt-debugging": BLACK_BELT_DEBUGGING,
  };

  for (const home of HOME_ENTRIES) {
    if (notes[home.slug]) continue;
    notes[home.slug] = {
      slug: home.slug,
      title: home.title,
      plotSlug: home.plotSlug,
      stage: home.stage,
      plantedIso: "2026-05-01",
      plantedLabel: "May 2026",
      tendedCount: 1,
      readTime: "~4 min",
      excerpt: home.excerpt,
      margin: "A short aside that didn't fit the main column, kept here anyway.",
      body: genericBody(home.title, home.plotName),
    };
  }

  for (const plot of PLOTS) {
    const entries = getPlotEntries(plot.slug);
    entries.forEach((entry, i) => {
      if (notes[entry.slug]) return;
      const next = entries[(i + 1) % entries.length];
      notes[entry.slug] = {
        slug: entry.slug,
        title: entry.title,
        plotSlug: plot.slug,
        stage: entry.stage,
        plantedIso: "2026-01-01",
        plantedLabel: entry.date,
        tendedCount: 1,
        readTime: "~5 min",
        excerpt: `Notes from the ${plot.name} plot, still taking shape.`,
        margin: "A short aside that didn't fit the main column, kept here anyway.",
        growsInto: {
          slug: next.slug,
          title: `${next.title} →`,
          blurb: "Continued thinking, one entry over.",
        },
        body: genericBody(entry.title, plot.name),
      };
    });
  }

  return notes;
}

export const NOTES: Record<string, Note> = buildNotesMap();

export function getNote(slug: string): Note | undefined {
  return NOTES[slug];
}

export function getAllNoteSlugs(): string[] {
  return Object.keys(NOTES);
}
