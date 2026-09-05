"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export type BandKind = "base" | "invert";

/** Which colour band is currently passing under the site header.
 *
 * Bands mark themselves with `data-band` (see src/components/band.tsx). This
 * watches all of them through one IntersectionObserver whose root is squeezed
 * down to a strip the height of the header itself, so "active" means "actually
 * behind the chrome", not "somewhere on screen". Consumers - the header and
 * the rail - take the returned kind as a class and inherit everything else.
 *
 * Three details that are not optional:
 *
 * - The strip is measured from the header, not hardcoded. The header wraps to
 *   two rows below ~400px, and a stale height would swap the colours early or
 *   late by a whole row. Re-measured on resize.
 * - `pathname` re-attaches the observer on navigation. The App Router swaps the
 *   subtree without unmounting the header, so the previous page's band elements
 *   would otherwise stay observed and the new page's would never be seen.
 * - It starts, and stays, "base" until an invert band is genuinely under the
 *   header. Server HTML and the pre-hydration frame are therefore always the
 *   base pairing - never a mismatched one - and with scripts off it simply
 *   never changes, which is correct rather than merely safe.
 */
export function useActiveBand(): BandKind {
  const pathname = usePathname();
  /* Stamped with the path it was measured on, and read back as "base" the
     moment they disagree. Navigation swaps the page subtree without
     unmounting the header, so a plain BandKind would keep showing the
     previous page's band for the frame between render and the effect below
     re-attaching - and would keep showing it forever on a page that has no
     bands at all. */
  const [seen, setSeen] = useState<{ path: string; band: BandKind }>({
    path: pathname,
    band: "base",
  });

  useEffect(() => {
    const bands = Array.from(
      document.querySelectorAll<HTMLElement>("[data-band]"),
    );
    if (bands.length === 0) return;

    const live = new Set<Element>();
    let observer: IntersectionObserver | null = null;

    const sync = () => {
      /* Document order, and the LAST match wins. At a boundary crossing both
         the outgoing and incoming band touch the strip; the incoming one is
         the one whose edge just reached the header, and it is the later of
         the two in the DOM. */
      const active = bands.filter((el) => live.has(el)).pop();
      setSeen({
        path: pathname,
        band: active?.dataset.band === "invert" ? "invert" : "base",
      });
    };

    const attach = () => {
      observer?.disconnect();
      live.clear();
      const headerHeight =
        document.querySelector("header")?.getBoundingClientRect().height ?? 56;
      const below = Math.max(0, window.innerHeight - headerHeight);
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) live.add(entry.target);
            else live.delete(entry.target);
          }
          sync();
        },
        { rootMargin: `0px 0px -${below}px 0px`, threshold: 0 },
      );
      for (const el of bands) observer.observe(el);
    };

    attach();
    window.addEventListener("resize", attach);
    return () => {
      window.removeEventListener("resize", attach);
      observer?.disconnect();
    };
  }, [pathname]);

  return seen.path === pathname ? seen.band : "base";
}
