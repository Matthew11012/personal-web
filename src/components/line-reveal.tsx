"use client";

import { m } from "motion/react";
import { Fragment } from "react";
import { lineWordVariants, lineWordsContainer } from "@/lib/motion";

/**
 * A display heading that rises into view one word at a time from behind its
 * own baseline, replacing `Reveal as="wipein"` where the heading is the thing
 * being revealed rather than a block that happens to contain one.
 *
 * Per word, not per rendered line, and that is a deliberate simplification.
 * Splitting on real line boxes means measuring the DOM, re-measuring on every
 * resize and font swap, and keeping a hidden copy of the text around to
 * measure against - all to land on an effect a reader cannot distinguish from
 * this one at these sizes. Wrapping words needs no measurement, so it cannot
 * go stale, and it reflows correctly for free.
 *
 * What it must not break, and does not:
 *
 * - The accessible name. Every word is a real text node inside the heading, in
 *   order, so assistive tech reads the sentence exactly as authored.
 * - Selection and copy. The spaces are real (rendered between the spans, not
 *   faked with margin), so a drag-select copies normal prose.
 * - Descenders. `overflow-hidden` on a word box would slice the tail off a
 *   "g" or a "y"; the mask therefore carries bottom padding and takes it back
 *   with an equal negative margin, so the clip line sits below the descender
 *   without changing where the text sits.
 *
 * Motion is `y` plus opacity - both transforms as far as Motion is concerned,
 * so `MotionConfig reducedMotion="user"` collapses this to a static heading on
 * its own. Unlike `clip-path`, which would have needed the same manual
 * `useReducedMotion()` gate the scroll-driven work does, and unlike `Reveal`,
 * this fires on `whileInView`: a heading most of the way down a 14-viewport
 * page should animate when it is reached, not while the page is still loading.
 */
export function LineReveal({
  text,
  as: Tag = "h2",
  className = "",
  delay = 0,
}: {
  text: string;
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  delay?: number;
}) {
  const MotionTag = m[Tag];
  const words = text.split(" ");

  return (
    <MotionTag
      className={className}
      variants={lineWordsContainer(delay)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
    >
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          {/* inline-block, not inline-flex: an inline-flex mask makes every
              word a flex container, and innerText - which is what a copy of a
              selection actually yields - inserts a line break between them,
              so the headline pasted one word per line. */}
          <span className="inline-block overflow-hidden pb-[0.14em] mb-[-0.14em] align-bottom">
            <m.span variants={lineWordVariants} className="inline-block">
              {word}
            </m.span>
          </span>
          {/* A real space, outside the mask so it is neither clipped nor
              animated. Without it the spans sit flush and the heading copies
              as one run-on word. */}
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </MotionTag>
  );
}
