import { getLastSyncedAt, getTrainingActivities } from "@/lib/training";
import { TrainingCharts } from "./training-charts";

/** These pages carry `revalidate`, so this query runs during the build's
 * prerender. An unreachable database would therefore fail the *whole site's*
 * build over one chart band — so a query failure degrades to no band instead.
 *
 * Deliberately not swallowed silently: the error is logged, and a failing sync
 * also shows up as a stale "updated N days ago" readout on the page itself.
 * The sync routes let their errors surface, because there the failure is the
 * whole point of the response. */
async function loadTraining() {
  try {
    const [activities, lastSyncedAt] = await Promise.all([
      getTrainingActivities(),
      getLastSyncedAt(),
    ]);
    return { activities, lastSyncedAt };
  } catch (error) {
    console.error("[training] could not load training data; omitting the band", error);
    return null;
  }
}

/** Server-only entry point — the one place this feature touches
 * src/lib/training.ts (and therefore postgres). Renders nothing before the
 * first sync lands: an empty chart band is worse than no band at all. */
export async function TrainingBand() {
  const data = await loadTraining();
  if (!data || data.activities.length === 0) return null;

  const { activities, lastSyncedAt } = data;

  return (
    <TrainingCharts
      activities={activities}
      lastSyncedAt={lastSyncedAt ? lastSyncedAt.toISOString() : null}
    />
  );
}
