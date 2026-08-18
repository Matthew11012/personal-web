import Link from "next/link";
import { MetaStrip } from "@/components/meta-strip";
import { ResultFigures } from "@/components/result-figures";
import { HomeWeeklyVolume } from "@/components/training/home-weekly-volume";
import { getPlot } from "@/lib/plots";
import { getTrainingActivities } from "@/lib/training";
import {
  filterByRange,
  formatDistanceKm,
  toWeeklyBuckets,
  totalsByDiscipline,
} from "@/lib/training-derive";
import type { ResultFigure } from "@/lib/types";

/** Home-page summary of the last 12 weeks of training — the reduced read
 * that links through to /plots/triathlon for the detailed small multiples,
 * heatmap and range control. Fixed to a 12-week window with no range
 * control of its own: that fixed-vs-adjustable split is what keeps the
 * plot page the one detailed surface. Server-only (queries postgres via
 * src/lib/training.ts); renders nothing before the first sync lands. */
export async function HomeTrainingBand() {
  // No sync-freshness readout here — the plot page owns that, and this band is
  // meant to stay quiet. So the activities query is the only one made.
  //
  // The home page carries `revalidate`, so this runs during the build's
  // prerender: an unreachable database must degrade to no band rather than
  // failing the whole site's build over one summary strip.
  let activities;
  try {
    activities = await getTrainingActivities();
  } catch (error) {
    console.error("[training] could not load training data; omitting the home band", error);
    return null;
  }

  if (activities.length === 0) return null;

  const accent = getPlot("triathlon")?.accent ?? "#3f8a8a";
  const windowed = filterByRange(activities, "12w");
  const totals = totalsByDiscipline(windowed);
  const buckets = toWeeklyBuckets(windowed, "12w");

  const results: ResultFigure[] = [
    { figure: formatDistanceKm(totals.swim), caption: "swim" },
    { figure: formatDistanceKm(totals.bike), caption: "bike" },
    { figure: formatDistanceKm(totals.run), caption: "run" },
    // Captioned "combined", never left as a fourth bare distance figure —
    // distance isn't summable across disciplines (40km on a bike isn't 40km
    // on foot), and the label is what stops it reading as the same quantity.
    { figure: formatDistanceKm(totals.combined), caption: "combined" },
  ];

  return (
    <div style={{ ["--acc" as string]: accent }} className="mt-[clamp(56px,8vw,110px)]">
      <MetaStrip border="top" items={["In training", "Last 12 weeks — via Strava"]} />
      <ResultFigures results={results} countUp />
      <HomeWeeklyVolume buckets={buckets} />
      <div className="mt-[clamp(20px,2.5vw,28px)]">
        <Link
          href="/plots/triathlon"
          className="navlink label-mono tracking-[0.18em] text-faint"
        >
          The full picture →
        </Link>
      </div>
    </div>
  );
}
