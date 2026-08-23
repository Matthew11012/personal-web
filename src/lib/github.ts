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
      createdAt
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
      createdAt: z.string(),
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

export const LAST_12_MONTHS = "last-12-months" as const;

export interface ContributionRange {
  key: string;
  label: string;
  days: ContributionDay[];
  total: number;
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

/** Issues one contributions-calendar request for the given window, validates
 * it, and flattens it into daily cells with a relative 0-4 level computed off
 * that window's own max day. Also returns the raw `createdAt` string so
 * callers that need the account's join date don't have to issue a second
 * request just for that field. */
async function fetchContributionWindow(
  token: string,
  from: Date,
  to: Date,
): Promise<{ totalContributions: number; days: ContributionDay[]; createdAt: string }> {
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

  const { viewer } = parsed.data.data;
  const calendar = viewer.contributionsCollection.contributionCalendar;
  const flattened = calendar.weeks.flatMap((week) => week.contributionDays);

  const max = flattened.reduce((acc, day) => Math.max(acc, day.contributionCount), 0);

  const days: ContributionDay[] = flattened.map((day) => ({
    date: day.date,
    count: day.contributionCount,
    level: contributionLevel(day.contributionCount, max),
  }));

  return { totalContributions: calendar.totalContributions, days, createdAt: viewer.createdAt };
}

/** The authenticated account's contribution calendar as a set of switchable
 * ranges: a rolling trailing-365-day window plus one entry per calendar year
 * the account has existed, all fetched in one call so a client component can
 * flip between them with zero extra network requests. Uses `viewer` rather
 * than `user(login: ...)` so private contributions for the token's own
 * account are always included, with no login-matching or privacy-toggle edge
 * cases. */
export async function getGithubContributions(): Promise<ContributionRange[]> {
  const token = requireEnv("GITHUB_TOKEN");

  const now = new Date();
  const last12From = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  const last12Months = await fetchContributionWindow(token, last12From, now);

  const joinYear = new Date(last12Months.createdAt).getUTCFullYear();
  const currentYear = now.getUTCFullYear();

  const years: number[] = [];
  for (let year = currentYear; year >= joinYear; year--) {
    years.push(year);
  }

  const yearWindows = await Promise.all(
    years.map((year) => {
      const yearFrom = new Date(`${year}-01-01T00:00:00Z`);
      const yearToCandidate = new Date(`${year}-12-31T23:59:59Z`);
      const yearTo = new Date(Math.min(yearToCandidate.getTime(), now.getTime()));
      return fetchContributionWindow(token, yearFrom, yearTo);
    }),
  );

  const yearRanges: ContributionRange[] = years.map((year, index) => ({
    key: String(year),
    label: String(year),
    days: yearWindows[index].days,
    total: yearWindows[index].totalContributions,
  }));

  const lastTwelveMonthsRange: ContributionRange = {
    key: LAST_12_MONTHS,
    label: "Last 12 months",
    days: last12Months.days,
    total: last12Months.totalContributions,
  };

  return [lastTwelveMonthsRange, ...yearRanges];
}
