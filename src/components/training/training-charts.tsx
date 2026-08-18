"use client";

import { useEffect, useState } from "react";
import {
  filterByRange,
  formatDistanceKm,
  formatRelativeDays,
  RANGE_PRESETS,
  toDailyCells,
  toWeeklyBuckets,
  totalsByDiscipline,
} from "@/lib/training-derive";
import type { RangePreset, ResultFigure, TrainingActivity } from "@/lib/types";
import { ResultFigures } from "@/components/result-figures";
import { MetaStrip } from "@/components/meta-strip";
import { WeeklyVolume } from "./weekly-volume";
import { ConsistencyHeatmap } from "./consistency-heatmap";
import { RangeControl } from "./range-control";

const DEFAULT_RANGE: RangePreset = "all";

/** Client half of the training band. Only ever imports from
 * training-derive.ts — never training.ts or db.ts, which would drag
 * postgres into the client bundle. */
export function TrainingCharts({
  activities,
  lastSyncedAt,
}: {
  activities: TrainingActivity[];
  lastSyncedAt: string | null;
}) {
  // Starts at the default so the prerendered HTML is deterministic and
  // matches the client's first render exactly (no hydration mismatch). The
  // real URL is read in a mount effect below, not with next/navigation's
  // useSearchParams: calling that from a client component on this
  // statically-rendered route (revalidate: 86400) forces a Suspense
  // bailout and the route stops being prerendered.
  const [range, setRange] = useState<RangePreset>(DEFAULT_RANGE);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("range");
    const preset = RANGE_PRESETS.find((option) => option.value === fromUrl);
    if (preset && preset.value !== DEFAULT_RANGE) {
      setRange(preset.value); // eslint-disable-line react-hooks/set-state-in-effect -- reconciling with the URL on mount, not a render loop
    }
  }, []);

  function handleRangeChange(next: RangePreset) {
    setRange(next);
    const params = new URLSearchParams(window.location.search);
    if (next === DEFAULT_RANGE) {
      params.delete("range");
    } else {
      params.set("range", next);
    }
    const query = params.toString();
    const url = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    // replaceState, not pushState: toggling a filter isn't a navigation and
    // shouldn't fill the back button with history entries.
    window.history.replaceState(null, "", url);
  }

  const filtered = filterByRange(activities, range);
  const totals = totalsByDiscipline(filtered);
  const weeklyBuckets = toWeeklyBuckets(filtered, range);
  const dailyCells = toDailyCells(filtered, range);

  const results: ResultFigure[] = [
    { figure: formatDistanceKm(totals.swim), caption: "swim" },
    { figure: formatDistanceKm(totals.bike), caption: "bike" },
    { figure: formatDistanceKm(totals.run), caption: "run" },
    // Captioned "combined", never just left as a fourth distance figure —
    // distance isn't summable across disciplines (40km on a bike isn't 40km
    // on foot), and the label is the only thing stopping it reading that way.
    { figure: formatDistanceKm(totals.combined), caption: "combined" },
  ];

  // formatRelativeDays takes a non-null Date; branch before calling it so a
  // never-synced feed (lastSyncedAt === null) still renders something honest
  // instead of throwing.
  const syncLabel = lastSyncedAt
    ? formatRelativeDays(new Date(lastSyncedAt))
    : "not yet synced";

  return (
    <section className="mb-[clamp(40px,6vw,64px)]">
      <RangeControl range={range} onChange={handleRangeChange} />
      <ResultFigures results={results} countUp />
      <WeeklyVolume buckets={weeklyBuckets} />
      <ConsistencyHeatmap cells={dailyCells} />
      <div className="mt-[clamp(28px,4vw,44px)]">
        <MetaStrip items={["Training data via Strava", syncLabel]} border="top" />
      </div>
    </section>
  );
}
