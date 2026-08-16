// Server-side only — reaches the database and Strava through ./strava. Shared
// by the cron sweep and the webhook so the reconciliation lives in one place.
import { revalidatePath } from "next/cache";
import {
  deleteActivities,
  fetchActivities,
  getActivityIdsSince,
  getLastRateLimits,
  getSyncCursor,
  SYNC_LOOKBACK_MS,
  upsertActivities,
} from "./strava";

/** The shape both sync entry points report.
 *
 * `synced` is `inserted + updated`; the split is reported because a lookback
 * run that is working correctly is nearly all updates, and one that has lost
 * its cursor is nearly all inserts — a single total can't tell them apart. */
export interface SyncResult {
  synced: number;
  inserted: number;
  updated: number;
  deleted: number;
  errors: string[];
}

/** Pulls everything Strava has that we don't, writes it, and removes anything
 * that has disappeared from the trailing window.
 *
 * Never throws: a caller that gets a result back can say *what* went wrong, and
 * a cron that returns a diagnosable body beats one that 500s with a stack
 * trace in a log nobody reads. */
export async function reconcileActivities(): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, inserted: 0, updated: 0, deleted: 0, errors: [] };

  try {
    const cursor = await getSyncCursor();

    // A null cursor means an empty table, and that is the backfill case — no
    // `after` filter, so fetchActivities walks the entire history. There is
    // deliberately no separate backfill script or route: one code path means
    // nothing to keep in sync with this one, and nothing to accidentally leave
    // deployed once the first run is done.
    //
    // Otherwise the window starts SYNC_LOOKBACK_MS *behind* the cursor. See the
    // constant: a bare `after = MAX(start_date)` is permanently blind to any
    // activity that lands out of order, which happens whenever a watch uploads
    // late or an entry is backdated.
    const windowStart = cursor ? new Date(cursor.getTime() - SYNC_LOOKBACK_MS) : null;

    // Ids Strava returned inside the window that was actually fetched. Used
    // below to reconcile deletions; only meaningful if pagination completed.
    const seenIds = new Set<number>();

    // No transaction wrapper, and the cursor is never persisted separately.
    // It's derived from the data (MAX(start_date)), so it cannot drift out of
    // sync with what's actually stored: if a page fails, the cursor simply
    // still points at the last row that landed and the next run retries the
    // gap. Upserts are keyed on Strava's id and are idempotent, so replaying
    // that gap costs one query and leaves no partial state to clean up.
    // Atomicity would buy nothing here — and would actively hurt, because the
    // point of writing per page is that a failure on page 5 keeps pages 1-4.
    const fetched = await fetchActivities(windowStart ? { after: windowStart } : {}, async (batch) => {
      const written = await upsertActivities(batch);
      result.inserted += written.inserted;
      result.updated += written.updated;
      result.synced += written.inserted + written.updated;
      for (const activity of batch) seenIds.add(activity.id);
    });

    // Logged after the fetch rather than before: the numbers only exist once a
    // response has carried the headers back.
    const limits = getLastRateLimits();
    if (limits) {
      console.info(`[sync] rate limits after fetch: ${JSON.stringify(limits)}`);
    }

    if (fetched.error) {
      result.errors.push(fetched.error.message);
    }

    // Deletions and privacy changes, self-healed.
    //
    // The webhook is the fast path for both, but a webhook delivery Strava gave
    // up on is gone forever — it never re-delivers after a 200 — and a plain
    // incremental cursor structurally cannot notice that something it already
    // holds has vanished. So: everything Strava did *not* return inside the
    // window it was asked about, but which we hold inside that same window, is
    // no longer visible to us and is deleted locally.
    //
    // A privacy change doesn't come through here: the token carries
    // `activity:read_all`, so an activity flipped to only_me still comes back
    // in the listing above, gets upserted with its new `visibility`/`private`,
    // and is dropped by the query layer's filter. This branch is for genuine
    // deletes — and, if the scope were ever narrowed, a hidden activity would
    // simply vanish from the response and be deleted here, which is the
    // fail-closed direction either way.
    //
    // Guarded on `complete` and scoped strictly to `windowStart`, because both
    // are load-bearing: a run that stopped early saw only a prefix of the
    // window, and comparing against ids outside the fetched window would wipe
    // the entire history on the first incremental run.
    if (fetched.complete) {
      const localIds = await getActivityIdsSince(windowStart);
      const missing = localIds.filter((id) => !seenIds.has(id));
      if (missing.length > 0) {
        result.deleted = await deleteActivities(missing);
        console.info(
          `[sync] removed ${result.deleted} activities absent from Strava's response for the trailing window`,
        );
      }
    }
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
