// Server-side only — every function here touches a secret-bearing GitHub
// request. Never import this from a client component.
import { z } from "zod";

const GITHUB_GRAPHQL_API = "https://api.github.com/graphql";

/** Hard ceiling on any single GitHub request. `fetch` has no default timeout,
 * so a connection GitHub accepts and then never answers hangs forever. */
const GITHUB_TIMEOUT_MS = 10_000;

const CONTRIBUTIONS_QUERY = `
  query($from: DateTime!, $to: DateTime!) {
    viewer {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;

const contributionDaySchema = z.object({
  date: z.string(),
  contributionCount: z.number(),
});

const graphqlResponseSchema = z.object({
  data: z.object({
    viewer: z.object({
      contributionsCollection: z.object({
        contributionCalendar: z.object({
          totalContributions: z.number(),
          weeks: z.array(
            z.object({
              contributionDays: z.array(contributionDaySchema),
            }),
          ),
        }),
      }),
    }),
  }),
});

export interface ContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

function contributionLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0 || max <= 0) return 0;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

/** The authenticated account's contribution calendar for the trailing 365
 * days, flattened into daily cells with a relative 0-4 level for heatmap
 * coloring. Uses `viewer` rather than `user(login: ...)` so private
 * contributions for the token's own account are always included, with no
 * login-matching or privacy-toggle edge cases. */
export async function getGithubContributions(): Promise<{
  days: ContributionDay[];
  total: number;
}> {
  const token = requireEnv("GITHUB_TOKEN");

  const to = new Date();
  const from = new Date(to.getTime() - 365 * 24 * 60 * 60 * 1000);

  const res = await fetch(GITHUB_GRAPHQL_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: CONTRIBUTIONS_QUERY,
      variables: { from: from.toISOString(), to: to.toISOString() },
    }),
    // This data must never come out of Next's fetch cache — the module owns
    // its own revalidation story at the page level, not the fetch layer.
    cache: "no-store",
    // A hung read is a hung route; failing fast leaves a retryable error
    // instead of hanging the request forever.
    signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`GitHub contributions fetch failed: ${res.status} ${res.statusText} — ${body}`);
  }

  const parsedBody = JSON.parse(body);
  if (Array.isArray(parsedBody?.errors) && parsedBody.errors.length > 0) {
    throw new Error(`GitHub GraphQL request returned errors: ${JSON.stringify(parsedBody.errors)}`);
  }

  const parsed = graphqlResponseSchema.safeParse(parsedBody);
  if (!parsed.success) {
    throw new Error(`Unexpected GitHub contributions payload: ${parsed.error.message}`);
  }

  const calendar = parsed.data.data.viewer.contributionsCollection.contributionCalendar;
  const flattened = calendar.weeks.flatMap((week) => week.contributionDays);

  const max = flattened.reduce((acc, day) => Math.max(acc, day.contributionCount), 0);

  const days: ContributionDay[] = flattened.map((day) => ({
    date: day.date,
    count: day.contributionCount,
    level: contributionLevel(day.contributionCount, max),
  }));

  return { days, total: calendar.totalContributions };
}
