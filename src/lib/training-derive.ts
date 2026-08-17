// Pure functions only — no imports from db/strava/postgres, no server-only,
// no Node built-ins. A "use client" component (the plot page) imports this
// module directly, so it must be safe to ship to the browser.
//
// `startLocal` is the athlete's local wall-clock time wearing a fake `Z` (see
// src/lib/strava.ts): reading it back in UTC yields the wall clock the
// session was actually lived at. Every date operation in this file therefore
// uses the UTC accessors — getUTCDay, getUTCFullYear, getUTCMonth,
// getUTCDate, setUTCDate — never the local ones, which would apply the
// *viewer's* timezone on top and shift sessions into the wrong day or week.
import type {
  DailyCell,
  DisciplineTotals,
  DisciplineVolume,
  RangePreset,
  RangePresetOption,
  TrainingActivity,
  WeeklyBucket,
} from "./types";

function zeroVolume(): DisciplineVolume {
  return { seconds: 0, metres: 0 };
}

export const RANGE_PRESETS: RangePresetOption[] = [
  { value: "4w", label: "4 weeks" },
  { value: "12w", label: "12 weeks" },
  { value: "ytd", label: "Year to date" },
  { value: "all", label: "All time" },
];

function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function dayStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** The Monday of `date`'s week, at 00:00 UTC. getUTCDay() returns 0 for
 * Sunday, which is the off-by-one to watch for here. */
export function weekStart(date: Date): Date {
  const day = date.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  return addDays(dayStart(date), -daysSinceMonday);
}

/** Bounds shared by filterByRange and the bucketing functions below, so a
 * preset means the same window everywhere it's used. `start: null` means
 * "no fixed lower bound" (the "all" preset) — callers fall back to the
 * earliest activity they have. */
function rangeBounds(preset: RangePreset, now: Date): { start: Date | null; end: Date } {
  switch (preset) {
    case "all":
      return { start: null, end: now };
    case "ytd":
      return { start: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)), end: now };
    case "12w":
      return { start: addDays(now, -12 * 7), end: now };
    case "4w":
      return { start: addDays(now, -4 * 7), end: now };
  }
}

/** `now` is an injectable parameter (default: the current date) so range
 * filtering is deterministic and testable. */
export function filterByRange(
  activities: TrainingActivity[],
  preset: RangePreset,
  now: Date = new Date(),
): TrainingActivity[] {
  const { start, end } = rangeBounds(preset, now);
  return activities.filter((activity) => {
    const at = new Date(activity.startLocal).getTime();
    if (start && at < start.getTime()) return false;
    return at <= end.getTime();
  });
}

/** Earliest activity's start, or null for an empty list — used to anchor the
 * "all" preset, which has no fixed lower bound of its own. */
function earliestStart(activities: TrainingActivity[]): Date | null {
  if (activities.length === 0) return null;
  return activities.reduce<Date>((earliest, activity) => {
    const at = new Date(activity.startLocal);
    return at < earliest ? at : earliest;
  }, new Date(activities[0].startLocal));
}

/** One bucket per week in the range, including weeks with zero activities —
 * a chart that silently omits a rest week draws a lie. Weeks bucket on
 * startLocal via weekStart, not on any UTC-shifted approximation. */
export function toWeeklyBuckets(
  activities: TrainingActivity[],
  range: RangePreset,
  now: Date = new Date(),
): WeeklyBucket[] {
  const { start, end } = rangeBounds(range, now);
  const lowerBound = start ?? earliestStart(activities);
  if (!lowerBound) return []; // "all" with no activities at all: nothing to bucket

  const firstWeek = weekStart(lowerBound);
  const lastWeek = weekStart(end);

  const buckets = new Map<string, WeeklyBucket>();
  for (let cursor = firstWeek; cursor.getTime() <= lastWeek.getTime(); cursor = addDays(cursor, 7)) {
    const key = cursor.toISOString().slice(0, 10);
    buckets.set(key, { weekStart: key, swim: zeroVolume(), bike: zeroVolume(), run: zeroVolume(), total: zeroVolume() });
  }

  for (const activity of activities) {
    const key = weekStart(new Date(activity.startLocal)).toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue; // outside the bucketed range — shouldn't happen for already-filtered input
    bucket[activity.discipline].seconds += activity.movingSeconds;
    bucket[activity.discipline].metres += activity.distanceMetres;
    bucket.total.seconds += activity.movingSeconds;
    bucket.total.metres += activity.distanceMetres;
  }

  return Array.from(buckets.values());
}

/** Day-level totals for the consistency heatmap. Same fill-the-gaps rule as
 * toWeeklyBuckets, at day granularity. */
export function toDailyCells(
  activities: TrainingActivity[],
  range: RangePreset,
  now: Date = new Date(),
): DailyCell[] {
  const { start, end } = rangeBounds(range, now);
  const lowerBound = start ?? earliestStart(activities);
  if (!lowerBound) return [];

  const firstDay = dayStart(lowerBound);
  const lastDay = dayStart(end);

  const cells = new Map<string, DailyCell>();
  for (let cursor = firstDay; cursor.getTime() <= lastDay.getTime(); cursor = addDays(cursor, 1)) {
    const key = cursor.toISOString().slice(0, 10);
    cells.set(key, { date: key, swim: zeroVolume(), bike: zeroVolume(), run: zeroVolume(), total: zeroVolume() });
  }

  for (const activity of activities) {
    const key = dayStart(new Date(activity.startLocal)).toISOString().slice(0, 10);
    const cell = cells.get(key);
    if (!cell) continue;
    cell[activity.discipline].seconds += activity.movingSeconds;
    cell[activity.discipline].metres += activity.distanceMetres;
    cell.total.seconds += activity.movingSeconds;
    cell.total.metres += activity.distanceMetres;
  }

  return Array.from(cells.values());
}

/** Distance per discipline over a set of activities, plus a combined figure.
 * Zero activities yields all-zero totals rather than NaN. */
export function totalsByDiscipline(activities: TrainingActivity[]): DisciplineTotals {
  const totals: DisciplineTotals = { swim: 0, bike: 0, run: 0, combined: 0 };
  for (const activity of activities) {
    totals[activity.discipline] += activity.distanceMetres;
    totals.combined += activity.distanceMetres;
  }
  return totals;
}

export function formatDistanceKm(metres: number): string {
  const km = metres / 1000;
  return `${km.toFixed(km >= 100 ? 0 : 1)} km`;
}

export function formatHours(seconds: number): string {
  const hours = seconds / 3600;
  return `${hours.toFixed(hours >= 10 ? 0 : 1)}h`;
}

/** "updated today" / "updated yesterday" / "updated N days ago". Compares
 * UTC calendar days, consistent with every other date op in this file. */
export function formatRelativeDays(date: Date, now: Date = new Date()): string {
  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.round((dayStart(now).getTime() - dayStart(date).getTime()) / msPerDay);
  if (days <= 0) return "updated today";
  if (days === 1) return "updated yesterday";
  return `updated ${days} days ago`;
}

/** Fixed duration thresholds for the consistency heatmap, in seconds.
 *  Absolute rather than relative-to-max on purpose: a shade must mean the
 *  same thing in every range and on both pages, and one 6-hour ride must not
 *  be able to rescale a whole year of cells. */
export const HEATMAP_BANDS: { max: number; label: string }[] = [
  { max: 0, label: "rest" },
  { max: 30 * 60, label: "<30m" },
  { max: 60 * 60, label: "30-60m" },
  { max: 2 * 60 * 60, label: "1-2h" },
  { max: 3 * 60 * 60, label: "2-3h" },
  { max: Number.POSITIVE_INFINITY, label: "3h+" },
];

/** Band index for a duration: 0 for zero/rest, then 1..5 for the bands above.
 *
 * Derived from HEATMAP_BANDS by scanning it rather than repeating the
 * thresholds inline: the legend renders from the array and the cells colour
 * from this function, so a hardcoded copy here is a silent drift waiting to
 * happen the first time a band is retuned.
 *
 * Negative or NaN input (shouldn't happen, but this is fed by aggregated
 * data) is treated as rest rather than propagating a bad value into the
 * legend — note `!(seconds > 0)` catches NaN, which `seconds <= 0` would not. */
export function heatmapBand(seconds: number): number {
  if (!(seconds > 0)) return 0;
  const index = HEATMAP_BANDS.findIndex((band, i) => i > 0 && seconds < band.max);
  // The last band's max is Infinity, so findIndex only misses if the array is
  // ever truncated; fall back to the top band rather than returning -1.
  return index === -1 ? HEATMAP_BANDS.length - 1 : index;
}

/** Streak/consistency summary for the heatmap's accompanying stat line. */
export interface StreakStats {
  activeDays: number;
  totalDays: number;
  longestStreak: number; // consecutive days with any training
  meanSecondsPerActiveDay: number; // 0 when activeDays === 0 — never NaN
}

/** `cells` is already gap-filled and chronological (see toDailyCells), so
 * consecutive array indices ARE consecutive calendar days — the streak count
 * below relies on that and would silently misbehave on a sparse array. */
export function streakStats(cells: DailyCell[]): StreakStats {
  let activeDays = 0;
  let activeSeconds = 0;
  let longestStreak = 0;
  let currentStreak = 0;

  for (const cell of cells) {
    if (cell.total.seconds > 0) {
      activeDays += 1;
      activeSeconds += cell.total.seconds;
      currentStreak += 1;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return {
    activeDays,
    totalDays: cells.length,
    longestStreak,
    meanSecondsPerActiveDay: activeDays > 0 ? activeSeconds / activeDays : 0,
  };
}

/** Compact distance for the dense inspector line, where `formatDistanceKm`'s
 *  one-decimal output is too wide next to an hours figure. */
export function formatDistanceKmCompact(metres: number): string {
  const km = metres / 1000;
  if (km === 0) return "0 km";
  return `${km.toFixed(km >= 10 ? 0 : 1)} km`;
}
