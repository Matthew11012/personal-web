import { defineCollection, defineConfig } from "@content-collections/core";
import type { Context } from "@content-collections/core";
import { compileMDX } from "@content-collections/mdx";
import readingTime from "reading-time";
import { z } from "zod";
import { PLOTS, WORKSHOP_ACCENT } from "./src/lib/plots";
import { extractWikilinkTargets, remarkWikilink } from "./src/lib/wikilink";
import type { NoteDoc, ProjectDoc, ResultFigure, ProjectLink } from "./src/lib/types";

// Generated from PLOTS — one source of truth, so adding a plot can't drift
// from the schema.
const PLOT_SLUGS = PLOTS.map((plot) => plot.slug) as [string, ...string[]];
const STAGES = ["seedling", "budding", "evergreen"] as const;

type Kind = "note" | "project";

/** A doc from either collection, as seen mid-transform. Collections
 * transform sequentially (config order), so `context.documents(other)`
 * returns the OTHER collection's raw pre-transform docs (._meta.path) if it
 * hasn't run yet, or its finished output (.slug) if it has. Both shapes are
 * handled uniformly here — this is the only place that needs to care. */
type SlugSource = {
  _meta?: { path: string; filePath?: string };
  slug?: string;
  draft: boolean;
};

function slugOf(doc: SlugSource): string {
  const slug = doc._meta?.path ?? doc.slug;
  if (!slug) {
    throw new Error(
      "content-collections: encountered a document with neither `_meta.path` nor `slug` while building the wikilink slug index — a transform likely stopped emitting `slug`.",
    );
  }
  return slug;
}

function hrefFor(kind: Kind, slug: string): string {
  return kind === "note" ? `/notes/${slug}` : `/work/${slug}`;
}

function fileFor(kind: Kind, slug: string): string {
  return kind === "note" ? `content/notes/${slug}.mdx` : `content/projects/${slug}.mdx`;
}

/** Builds the combined slug -> href map used for wikilink validation and
 * resolution, and throws if a note and a project share a slug (a shared
 * slug would make [[x]] ambiguous). Doesn't need raw content from either
 * side, so it's unaffected by transform order.
 *
 * Drafts are excluded entirely: a wikilink resolving to a draft would
 * compile to a live href production never generates (the draft is filtered
 * out in src/lib/content.ts). Failing the build here is louder but safer
 * than shipping a dead link. */
function buildSlugIndex(
  ownDocs: SlugSource[],
  ownKind: Kind,
  otherDocs: SlugSource[],
  otherKind: Kind,
): Map<string, string> {
  const index = new Map<string, { href: string; kind: Kind; filePath: string }>();
  for (const doc of ownDocs) {
    if (doc.draft) continue;
    const slug = slugOf(doc);
    index.set(slug, {
      href: hrefFor(ownKind, slug),
      kind: ownKind,
      filePath: doc._meta?.filePath ?? fileFor(ownKind, slug),
    });
  }
  for (const doc of otherDocs) {
    if (doc.draft) continue;
    const slug = slugOf(doc);
    const existing = index.get(slug);
    const otherFilePath = doc._meta?.filePath ?? fileFor(otherKind, slug);
    if (existing && existing.kind !== otherKind) {
      throw new Error(
        `Slug collision: "${slug}" is used by both ${existing.filePath} and ${otherFilePath}. Wikilinks to it would be ambiguous.`,
      );
    }
    index.set(slug, { href: hrefFor(otherKind, slug), kind: otherKind, filePath: otherFilePath });
  }
  return new Map(Array.from(index, ([slug, v]) => [slug, v.href]));
}

/** Stable fingerprint of the slug -> href map, used to fold the slug index
 * into compileMDX's cache key (see compileMdxWithSlugFingerprint below). */
function fingerprintSlugIndex(hrefBySlug: Map<string, string>): string {
  return Array.from(hrefBySlug.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slug, href]) => `${slug}:${href}`)
    .join("|");
}

/** compileMDX's own cache key is `{content, _meta}` only (see
 * @content-collections/mdx/dist/index.js) — it has no idea the compile also
 * closes over the slug index via `remarkWikilink`'s `resolveHref`/`slugs`
 * options. So when a document's own bytes are unchanged but some *other*
 * document's slug moved (e.g. a rename), a warm cache serves the stale
 * compiled output and the wikilink-validation remark plugin never re-runs.
 * We can't change compileMDX's internal cache key, so we wrap the `cache`
 * function it's given: fold `slugFingerprint` into the cached input (which
 * changes the hash), then strip it back off before handing the input to the
 * real compile function so its shape is unaffected. */
function compileMdxWithSlugFingerprint(
  context: Pick<Context, "cache">,
  doc: Parameters<typeof compileMDX>[1],
  options: Parameters<typeof compileMDX>[2],
  slugFingerprint: string,
) {
  const wrappedContext: Pick<Context, "cache"> = {
    cache: (input, fn, opts) =>
      context.cache(
        { ...(input as object), slugFingerprint },
        (wrapped) => {
          const original = { ...(wrapped as Record<string, unknown>) };
          delete original.slugFingerprint;
          return fn(original as typeof input);
        },
        opts,
      ),
  };
  return compileMDX(wrappedContext, doc, options);
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
    // Defaults to empty: a freshly planted note has genuinely never been
    // tended, and requiring an entry would force authors to invent one.
    tended: z.array(z.coerce.date()).default([]),
    excerpt: z.string(),
    margin: z.string().optional(),
    draft: z.boolean().default(false),
    content: z.string(),
  }),
  transform: async (doc, context): Promise<NoteDoc> => {
    const slug = doc._meta.path;

    const ownDocs = await context.collection.documents();
    // If a document earlier in this same collection (or the projects
    // collection, once it's transformed) is skipped via context.skip() or
    // fails the Serializable check, it silently drops out of
    // context.documents()/context.collection.documents() — shrinking the
    // slug set here and wrongly rejecting a wikilink that targets it.
    // Latent today (nothing currently skips), but worth knowing about.
    const otherDocs = await context.documents(projects);
    const hrefBySlug = buildSlugIndex(ownDocs, "note", otherDocs, "project");
    const slugs = new Set(hrefBySlug.keys());
    const slugFingerprint = fingerprintSlugIndex(hrefBySlug);

    const mdx = await compileMdxWithSlugFingerprint(
      context,
      doc,
      {
        remarkPlugins: [
          [
            remarkWikilink,
            {
              slugs,
              sourceFile: doc._meta.filePath,
              resolveHref: (target: string) => hrefBySlug.get(target)!,
            },
          ],
        ],
      },
      slugFingerprint,
    );

    const stats = readingTime(doc.content);
    const linkTargets = extractWikilinkTargets(doc.content).filter((target) =>
      slugs.has(target),
    );

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
      linkTargets,
    };
  },
});

const projects = defineCollection({
  name: "projects",
  directory: "content/projects",
  include: "*.mdx",
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    role: z.string(),
    period: z.string(),
    stack: z.array(z.string()).min(1),
    results: z
      .array(z.object({ figure: z.string(), caption: z.string() }))
      .max(3)
      .default([]),
    links: z
      .array(z.object({ label: z.string(), href: z.string() }))
      .default([]),
    excerpt: z.string(),
    order: z.number(),
    accent: z.string().optional(),
    draft: z.boolean().default(false),
    content: z.string(),
  }),
  transform: async (doc, context): Promise<ProjectDoc> => {
    const slug = doc._meta.path;

    const ownDocs = await context.collection.documents();
    // See the matching comment in the notes transform above — the same
    // context.skip()/Serializable-failure risk applies here in reverse.
    const otherDocs = await context.documents(notes);
    const hrefBySlug = buildSlugIndex(ownDocs, "project", otherDocs, "note");
    const slugs = new Set(hrefBySlug.keys());
    const slugFingerprint = fingerprintSlugIndex(hrefBySlug);

    const mdx = await compileMdxWithSlugFingerprint(
      context,
      doc,
      {
        remarkPlugins: [
          [
            remarkWikilink,
            {
              slugs,
              sourceFile: doc._meta.filePath,
              resolveHref: (target: string) => hrefBySlug.get(target)!,
            },
          ],
        ],
      },
      slugFingerprint,
    );

    const linkTargets = extractWikilinkTargets(doc.content).filter((target) =>
      slugs.has(target),
    );
    const results: ResultFigure[] = doc.results;
    const links: ProjectLink[] = doc.links;

    return {
      slug,
      title: doc.title,
      tagline: doc.tagline,
      role: doc.role,
      period: doc.period,
      stack: doc.stack,
      results,
      links,
      excerpt: doc.excerpt,
      order: doc.order,
      accent: doc.accent ?? WORKSHOP_ACCENT,
      draft: doc.draft,
      mdx,
      linkTargets,
    };
  },
});

export default defineConfig({
  content: [notes, projects],
});
