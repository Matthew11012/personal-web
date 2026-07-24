import type { MDXComponents } from "mdx/types";

/** Styles the elements a compiled note body can produce so they keep the
 * phase 1 look: JetBrains Mono uppercase h3 accents, prose paragraphs, and
 * accent-colored inline (wiki)links. The drop cap is CSS-only, applied via
 * `::first-letter` in globals.css — no component needed for it. */
export function createMdxComponents(accent: string): MDXComponents {
  return {
    h3: (props) => (
      <h3
        className="label-mono mb-[18px] mt-10 tracking-[0.18em]"
        style={{ color: accent }}
        {...props}
      />
    ),
    p: (props) => <p className="mb-[26px] last:mb-0" {...props} />,
    a: (props) => (
      <a
        className="underline decoration-dotted underline-offset-2 hover:no-underline"
        style={{ color: accent }}
        {...props}
      />
    ),
  };
}
