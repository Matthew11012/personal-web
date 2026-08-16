"use client";

import {
  filterByRange,
  formatDistanceKm,
  formatRelativeDays,
  toDailyCells,
  toWeeklyBuckets,
  totalsByDiscipline,
} from "@/lib/training-derive";
import type { RangePreset, ResultFigure, TrainingActivity } from "@/lib/types";
import { ResultFigures } from "@/components/result-figures";
import { MetaStrip } from "@/components/meta-strip";
import { WeeklyVolume } from "./weekly-volume";
import { ConsistencyHeatmap } from "./consistency-heatmap";

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
  // Fixed for this unit. A follow-up unit promotes this to real state (with
  // URL sync) once the range control ships — every value below is derived
  // from this one constant, so that swap won't touch anything else here.
  const range: RangePreset = "all";

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
      <ResultFigures results={results} />
      <WeeklyVolume buckets={weeklyBuckets} />
      <ConsistencyHeatmap cells={dailyCells} />
      <div className="mt-[clamp(28px,4vw,44px)]">
        <MetaStrip items={["Training data via Strava", syncLabel]} border="top" />
      </div>
    </section>
  );
}
