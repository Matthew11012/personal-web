"use client";

import { useSyncExternalStore } from "react";

/** Matthew's own timezone. Named rather than an offset so it stays correct
 * across any future DST rule change without an edit here. */
const TIME_ZONE = "Australia/Brisbane";

function brisbaneTime() {
  return new Intl.DateTimeFormat("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIME_ZONE,
  }).format(new Date());
}

/** Ticks once a minute, because the clock displays minutes: a per-second timer
 * would wake the tab sixty times as often to produce the same string
 * fifty-nine of those times. The first tick is aligned to the top of the
 * minute, so the display is never up to a full minute stale. */
function subscribe(onChange: () => void) {
  let interval: ReturnType<typeof setInterval>;
  const align = setTimeout(() => {
    onChange();
    interval = setInterval(onChange, 60_000);
  }, 60_000 - (Date.now() % 60_000));

  return () => {
    clearTimeout(align);
    clearInterval(interval);
  };
}

/**
 * The local time where the site's author actually is, beside the availability
 * line in the hero.
 *
 * The clock is an external, mutable source rather than React state, so it is
 * read as one. That also gives the hydration gate for free: the server
 * snapshot is null, so the prerendered HTML and the hydration pass both render
 * nothing, and the real time appears on the first client render. A time is the
 * one thing a server genuinely cannot prerender - the HTML would be stamped at
 * build or request time and then corrected - and reserving a dash for it would
 * be the same flicker with an extra frame of wrong content in front of it.
 */
export function LocalClock({ className = "" }: { className?: string }) {
  const time = useSyncExternalStore(
    subscribe,
    brisbaneTime,
    () => null as string | null,
  );

  if (!time) return null;

  return <span className={className}>{time} Brisbane</span>;
}
