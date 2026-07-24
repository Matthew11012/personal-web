import { allNotes } from "content-collections";
import type { Note } from "./types";

/** Drafts are excluded from production output, visible in dev. */
function isVisible(note: Note): boolean {
  return process.env.NODE_ENV !== "production" || !note.draft;
}

/** Every visible note, newest first. The only entry point pages should use —
 * phase 3 (projects) and phase 4 (Strava) extend this module rather than
 * touching every page. */
export function getAllNotes(): Note[] {
  return (allNotes as Note[])
    .filter(isVisible)
    .sort((a, b) => b.plantedIso.localeCompare(a.plantedIso));
}

export function getNote(slug: string): Note | undefined {
  return getAllNotes().find((note) => note.slug === slug);
}

export function getNotesByPlot(plotSlug: string): Note[] {
  return getAllNotes().filter((note) => note.plotSlug === plotSlug);
}

export function getRecentNotes(count: number): Note[] {
  return getAllNotes().slice(0, count);
}
