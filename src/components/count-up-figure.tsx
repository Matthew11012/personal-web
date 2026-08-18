"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";
import { COUNT_EASE } from "@/lib/motion";

// A single numeric token, optionally wrapped in non-digit prefix/suffix text
// (" km", "h", etc). Anything that doesn't match this shape — the em-dash
// placeholder for an empty discipline, or a string carrying more than one
// number — is rendered as-is with no animation. This guard is load-bearing:
// without it a malformed match would either throw or silently animate the
// wrong substring.
const NUMERIC_TOKEN = /^(\D*)(\d+(?:\.\d+)?)(\D*)$/;

// Longer than the site's 0.7–0.9s reveals: COUNT_EASE spends its last 40% of
// time on the final ~11% of the value, and that settle needs room to read as a
// glide rather than a pause before the last digit lands.
const DURATION = 1.4;

function decimalsOf(numberToken: string): number {
  const dot = numberToken.indexOf(".");
  return dot === -1 ? 0 : numberToken.length - dot - 1;
}

/** Animates the numeric token inside an already-formatted figure string
 * (e.g. "12.4 km", produced by formatDistanceKm) from zero up to its real
 * value once scrolled into view. `text` is never re-derived or reformatted
 * here — only parsed back apart and reassembled every frame, so the final
 * frame is byte-identical to the input. */
export function CountUpFigure({ text }: { text: string }) {
  // Memoised on `text`, never parsed inline: String.match returns a fresh array
  // on every render, and this value is an effect dependency below. An unstable
  // identity would re-run the count-up effect on every frame it renders, which
  // restarts the tween from the already-landed value and collapses the whole
  // animation into an instant snap to the final number.
  const match = useMemo(() => text.match(NUMERIC_TOKEN), [text]);
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });

  // The frame this figure counts from, derived purely from `text` so the
  // server and the client's first render produce the same string.
  const zeroFrame = match
    ? `${match[1]}${(0).toFixed(decimalsOf(match[2]))}${match[3]}`
    : text;

  // Rendered by the server, not the real value. Painting the truth and then
  // resetting it to zero once hydration lands showed ~120ms of the final
  // number before the count started — visible on any figure above the fold.
  // Starting from zero on both sides of the boundary removes that entirely.
  // The truth is still in the markup: the sr-only span below carries it for
  // assistive tech, and .countup-static carries it for readers who never run
  // this component's JS at all (see globals.css and the noscript in layout).
  const [display, setDisplay] = useState(zeroFrame);

  // Snap back to zero the moment a new `text` arrives, adjusting state during
  // render rather than in an effect so it lands before the browser paints.
  // Without it the previous total survives the frame or two before the tween's
  // first update, so switching the range flashed the old figure — the tail end
  // of the same "counting down" the from-zero animate() above removes.
  const [renderedText, setRenderedText] = useState(text);
  if (text !== renderedText) {
    setRenderedText(text);
    setDisplay(zeroFrame);
  }

  // `text` values this figure has fully counted out, and the one currently in
  // flight. Two refs rather than one because they answer different questions:
  // "is this done?" must survive an interrupted tween, while "is this already
  // running?" must not — otherwise a stopped animation can never be restarted.
  const completedTextRef = useRef<string | null>(null);
  const runningTextRef = useRef<string | null>(null);
  const controlsRef = useRef<ReturnType<typeof animate> | null>(null);

  // Forces exactly one extra evaluation of the effect below, on the frame
  // after mount. The App Router resets scroll *after* mount effects run, so a
  // figure reached by client-side navigation measures its position against the
  // previous page's scroll offset — off screen, from where nothing re-runs
  // this effect and the count never starts. One deferred re-check catches the
  // settled position. Bounded to a single tick on purpose: re-checking on
  // every frame would be a render loop for any figure legitimately below the
  // fold.
  const [recheck, setRecheck] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setRecheck(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Runs the count-up: on the first pass once the figure is on screen, and
  // again from zero whenever `text` changes (the range control).
  useEffect(() => {
    if (!match || reducedMotion) return;
    if (completedTextRef.current === text) return; // already counted this value
    if (runningTextRef.current === text) return; // already counting it

    const firstRun = completedTextRef.current === null;
    // Checked synchronously as well as via useInView. The observer hasn't
    // reported yet on the mount pass, so a figure already on screen would
    // otherwise sit at zero waiting for an intersection change that never
    // comes. A later `text` change skips the check: the reader has already
    // seen that figure.
    const node = ref.current;
    const onScreen =
      inView ||
      (node !== null &&
        (() => {
          const rect = node.getBoundingClientRect();
          return rect.top < window.innerHeight && rect.bottom > 0;
        })());
    if (firstRun && !onScreen) return;

    const [, prefix, numberToken, suffix] = match;
    const decimals = decimalsOf(numberToken);
    const target = Number(numberToken);

    // Always from zero, never from the value on screen. Tweening between the
    // old and new totals meant switching the range to a shorter window ran the
    // figure *downwards*, which reads as the number draining rather than as a
    // new total being counted out.
    controlsRef.current?.stop();
    runningTextRef.current = text;
    controlsRef.current = animate(0, target, {
      duration: DURATION,
      ease: COUNT_EASE,
      onUpdate(value) {
        setDisplay(`${prefix}${value.toFixed(decimals)}${suffix}`);
      },
      onComplete() {
        completedTextRef.current = text;
        runningTextRef.current = null;
      },
    });

    // No cleanup here on purpose: React runs an effect's cleanup on every
    // dependency change, and `inView` flipping true moments after the
    // synchronous check above already started the tween would otherwise stop
    // and restart the count mid-flight. The guards at the top make a re-run a
    // no-op instead. Teardown lives in the unmount effect below.
  }, [text, match, reducedMotion, inView, recheck]);

  // Unmount-only teardown. Clearing runningTextRef here is what keeps an
  // interrupted count restartable: React's Strict Mode mounts, runs effects,
  // runs cleanups, then runs the effects again, so without the reset the tween
  // would be stopped at zero and the re-run would see it as already in flight
  // and bail — leaving the figure stuck on 0 for the life of the page.
  useEffect(
    () => () => {
      controlsRef.current?.stop();
      runningTextRef.current = null;
    },
    [],
  );

  // No parsed number, or reduced motion: render `text` verbatim and skip the
  // tween state entirely (no effect needed to keep it "in sync" — it just
  // never diverges from the prop).
  const shown = !match || reducedMotion ? text : display;

  return (
    <span ref={ref}>
      <span className="countup-live" aria-hidden="true">
        {shown}
      </span>
      {/* The real figure, for anyone this component's JS never reaches: the
          server now sends the zero frame above, so without this a reader with
          scripts blocked would be told the training totals are 0. Hidden by
          default and revealed by CSS under prefers-reduced-motion, and by the
          noscript rule in layout.tsx when scripts are off. */}
      <span className="countup-static" aria-hidden="true">
        {text}
      </span>
      {/* One stable value for the a11y tree instead of churning digits. */}
      <span className="sr-only">{text}</span>
    </span>
  );
}
