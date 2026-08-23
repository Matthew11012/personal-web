import { MetaStrip } from "@/components/meta-strip";
import { ResultFigures } from "@/components/result-figures";
import { GithubHeatmap } from "@/components/engineering/github-heatmap";
import { getGithubContributions } from "@/lib/github";
import type { ResultFigure } from "@/lib/types";

const ACCENT = "#4f7942";

/** Engineering-page summary of the last 12 months of GitHub activity — a
 * contribution heatmap plus a headline total. Server-only (queries GitHub's
 * GraphQL API via src/lib/github.ts); renders nothing if the fetch fails or
 * the account has no contributions in the window, so a broken/missing token
 * degrades to no section rather than a visibly broken page. */
export async function GithubActivityBand() {
  let data;
  try {
    data = await getGithubContributions();
  } catch (error) {
    console.error("[github] could not load contribution data; omitting the activity band", error);
    return null;
  }

  if (data.days.length === 0) return null;

  const results: ResultFigure[] = [
    { figure: `${data.total}`, caption: "contributions, last 12 months" },
  ];

  return (
    <div style={{ ["--acc" as string]: ACCENT }} className="mt-[clamp(44px,6vw,72px)]">
      <MetaStrip border="top" items={["Shipping", "Last 12 months — via GitHub"]} />
      <ResultFigures results={results} countUp />
      <GithubHeatmap days={data.days} />
    </div>
  );
}
