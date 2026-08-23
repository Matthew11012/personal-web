"use client";

import Image from "next/image";
import Link from "next/link";
import { m } from "motion/react";
import { useState } from "react";

/** The gardener's accent, shared with /about so the two read as one voice. */
const ACCENT = "#9a8636";

/**
 * Frame 0 is the rest state — it shows whenever nothing is being pointed at,
 * focused, or tapped, which is why it isn't reachable from a phrase. The other
 * two are each owned by a marked phrase in the sentence below.
 */
const FRAMES = [
  {
    src: "/me/portrait.png",
    alt: "Matthew Rizky Hartadi",
    caption: "Matthew Rizky Hartadi — Brisbane",
    /* Keyed off its studio backdrop, so this one sits on the plate colour
       rather than covering it. */
    contain: true,
  },
  {
    src: "/me/hackathon.jpg",
    alt: "Matthew presenting UQuizzle on stage at UQ",
    caption: "UQuizzle, Team 1103 — UQ",
    contain: false,
  },
  {
    src: "/me/riding.jpg",
    alt: "Matthew at a lookout with two road bikes, city below",
    caption: "On the bike — Brisbane",
    contain: false,
  },
] as const;

export function IntroBand() {
  const [active, setActive] = useState(0);

  /* Pointer and focus are transient — leaving restores the portrait. Tap is
     sticky, because a touch reader has nowhere to move away to. */
  const phrase = (i: number) => ({
    type: "button" as const,
    className: "phrase",
    "data-active": active === i,
    onMouseEnter: () => setActive(i),
    onMouseLeave: () => setActive(0),
    onFocus: () => setActive(i),
    onBlur: () => setActive(0),
    onClick: () => setActive((prev) => (prev === i ? 0 : i)),
  });

  return (
    <section
      aria-label="About Matthew"
      className="mt-[clamp(8px,2vw,24px)]"
      style={{ ["--acc" as string]: ACCENT }}
    >
      <div className="grid grid-cols-1 items-start gap-[clamp(36px,5vw,72px)] md:grid-cols-[minmax(0,1fr)_clamp(300px,34vw,460px)]">
        <div>
          <div
            className="label-mono mb-[22px] tracking-[0.28em]"
            style={{ color: ACCENT }}
          >
            The gardener
          </div>

          <p className="about-body max-w-[40ch] text-ink">
            Three things take up most of my week: the retrieval systems I
            build, <button {...phrase(1)}>the weekends I lose to hackathons</button>,
            and <button {...phrase(2)}>triathlon training</button>. This garden
            is what falls out of them.
          </p>

          <Link
            href="/about"
            className="navlink label-mono mt-[clamp(24px,3vw,34px)] inline-flex tracking-[0.18em]"
            style={{ color: ACCENT }}
          >
            The long version →
          </Link>
        </div>

        <figure className="m-0">
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-plate">
            {FRAMES.map((frame, i) => (
              <m.div
                key={frame.src}
                className="absolute inset-0"
                initial={false}
                animate={{ opacity: active === i ? 1 : 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                aria-hidden={active !== i}
              >
                <Image
                  src={frame.src}
                  alt={active === i ? frame.alt : ""}
                  fill
                  sizes="(max-width: 768px) 100vw, 460px"
                  className={frame.contain ? "object-contain" : "object-cover"}
                  priority={i === 0}
                />
              </m.div>
            ))}
          </div>
          <figcaption className="label-mono mt-3 border-t border-hair pt-3 tracking-[0.16em] text-faint">
            {FRAMES[active].caption}
          </figcaption>
        </figure>
      </div>

      <div className="label-mono mt-[clamp(32px,4vw,48px)] flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-t border-hair pt-3.5 tracking-[0.18em] text-dim">
        <span className="text-ink">Grad student — retrieval &amp; applied AI</span>
        <span>Brisbane / Jakarta</span>
        <a
          href="/MatthewRizkyHartadi_CV.pdf"
          download
          className="navlink"
          style={{ color: ACCENT }}
        >
          CV — PDF, 91 KB ↓
        </a>
      </div>
    </section>
  );
}
