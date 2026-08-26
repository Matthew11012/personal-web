import type { MDXComponents } from "mdx/types";

/** Styles the elements a compiled note body can produce so they keep the
 * phase 1 look: JetBrains Mono uppercase section accents, prose paragraphs, and
 * accent-colored inline (wiki)links. The drop cap is CSS-only, applied via
 * `::first-letter` in globals.css — no component needed for it. */
export function createMdxComponents(accent: string): MDXComponents {
  /* A note body's sections sit under the page's own h1 (the note title), so
     they render as h2 whatever level the author typed. Both keys map here on
     purpose: today's placeholder notes all use `###`, but `##` is the level a
     writer reaches for first, and an unmapped `##` would emit a bare h2 with
     none of this styling — a silent regression the markup wouldn't show. */
  const section = (props: React.ComponentProps<"h2">) => (
    <h2
      className="label-mono mb-[18px] mt-10 tracking-[0.18em]"
      style={{ color: accent }}
      {...props}
    />
  );

  return {
    h2: section,
    h3: section,
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
