// Server-side only — queries strava_activities directly. Never import this
// from a client component; src/lib/training-derive.ts is the client-safe half.
import { getSql } from "./db";
import type { Discipline, TrainingActivity } from "./types";

/** Displayed history starts here. The sync deliberately fetches everything
 * Strava has and this filters at query time, so widening the window later is
 * a config change, not a re-sync.
 *
 * Pinned to UTC explicitly rather than left as a bare date: `::timestamptz`
 * resolves a naked date in the *session* timezone, which would silently shift
 * the boundary by hours if the database were ever not on UTC. */
export const TRAINING_HISTORY_START = "2026-01-01T00:00:00Z";

/** Strava's sport_type values mapped onto the three disciplines this plot
 * cares about. Anything not listed here (Walk, WeightTraining, Yoga, ...) is
 * dropped entirely by getTrainingActivities — this is a triathlon plot, not
 * an everything plot. Add new sport types here as Strava adds them. */
const SPORT_TYPE_TO_DISCIPLINE: Record<string, Discipline> = {
  Swim: "swim",
  Ride: "bike",
  VirtualRide: "bike",
  GravelRide: "bike",
  MountainBikeRide: "bike",
  EBikeRide: "bike",
  Run: "run",
  TrailRun: "run",
  VirtualRun: "run",
};

interface TrainingActivityRow {
  id: string;
  sport_type: string;
  start_date_local: Date;
  moving_time: number;
  distance: number;
}

/** Every publicly-visible swim/bike/run activity since TRAINING_HISTORY_START,
 * oldest first.
 *
 * Visibility is filtered to exactly 'everyone' — 'followers_only', 'only_me'
 * and NULL are all excluded. This fails closed on purpose: it's a privacy
 * filter, Matthew's Strava setting is the single source of truth, and an
 * unknown value must never be published. This is precisely why the webhook
 * exists — it's the only mechanism that propagates a privacy change here.
 *
 * Must be called from a request/render, never at module scope — a
 * module-scope read would freeze the data at build time. */
export async function getTrainingActivities(): Promise<TrainingActivity[]> {
  const sql = getSql();
  const rows = await sql<TrainingActivityRow[]>`
    SELECT id::text, sport_type, start_date_local, moving_time, distance
    FROM strava_activities
    WHERE start_date_local >= ${TRAINING_HISTORY_START}::timestamptz
      AND visibility = 'everyone'
    ORDER BY start_date_local ASC
  `;

  const activities: TrainingActivity[] = [];
  for (const row of rows) {
    const discipline = SPORT_TYPE_TO_DISCIPLINE[row.sport_type];
    if (!discipline) continue; // not swim/bike/run — out of scope for this plot
    activities.push({
      id: row.id,
      discipline,
      startLocal: row.start_date_local.toISOString(),
      movingSeconds: row.moving_time,
      distanceMetres: row.distance,
    });
  }
  return activities;
}

/** Drives the "updated N days ago" readout — the only failure signal anyone
 * will actually notice if the sync cron dies silently. */
export async function getLastSyncedAt(): Promise<Date | null> {
  const rows = await getSql()<{ synced_at: Date | null }[]>`
    SELECT MAX(synced_at) AS synced_at FROM strava_activities
  `;
  return rows[0]?.synced_at ?? null;
}
