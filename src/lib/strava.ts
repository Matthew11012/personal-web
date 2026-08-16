// Server-side only — every function here touches either the database or a
// secret-bearing Strava request. Never import this from a client component.
import { z } from "zod";
import { getSql } from "./db";

const STRAVA_API = "https://www.strava.com/api/v3";

/** Refresh this far before the token actually dies, so a request that starts
 * valid can't expire mid-flight. */
const EXPIRY_MARGIN_SECONDS = 300;

/** Fixed key for pg_advisory_xact_lock — the ASCII bytes of "STRV". Arbitrary,
 * but it must never change or two deploys would serialise against each other. */
const AUTH_LOCK_KEY = 0x53545256;

/** Requested page size. Deliberately *not* treated as Strava's maximum: the
 * real cap is undocumented and the server may silently return fewer. */
const PER_PAGE = 100;

/** Runaway guard, not an expected limit. */
const MAX_PAGES = 100;

// -- Types --------------------------------------------------------------

/** A row of `strava_activities`. Note that postgres.js ships no int8 parser,
 * so `id` comes back from a plain SELECT as a string — cast it (`id::text`
 * then Number, or a column-level cast) wherever this shape is read. */
export interface StravaActivity {
  id: number;
  sport_type: string;
  start_date: Date;
  start_date_local: Date;
  moving_time: number;
  distance: number;
  total_elevation_gain: number | null;
  elapsed_time: number;
  average_speed: number | null;
  average_heartrate: number | null;
  suffer_score: number | null;
  visibility: string | null;
  name: string | null;
  synced_at: Date;
}

// Only the fields we persist. `z.object` strips unknown keys instead of
// rejecting them, so Strava can keep adding fields without breaking a sync.
// The nullish fields are genuinely absent in the wild: `suffer_score` and
// `average_heartrate` need a paired HR monitor, `visibility` predates the
// setting on old activities.
const summaryActivitySchema = z.object({
  id: z.number(),
  name: z.string().nullish(),
  sport_type: z.string(),
  start_date: z.string(),
  start_date_local: z.string(),
  moving_time: z.number(),
  elapsed_time: z.number(),
  distance: z.number(),
  total_elevation_gain: z.number().nullish(),
  average_speed: z.number().nullish(),
  average_heartrate: z.number().nullish(),
  suffer_score: z.number().nullish(),
  visibility: z.string().nullish(),
});

/** The subset of Strava's SummaryActivity we read. snake_case because that's
 * what the API returns and what the columns are called. */
export type SummaryActivity = z.infer<typeof summaryActivitySchema>;

/** Both rate-limit headers carry a `15-minute,daily` pair. */
export interface RateLimitWindow {
  short: number;
  daily: number;
}

export interface RateLimitStatus {
  limit: RateLimitWindow | null;
  usage: RateLimitWindow | null;
  readLimit: RateLimitWindow | null;
  readUsage: RateLimitWindow | null;
}

// -- Auth ---------------------------------------------------------------

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_at: z.number(),
  expires_in: z.number().nullish(),
});

interface AuthRow {
  access_token: string;
  refresh_token: string;
  expires_at: string | number;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/** `expires_at` is int8 and postgres.js has no int8 parser, so it arrives as a
 * string. */
function toUnixSeconds(value: string | number): number {
  const seconds = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(seconds)) {
    throw new Error(`strava_auth.expires_at is not numeric: ${String(value)}`);
  }
  return seconds;
}

async function requestRefresh(refreshToken: string): Promise<z.infer<typeof tokenResponseSchema>> {
  const res = await fetch(`${STRAVA_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv("STRAVA_CLIENT_ID"),
      client_secret: requireEnv("STRAVA_CLIENT_SECRET"),
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });

  const body = await res.text();
  // Status *and* body: a refresh failure is otherwise indistinguishable from a
  // network blip, and the body is where Strava says which credential is wrong.
  if (!res.ok) {
    throw new Error(`Strava token refresh failed: ${res.status} ${res.statusText} — ${body}`);
  }
  return tokenResponseSchema.parse(JSON.parse(body));
}

/** Returns a currently-valid access token, refreshing and persisting first if
 * needed.
 *
 * The whole read-check-refresh-write runs inside one transaction holding a
 * fixed advisory lock. Strava kills the old refresh token the instant it issues
 * a new one, so two concurrent refreshes (cron + a burst of webhooks) would
 * leave the loser holding a dead credential — and since only one row exists,
 * whichever write lands last wins. Serialising is the only fix. The lock is
 * `_xact_` rather than session-scoped deliberately: it releases on commit,
 * which matters when connections are recycled by a transaction-mode pooler. */
export async function getAccessToken(): Promise<string> {
  return getSql().begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(${AUTH_LOCK_KEY})`;

    // Re-read *after* the lock: whoever we queued behind may have already
    // refreshed, in which case refreshing again would burn their token.
    const rows = await tx<AuthRow[]>`
      SELECT access_token, refresh_token, expires_at FROM strava_auth WHERE id = 1
    `;
    const row = rows[0];

    let refreshToken: string;
    if (row) {
      if (toUnixSeconds(row.expires_at) - nowSeconds() > EXPIRY_MARGIN_SECONDS) {
        return row.access_token;
      }
      refreshToken = row.refresh_token;
    } else {
      // First run only. After this the database is the system of record and the
      // env var goes stale immediately.
      refreshToken = process.env.STRAVA_REFRESH_TOKEN ?? "";
      if (!refreshToken) {
        throw new Error(
          "strava_auth is empty and STRAVA_REFRESH_TOKEN is not set. Bootstrap it by running the Strava OAuth authorization flow once and putting the resulting refresh token in the environment; the first sync seeds the table from it.",
        );
      }
    }

    const token = await requestRefresh(refreshToken);

    // Persist before returning, and before any caller can spend the token.
    // Strava has already invalidated the refresh token we just used, so if this
    // process dies with the new one only in memory the credential is stranded
    // and the manual OAuth dance has to be redone by hand. This ordering is the
    // entire point of the function.
    await tx`
      INSERT INTO strava_auth (id, access_token, refresh_token, expires_at, updated_at)
      VALUES (1, ${token.access_token}, ${token.refresh_token}, ${token.expires_at}, now())
      ON CONFLICT (id) DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        expires_at = EXCLUDED.expires_at,
        updated_at = now()
    `;

    return token.access_token;
  });
}

// -- Rate limits --------------------------------------------------------

let lastRateLimits: RateLimitStatus | null = null;

function parsePair(header: string | null): RateLimitWindow | null {
  if (!header) return null;
  const [short, daily] = header.split(",").map((part) => Number(part.trim()));
  if (!Number.isFinite(short) || !Number.isFinite(daily)) return null;
  return { short, daily };
}

/** The four rate-limit headers Strava attaches to every response. */
export function parseRateLimits(headers: Headers): RateLimitStatus {
  return {
    limit: parsePair(headers.get("X-RateLimit-Limit")),
    usage: parsePair(headers.get("X-RateLimit-Usage")),
    readLimit: parsePair(headers.get("X-ReadRateLimit-Limit")),
    readUsage: parsePair(headers.get("X-ReadRateLimit-Usage")),
  };
}

/** Rate limits seen on the most recent Strava response, or null before any
 * request. */
export function getLastRateLimits(): RateLimitStatus | null {
  return lastRateLimits;
}

function recordRateLimits(headers: Headers): void {
  const status = parseRateLimits(headers);
  lastRateLimits = status;

  // Non-upload endpoints get 100 reads per 15 minutes and 1000 per day; the
  // 15-minute window resets on the quarter hour, so a burst near :14 can
  // clear itself within a minute.
  const usage = status.readUsage ?? status.usage;
  const limit = status.readLimit ?? status.limit;
  if (usage && limit) {
    console.info(
      `[strava] reads ${usage.short}/${limit.short} in the 15-minute window, ${usage.daily}/${limit.daily} today`,
    );
  }
}

// -- Fetching -----------------------------------------------------------

async function stravaGet(path: string, params: URLSearchParams | null, token: string): Promise<Response> {
  const url = new URL(`${STRAVA_API}${path}`);
  if (params) url.search = params.toString();

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    // Training data must never come out of Next's fetch cache — a stale page
    // here silently truncates a sync.
    cache: "no-store",
  });
  recordRateLimits(res.headers);
  return res;
}

function parseActivities(payload: unknown, context: string): SummaryActivity[] {
  const parsed = z.array(summaryActivitySchema).safeParse(payload);
  if (!parsed.success) {
    throw new Error(`Unexpected Strava activity payload (${context}): ${parsed.error.message}`);
  }
  return parsed.data;
}

/** Every activity since `after`, paginated. */
export async function fetchActivities(opts: { after?: Date }): Promise<SummaryActivity[]> {
  const token = await getAccessToken();
  const activities: SummaryActivity[] = [];

  // Neither Strava's maximum per_page nor its ordering under `after` is
  // documented, so neither is assumed. The first page establishes the server's
  // *effective* page size — which may be below the PER_PAGE we asked for — and
  // paging continues until a page comes back shorter than that, or empty.
  // Comparing against PER_PAGE instead would stop after one page the moment
  // Strava caps below 100.
  let effectivePageSize: number | null = null;
  let page = 1;

  for (; page <= MAX_PAGES; page++) {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(PER_PAGE),
    });
    if (opts.after) params.set("after", String(Math.floor(opts.after.getTime() / 1000)));

    const res = await stravaGet("/athlete/activities", params, token);
    if (!res.ok) {
      throw new Error(
        `Strava activity fetch failed (page ${page}): ${res.status} ${res.statusText} — ${await res.text()}`,
      );
    }

    const batch = parseActivities(await res.json(), `page ${page}`);
    activities.push(...batch);

    if (batch.length === 0) break;
    effectivePageSize ??= batch.length;
    if (batch.length < effectivePageSize) break;
  }

  if (page > MAX_PAGES) {
    console.warn(
      `[strava] hit the ${MAX_PAGES}-page guard with ${activities.length} activities; the sync is almost certainly incomplete`,
    );
  }

  return activities;
}

/** `GET /athlete/activities` can't filter by id, so this hits the by-id
 * endpoint. Returns null on 404: the activity was deleted between the webhook
 * firing and this call, which is a normal race rather than a failure. */
export async function fetchActivity(id: number): Promise<SummaryActivity | null> {
  const token = await getAccessToken();
  const res = await stravaGet(`/activities/${id}`, null, token);

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(
      `Strava activity ${id} fetch failed: ${res.status} ${res.statusText} — ${await res.text()}`,
    );
  }

  const parsed = summaryActivitySchema.safeParse(await res.json());
  if (!parsed.success) {
    throw new Error(`Unexpected Strava activity payload (id ${id}): ${parsed.error.message}`);
  }
  return parsed.data;
}

// -- Persistence --------------------------------------------------------

function toDate(value: string, field: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Strava returned an unparseable ${field}: ${value}`);
  }
  return date;
}

/** The insert shape: every column except `synced_at`, which the upsert sets. */
type ActivityRow = Omit<StravaActivity, "synced_at">;

// Mutable rather than `as const` on purpose — postgres.js's insert helper types
// reject a readonly column list.
const ACTIVITY_COLUMNS: (keyof ActivityRow)[] = [
  "id",
  "sport_type",
  "start_date",
  "start_date_local",
  "moving_time",
  "distance",
  "total_elevation_gain",
  "elapsed_time",
  "average_speed",
  "average_heartrate",
  "suffer_score",
  "visibility",
  "name",
];

// `start_date_local` arrives as local wall-clock time wearing a fake `Z`. It's
// stored exactly as given so that reading the column back in UTC yields the
// wall clock the session was actually lived at — which is what the weekly
// buckets need.
function toRow(activity: SummaryActivity): ActivityRow {
  return {
    id: activity.id,
    sport_type: activity.sport_type,
    start_date: toDate(activity.start_date, "start_date"),
    start_date_local: toDate(activity.start_date_local, "start_date_local"),
    moving_time: activity.moving_time,
    distance: activity.distance,
    total_elevation_gain: activity.total_elevation_gain ?? null,
    elapsed_time: activity.elapsed_time,
    average_speed: activity.average_speed ?? null,
    average_heartrate: activity.average_heartrate ?? null,
    suffer_score: activity.suffer_score ?? null,
    visibility: activity.visibility ?? null,
    name: activity.name ?? null,
  };
}

/** Writes activities in one multi-row statement, returning the rows written.
 * Idempotent by construction — replaying the same batch costs one query and
 * changes nothing but `synced_at`, so retries are free. */
export async function upsertActivities(activities: SummaryActivity[]): Promise<number> {
  if (activities.length === 0) return 0;

  const sql = getSql();
  const rows = activities.map(toRow);
  const written = await sql<{ id: string }[]>`
    INSERT INTO strava_activities ${sql(rows, ...ACTIVITY_COLUMNS)}
    ON CONFLICT (id) DO UPDATE SET
      sport_type = EXCLUDED.sport_type,
      start_date = EXCLUDED.start_date,
      start_date_local = EXCLUDED.start_date_local,
      moving_time = EXCLUDED.moving_time,
      distance = EXCLUDED.distance,
      total_elevation_gain = EXCLUDED.total_elevation_gain,
      elapsed_time = EXCLUDED.elapsed_time,
      average_speed = EXCLUDED.average_speed,
      average_heartrate = EXCLUDED.average_heartrate,
      suffer_score = EXCLUDED.suffer_score,
      visibility = EXCLUDED.visibility,
      name = EXCLUDED.name,
      synced_at = now()
    RETURNING id
  `;

  return written.length;
}

/** Hard delete — Strava is the system of record, so there's deliberately no
 * tombstone column to reconcile against. */
export async function deleteActivity(id: number): Promise<boolean> {
  const deleted = await getSql()<{ id: string }[]>`
    DELETE FROM strava_activities WHERE id = ${id} RETURNING id
  `;
  return deleted.length > 0;
}

/** The newest activity we hold. Null on an empty table, which is what makes
 * the first sync double as the full backfill: no cursor means no `after`
 * filter, so fetchActivities walks the entire history. */
export async function getSyncCursor(): Promise<Date | null> {
  const rows = await getSql()<{ cursor: Date | null }[]>`
    SELECT MAX(start_date) AS cursor FROM strava_activities
  `;
  return rows[0]?.cursor ?? null;
}
