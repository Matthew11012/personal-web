export type Stage = "seedling" | "budding" | "evergreen";

export interface Plot {
  slug: string;
  name: string;
  /** short name used in nav/eyebrow contexts, e.g. "Engineering" */
  short: string;
  accent: string;
  index: string; // "01".."04"
  /** one-line description used in the home-page plot index row */
  description: string;
  /** italic tagline shown under the h1 on the plot page */
  tagline: string;
}

export interface EntrySummary {
  slug: string;
  n: string; // "01".."06"
  title: string;
  stage: Stage;
  date: string; // "May 2026"
  plotSlug: string;
}

export interface Backlink {
  slug: string;
  title: string;
  excerpt: string;
  /** where the backlink points, e.g. "/notes/foo" or "/work/foo" */
  href: string;
  kind: "note" | "project";
}

export interface Note {
  slug: string;
  title: string;
  plotSlug: string;
  stage: Stage;
  plantedIso: string; // e.g. "2026-06-01"
  plantedLabel: string; // "Jun 2026"
  tendedCount: number;
  readTime: string; // "~6 min"
  excerpt: string; // italic lede, used on home cards
  mdx: string; // compiled MDX (mdx-bundler code string), rendered via <MDXContent>
  margin: string;
  draft: boolean;
  backlinks: Backlink[];
}

/** The shape content-collections actually produces for a note: outgoing
 * wikilink targets instead of resolved backlinks. Backlinks can't be
 * derived inside content-collections.ts — collections transform
 * sequentially, so whichever collection runs second only ever sees the
 * other collection's already-transformed (post-backlink) output. src/lib
 * /content.ts inverts `linkTargets` into `Backlink[]` once both collections'
 * plain output exists, which is also where the note/project cycle actually
 * resolves.
 *
 * A plain `type`, not an `interface`: content-collections structurally
 * checks the transform's return type against its Serializable constraint,
 * and an `interface` (even with identical fields) fails that check where a
 * `type` alias passes. */
export type NoteDoc = Omit<Note, "backlinks"> & {
  linkTargets: string[];
};

// Plain `type`s, not `interface`s: these are nested inside NoteDoc/
// ProjectDoc, and an interface anywhere in that shape fails
// content-collections' structural Serializable check even when the fields
// are identical to a type alias's.
export type ResultFigure = {
  figure: string; // e.g. "99.8%" or "5.3s → 0.37s"
  caption: string;
};

export type ProjectLink = {
  label: string;
  href: string;
};

export interface Project {
  slug: string;
  title: string;
  tagline: string;
  role: string;
  period: string; // free string, e.g. "2025"
  stack: string[];
  results: ResultFigure[]; // 0-3
  links: ProjectLink[];
  excerpt: string;
  order: number;
  accent: string;
  draft: boolean;
  mdx: string;
  backlinks: Backlink[];
}

/** The content-collections output shape for a project — see NoteDoc. */
export type ProjectDoc = Omit<Project, "backlinks"> & {
  linkTargets: string[];
};

/** Slim summary used on the /work index row. A Pick off Project so the two
 * can't drift. `order` isn't included — the row never reads it, sorting
 * happens once in getAllProjects(). */
export type ProjectSummary = Pick<
  Project,
  "slug" | "title" | "tagline" | "period" | "accent"
>;

// -- Training (phase 4 / Strava) -----------------------------------------

export type Discipline = "swim" | "bike" | "run";

/** One activity, reduced to what the charts actually plot. Kept deliberately
 *  small: the whole array is serialised into the page. */
export interface TrainingActivity {
  id: string; // Strava's id as a string — see the int8 note in strava.ts
  discipline: Discipline;
  startLocal: string; // ISO string; local wall-clock time wearing a fake Z — read with UTC accessors only
  movingSeconds: number;
  distanceMetres: number;
}

export type RangePreset = "all" | "ytd" | "12w" | "4w";

export interface RangePresetOption {
  value: RangePreset;
  label: string;
}

/** Moving time per discipline for one calendar week (Monday 00:00 UTC start).
 * Present for every week in a range, even ones with no activity at all. */
export interface WeeklyBucket {
  weekStart: string; // ISO date, Monday 00:00 UTC
  swim: number; // moving seconds
  bike: number;
  run: number;
}

/** Distance per discipline over some set of activities. */
export interface DisciplineTotals {
  swim: number; // metres
  bike: number;
  run: number;
  combined: number;
}

/** One day's totals for the consistency heatmap. Present for every day in a
 * range, even rest days. */
export interface DailyCell {
  date: string; // ISO date (UTC), e.g. "2026-03-14"
  swim: number; // moving seconds
  bike: number;
  run: number;
  total: number;
}
