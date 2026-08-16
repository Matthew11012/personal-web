import { getLastSyncedAt, getTrainingActivities } from "@/lib/training";
import { TrainingCharts } from "./training-charts";

/** Server-only entry point — the one place this feature touches
 * src/lib/training.ts (and therefore postgres). Renders nothing before the
 * first sync lands: an empty chart band is worse than no band at all. */
export async function TrainingBand() {
  const [activities, lastSyncedAt] = await Promise.all([
    getTrainingActivities(),
    getLastSyncedAt(),
  ]);

  if (activities.length === 0) return null;

  return (
    <TrainingCharts
      activities={activities}
      lastSyncedAt={lastSyncedAt ? lastSyncedAt.toISOString() : null}
    />
  );
}
