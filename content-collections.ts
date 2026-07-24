import { defineCollection, defineConfig } from "@content-collections/core";
import { compileMDX } from "@content-collections/mdx";
import readingTime from "reading-time";
import { z } from "zod";
import { PLOTS } from "./src/lib/plots";
import { extractWikilinkTargets, remarkWikilink } from "./src/lib/wikilink";

// Generated from PLOTS — one source of truth, so adding a plot can't drift
// from the schema.
const PLOT_SLUGS = PLOTS.map((plot) => plot.slug) as [string, ...string[]];
const STAGES = ["seedling", "budding", "evergreen"] as const;

type Backlink = {
  slug: string;
  title: string;
  excerpt: string;
};

type GraphNote = {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
};

/** Inverts the outgoing-link map into a per-note backlink list. Runs once
 * (wrapped in context.cache below), not per document. */
function buildBacklinkGraph(allNotes: GraphNote[]): Map<string, Backlink[]> {
  const slugs = new Set(allNotes.map((note) => note.slug));

  const backlinks = new Map<string, Backlink[]>();
  for (const note of allNotes) {
    const targets = extractWikilinkTargets(note.content).filter((target) =>
      slugs.has(target),
    );
    for (const target of targets) {
      const list = backlinks.get(target) ?? [];
      list.push({ slug: note.slug, title: note.title, excerpt: note.excerpt });
      backlinks.set(target, list);
    }
  }
  return backlinks;
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

const notes = defineCollection({
  name: "notes",
  directory: "content/notes",
  include: "*.mdx",
  schema: z.object({
    title: z.string(),
    plot: z.enum(PLOT_SLUGS),
    stage: z.enum(STAGES),
    planted: z.coerce.date(),
    tended: z.array(z.coerce.date()).min(1),
    excerpt: z.string(),
    margin: z.string().optional(),
    draft: z.boolean().default(false),
    content: z.string(),
  }),
  transform: async (doc, context) => {
    const slug = doc._meta.path;

    const allNotes = await context.collection.documents();
    const slugs = new Set(allNotes.map((note) => note._meta.path));

    const graphNotes: GraphNote[] = allNotes.map((note) => ({
      slug: note._meta.path,
      title: note.title,
      excerpt: note.excerpt,
      content: note.content,
    }));

    const graph = await context.cache(graphNotes, buildBacklinkGraph, {
      key: "backlink-graph",
    });

    const mdx = await compileMDX(context, doc, {
      remarkPlugins: [
        [
          remarkWikilink,
          {
            slugs,
            sourceFile: doc._meta.filePath,
            resolveHref: (target: string) => `/notes/${target}`,
          },
        ],
      ],
    });

    const stats = readingTime(doc.content);

    return {
      slug,
      title: doc.title,
      plotSlug: doc.plot,
      stage: doc.stage,
      plantedIso: doc.planted.toISOString().slice(0, 10),
      plantedLabel: formatMonthYear(doc.planted),
      tendedCount: doc.tended.length,
      readTime: `~${Math.max(1, Math.round(stats.minutes))} min`,
      excerpt: doc.excerpt,
      margin: doc.margin ?? "",
      draft: doc.draft,
      mdx,
      backlinks: graph.get(slug) ?? [],
    };
  },
});

export default defineConfig({
  content: [notes],
});
