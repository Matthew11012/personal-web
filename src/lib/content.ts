import { allNotes, allProjects } from "content-collections";
import type { Backlink, Note, NoteDoc, Project, ProjectDoc } from "./types";

/** Drafts are excluded from production output, visible in dev. */
function isVisible(doc: { draft: boolean }): boolean {
  return process.env.NODE_ENV !== "production" || !doc.draft;
}

/** Inverts every doc's outgoing `linkTargets` into a per-slug backlink
 * list, spanning both collections. This has to live here rather than in
 * content-collections.ts: collections transform sequentially, so whichever
 * one transforms second only ever sees the other's already-finished
 * (post-transform) output via context.documents() — there's no point
 * inside the transform where both collections' raw content is
 * simultaneously available. Here, both are already plain, final data, so
 * there's no cycle to resolve. Computed once per module load. */
function buildBacklinkGraph(
  notes: NoteDoc[],
  projects: ProjectDoc[],
): Record<string, Backlink[]> {
  const backlinks: Record<string, Backlink[]> = {};

  const addEdges = (docs: (NoteDoc | ProjectDoc)[], kind: "note" | "project") => {
    for (const doc of docs) {
      for (const target of doc.linkTargets) {
        if (target === doc.slug) continue; // a doc linking to itself isn't a backlink
        const list = backlinks[target] ?? [];
        list.push({
          slug: doc.slug,
          title: doc.title,
          excerpt: doc.excerpt,
          href: kind === "note" ? `/notes/${doc.slug}` : `/work/${doc.slug}`,
          kind,
        });
        backlinks[target] = list;
      }
    }
  };

  addEdges(notes, "note");
  addEdges(projects, "project");
  return backlinks;
}

// Filter to visible docs before inverting: an unfiltered source side would
// publish a draft's title/excerpt into a live page's backlink rail, linking
// to a slug generateStaticParams never emits (404 in production). The
// target side needs no filtering — a backlink pointing at a draft target
// simply never renders, since getAllNotes/getAllProjects filter there.
const backlinkGraph = buildBacklinkGraph(
  (allNotes as NoteDoc[]).filter(isVisible),
  (allProjects as ProjectDoc[]).filter(isVisible),
);

/** Every visible note, newest first. The only entry point pages should use —
 * phase 3 (projects) and phase 4 (Strava) extend this module rather than
 * touching every page. */
export function getAllNotes(): Note[] {
  return (allNotes as NoteDoc[])
    .filter(isVisible)
    .map((note) => ({ ...note, backlinks: backlinkGraph[note.slug] ?? [] }))
    .sort((a, b) => b.plantedIso.localeCompare(a.plantedIso));
}

export function getNote(slug: string): Note | undefined {
  return getAllNotes().find((note) => note.slug === slug);
}

export function getNotesByPlot(plotSlug: string): Note[] {
  return getAllNotes().filter((note) => note.plotSlug === plotSlug);
}

/** Chronological siblings within the same plot: older (next-oldest planted)
 * and newer (next-newest planted), for prev/next footer nav. */
export function getAdjacentNotes(note: Note): { older?: Note; newer?: Note } {
  const siblings = getNotesByPlot(note.plotSlug);
  const index = siblings.findIndex((n) => n.slug === note.slug);
  return {
    older: siblings[index + 1],
    newer: index > 0 ? siblings[index - 1] : undefined,
  };
}

export function getRecentNotes(count: number): Note[] {
  return [...getAllNotes()]
    .sort(
      (a, b) =>
        Number(b.featured) - Number(a.featured) ||
        b.plantedIso.localeCompare(a.plantedIso),
    )
    .slice(0, count);
}

/** Every visible project, ordered by their `order` frontmatter (lower
 * first) — the same entry point pattern as getAllNotes above. */
export function getAllProjects(): Project[] {
  return (allProjects as ProjectDoc[])
    .filter(isVisible)
    .map((project) => ({
      ...project,
      backlinks: backlinkGraph[project.slug] ?? [],
    }))
    .sort((a, b) => a.order - b.order);
}

export function getProject(slug: string): Project | undefined {
  return getAllProjects().find((project) => project.slug === slug);
}
