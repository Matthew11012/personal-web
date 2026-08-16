// Server-side only — reaches the database and Strava through ./strava. Shared
// by the cron sweep and the webhook so the reconciliation lives in one place.
import { revalidatePath } from "next/cache";
import { fetchActivities, getLastRateLimits, getSyncCursor, upsertActivities } from "./strava";

/** The shape both sync entry points report.
 *
 * `deleted` is always 0 here: an incremental `after` cursor only ever sees
 * activities newer than what we hold, so a reconciliation sweep has no way to
 * observe a deletion. The field exists because the webhook path reports deletes
 * through this same shape — it's a shared contract, not an oversight. */
export interface SyncResult {
  synced: number;
  skipped: number;
  deleted: number;
  errors: string[];
}

/** Pulls everything Strava has that we don't, and writes it.
 *
 * Never throws: a caller that gets a result back can say *what* went wrong, and
 * a cron that returns a diagnosable body beats one that 500s with a stack
 * trace in a log nobody reads. */
export async function reconcileActivities(): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, skipped: 0, deleted: 0, errors: [] };

  try {
    const cursor = await getSyncCursor();

    // A null cursor means an empty table, and that is the backfill case — no
    // `after` filter, so fetchActivities walks the entire history. There is
    // deliberately no separate backfill script or route: one code path means
    // nothing to keep in sync with this one, and nothing to accidentally leave
    // deployed once the first run is done.
    const activities = await fetchActivities(cursor ? { after: cursor } : {});

    // Logged after the fetch rather than before: the numbers only exist once a
    // response has carried the headers back.
    const limits = getLastRateLimits();
    if (limits) {
      console.info(`[sync] rate limits after fetch: ${JSON.stringify(limits)}`);
    }

    // No transaction wrapper, and the cursor is never persisted separately.
    // It's derived from the data (MAX(start_date)), so it cannot drift out of
    // sync with what's actually stored: if this write fails halfway, the cursor
    // simply still points at the last row that landed and the next run retries
    // the gap. Upserts are keyed on Strava's id and are idempotent, so replaying
    // that gap costs one query and leaves no partial state to clean up.
    // Atomicity would buy nothing here.
    result.synced = await upsertActivities(activities);
    result.skipped = activities.length - result.synced;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error));
  }

  return result;
}

/** Both surfaces that render training data. The plot page is the obvious one;
 * the home page carries a compact band off the same rows, so revalidating only
 * the plot would leave the home page silently stale. */
export async function revalidateTrainingSurfaces(): Promise<void> {
  revalidatePath("/plots/triathlon");
  revalidatePath("/");
}
