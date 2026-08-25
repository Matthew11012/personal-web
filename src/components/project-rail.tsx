import Link from "next/link";
import type { Backlink, ProjectLink } from "@/lib/types";

/** Metadata rail for a case study — reuses MarginNote's column styling
 * (label-mono headings, hairline-free plain text, no chips) with sections
 * for role, period, stack, links, and note backlinks. Links and the
 * "Notes from this build" section render only when non-empty. */
export function ProjectRail({
  role,
  period,
  stack,
  links,
  backlinks,
}: {
  role: string;
  period: string;
  stack: string[];
  links: ProjectLink[];
  backlinks: Backlink[];
}) {
  return (
    <aside className="self-start border-l border-rule pl-[22px]">
      <div className="label-mono mb-3 text-[10px] tracking-[0.16em] text-faint">
        Role
      </div>
      <p className="mb-6 font-body text-[14px] text-dim">{role}</p>

      <div className="label-mono mb-3 text-[10px] tracking-[0.16em] text-faint">
        Period
      </div>
      <p className="mb-6 font-body text-[14px] text-dim">{period}</p>

      {stack.length > 0 && (
        <>
          <div className="label-mono mb-3 text-[10px] tracking-[0.16em] text-faint">
            Stack
          </div>
          <p className="mb-6 font-mono text-[13px] leading-[1.6] text-dim">
            {stack.join(", ")}
          </p>
        </>
      )}

      {links.length > 0 && (
        <>
          <div className="label-mono mb-3 text-[10px] tracking-[0.16em] text-faint">
            Links
          </div>
          <ul className="mb-6">
            {links.map((link, index) => (
              <li key={index} className="mb-2 last:mb-0">
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-body text-[14px] underline decoration-dotted underline-offset-2 hover:no-underline"
                  style={{ color: "var(--acc)" }}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}

      {backlinks.length > 0 && (
        <>
          <div className="label-mono mb-3 text-[10px] tracking-[0.16em] text-faint">
            Notes from this build
          </div>
          {backlinks.map((backlink, index) => (
            <div key={index} className="mb-5 last:mb-0">
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
