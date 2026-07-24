import type { Link, PhrasingContent, Root, Text } from "mdast";
import { visit } from "unist-util-visit";

/**
 * Matches Obsidian-style wikilinks: [[target]] or [[target|alias]].
 * Exported so both the remark plugin (rendering) and the backlink graph
 * builder (content-collections.ts) use the exact same matcher — rendering
 * and graph-building can never disagree about what counts as a link.
 */
export const WIKILINK_PATTERN = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

export interface WikilinkMatch {
  /** raw matched text, e.g. "[[target|alias]]" */
  raw: string;
  /** the slug/target the link points at, trimmed */
  target: string;
  /** the display text, defaults to target when no alias is given */
  alias: string;
}

/** Extracts every wikilink in a string of raw MDX/markdown source. */
export function extractWikilinks(content: string): WikilinkMatch[] {
  const matches: WikilinkMatch[] = [];
  for (const match of content.matchAll(WIKILINK_PATTERN)) {
    const [raw, rawTarget, rawAlias] = match;
    const target = rawTarget.trim();
    const alias = (rawAlias ?? rawTarget).trim();
    matches.push({ raw, target, alias });
  }
  return matches;
}

/** Extracts the deduped set of outgoing link targets from raw MDX source. */
export function extractWikilinkTargets(content: string): string[] {
  return Array.from(new Set(extractWikilinks(content).map((m) => m.target)));
}

export interface RemarkWikilinkOptions {
  /** the set of valid note slugs a wikilink is allowed to resolve to */
  slugs: Set<string>;
  /** the source file the link was found in, used in the thrown error */
  sourceFile: string;
  /** builds the href for a resolved target, e.g. `(slug) => `/notes/${slug}`` */
  resolveHref: (target: string) => string;
}

/**
 * Remark plugin that turns `[[target]]` / `[[target|alias]]` text into real
 * links. Throws if a link's target isn't a known slug, naming both the
 * source file and the offending target so the build failure is actionable.
 */
export function remarkWikilink({ slugs, sourceFile, resolveHref }: RemarkWikilinkOptions) {
  return (tree: Root) => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (parent == null || index == null) return;
      if (!node.value.includes("[[")) return;

      WIKILINK_PATTERN.lastIndex = 0;
      const matches = extractWikilinks(node.value);
      if (matches.length === 0) return;

      for (const { target } of matches) {
        if (!slugs.has(target)) {
          throw new Error(
            `Unresolved wikilink [[${target}]] in "${sourceFile}" — no note with that slug exists.`,
          );
        }
      }

      const newNodes: PhrasingContent[] = [];
      let cursor = 0;
      WIKILINK_PATTERN.lastIndex = 0;
      let execResult: RegExpExecArray | null;
      while ((execResult = WIKILINK_PATTERN.exec(node.value)) !== null) {
        const [raw, rawTarget, rawAlias] = execResult;
        const target = rawTarget.trim();
        const alias = (rawAlias ?? rawTarget).trim();
        const start = execResult.index;

        if (start > cursor) {
          newNodes.push({ type: "text", value: node.value.slice(cursor, start) });
        }

        const link: Link = {
          type: "link",
          url: resolveHref(target),
          children: [{ type: "text", value: alias }],
        };
        newNodes.push(link);

        cursor = start + raw.length;
      }

      if (cursor < node.value.length) {
        newNodes.push({ type: "text", value: node.value.slice(cursor) });
      }

      parent.children.splice(index, 1, ...newNodes);
      return index + newNodes.length;
    });
  };
}
