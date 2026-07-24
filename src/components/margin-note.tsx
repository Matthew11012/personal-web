import Link from "next/link";
import type { GrowsInto } from "@/lib/types";

export function MarginNote({
  margin,
  growsInto,
}: {
  margin: string;
  growsInto?: GrowsInto;
}) {
  return (
    <aside className="self-start border-l border-rule pl-[22px]">
      <div className="label-mono mb-3 text-[10px] tracking-[0.16em] text-faint">
        Margin
      </div>
      <p className="margin-copy text-dim">{margin}</p>

      {growsInto && (
        <>
          <div className="label-mono mb-3 mt-6 text-[10px] tracking-[0.16em] text-faint">
            Grows into
          </div>
          <Link
            href={`/notes/${growsInto.slug}`}
            className="mb-2.5 block font-display text-[19px] leading-[1.15] text-ink hover:text-[#4f6d9e]"
          >
            {growsInto.title}
          </Link>
          <div className="font-body text-[13px] text-faint">
            {growsInto.blurb}
          </div>
        </>
      )}
    </aside>
  );
}
