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
