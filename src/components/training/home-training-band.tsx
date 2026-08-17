import Link from "next/link";
import { MetaStrip } from "@/components/meta-strip";
import { ResultFigures } from "@/components/result-figures";
import { getPlot } from "@/lib/plots";
import { getTrainingActivities } from "@/lib/training";
import {
  filterByRange,
  formatDistanceKm,
  formatHours,
  toWeeklyBuckets,
  totalsByDiscipline,
} from "@/lib/training-derive";
import type { ResultFigure, WeeklyBucket } from "@/lib/types";

const VIEW_HEIGHT = 40;
const BAR_GAP_RATIO = 0.25; // fraction of each slot left as gap between bars

function formatWeekLabel(iso: string): string {
  // weekStart is always a UTC-midnight ISO date; format with UTC accessors so
  // this never drifts a week relative to the bucket it's labelling.
  const date = new Date(iso);
  const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  return `${month} ${date.getUTCDate()}`;
}

/** One combined bar per week — swim + bike + run hours summed, unlike the
 * plot page's three small multiples. WeeklyVolume can't express a single
 * row without changing its shape, so this is a small local chart in the
 * same idiom rather than a reused-but-bent component. */
function CombinedWeeklyVolume({ buckets }: { buckets: WeeklyBucket[] }) {
  if (buckets.length === 0) return null;

  const hours = buckets.map((bucket) => (bucket.swim + bucket.bike + bucket.run) / 3600);

  // Guarded the same way as WeeklyVolume: an all-zero window (no activity in
  // the last 12 weeks) would otherwise divide by zero and put NaN into every
  // bar's height attribute.
  const max = Math.max(0, ...hours);
  const safeMax = max > 0 ? max : 1;

  const n = buckets.length;
  const slot = 100 / n;
  const barWidth = slot * (1 - BAR_GAP_RATIO);
  const totalHours = hours.reduce((a, b) => a + b, 0);

  return (
    <div className="mt-[clamp(28px,4vw,44px)]">
      <div className="label-mono tracking-[0.18em] text-faint">Weekly volume</div>
      <svg
        viewBox={`0 0 100 ${VIEW_HEIGHT}`}
        preserveAspectRatio="none"
        className="mt-4 h-10 w-full"
        role="img"
        aria-label={`Combined weekly training volume over ${n} weeks, ${
          max > 0 ? formatHours(totalHours * 3600) + " total" : "no recorded training in this range"
        }.`}
      >
        {hours.map((h, i) => {
          const height = (h / safeMax) * VIEW_HEIGHT;
          const x = i * slot + (slot - barWidth) / 2;
          const y = VIEW_HEIGHT - height;
          return (
            <rect
              key={buckets[i].weekStart}
              x={x}
              y={y}
              width={barWidth}
              // A 0-height rect renders nothing, which reads as a gap rather
              // than a zero week — floor it to a hairline sliver.
              height={Math.max(height, 0.6)}
              fill="var(--acc)"
            />
          );
        })}
      </svg>
      <div className="mt-2 flex justify-between">
        <span className="label-mono tracking-[0.1em] text-faint">
          {formatWeekLabel(buckets[0].weekStart)}
        </span>
        <span className="label-mono tracking-[0.1em] text-faint">
          {formatWeekLabel(buckets[buckets.length - 1].weekStart)}
        </span>
      </div>
    </div>
  );
}

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
      <ResultFigures results={results} />
      <CombinedWeeklyVolume buckets={buckets} />
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
