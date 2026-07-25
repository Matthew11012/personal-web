import Link from "next/link";
import type { Backlink } from "@/lib/types";

export function MarginNote({
  margin,
  backlinks,
}: {
  margin: string;
  backlinks: Backlink[];
}) {
  return (
    <aside className="self-start border-l border-rule pl-[22px]">
      <div className="label-mono mb-3 text-[10px] tracking-[0.16em] text-faint">
        Margin
      </div>
      <p className="margin-copy text-dim">{margin}</p>

      {backlinks.length > 0 && (
        <>
          <div className="label-mono mb-3 mt-6 text-[10px] tracking-[0.16em] text-faint">
            Grows into
          </div>
          {backlinks.map((backlink) => (
            <div key={backlink.slug} className="mb-5 last:mb-0">
              {backlink.kind === "project" && (
                <div className="label-mono mb-1 text-[9px] tracking-[0.14em] text-faint">
                  From the workshop
                </div>
              )}
              <Link
                href={backlink.href}
                className="mb-2.5 block font-display text-[19px] leading-[1.15] text-ink hover:text-[var(--acc)]"
              >
                {backlink.title} <span aria-hidden="true">→</span>
              </Link>
              <div className="font-body text-[13px] text-faint">
                {backlink.excerpt}
              </div>
            </div>
          ))}
        </>
      )}
    </aside>
  );
}
