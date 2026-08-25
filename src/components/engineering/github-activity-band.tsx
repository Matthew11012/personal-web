import { MetaStrip } from "@/components/meta-strip";
import { GithubContributionChart } from "@/components/engineering/github-contribution-chart";
import { getGithubContributions } from "@/lib/github";
import { WORKSHOP_ACCENT } from "@/lib/plots";

/** Engineering-page summary of GitHub activity — a contribution heatmap plus
 * a headline total, switchable between the trailing 12 months and each
 * calendar year the account has existed. Server-only (queries GitHub's
 * GraphQL API via src/lib/github.ts); renders nothing if the fetch fails or
 * the account has no contribution ranges, so a broken/missing token degrades
 * to no section rather than a visibly broken page. */
export async function GithubActivityBand() {
  let ranges;
  try {
    ranges = await getGithubContributions();
  } catch (error) {
    console.error("[github] could not load contribution data; omitting the activity band", error);
    return null;
  }

  if (ranges.length === 0) return null;

  return (
    <div style={{ ["--acc" as string]: WORKSHOP_ACCENT }} className="mt-[clamp(44px,6vw,72px)]">
      <MetaStrip border="top" items={["Shipping", "Contribution activity — via GitHub"]} />
      <GithubContributionChart ranges={ranges} />
    </div>
  );
}
