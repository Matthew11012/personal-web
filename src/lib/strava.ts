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

/** Hard ceiling on any single Strava request.
 *
 * `fetch` has no default timeout, so a connection Strava accepts and then never
 * answers hangs forever. That matters most in getAccessToken, where the hung
 * request is holding both an advisory lock and one of only three pooled
 * connections — and page renders share that pool, so the entire site ends up
 * queued behind one stuck socket, long after the route's maxDuration has
 * passed. */
const STRAVA_TIMEOUT_MS = 10_000;

/** How long to wait for the auth advisory lock before giving up.
 *
 * Same reasoning as the fetch timeout, from the other side: a waiter that
 * queues indefinitely pins a pooled connection just as effectively as the
 * holder does. Failing after five seconds is recoverable — the webhook retries,
 * and the next cron run tries again — whereas an unbounded wait is not. */
const AUTH_LOCK_TIMEOUT = "5s";

/** Requested page size. Deliberately *not* treated as Strava's maximum: the
 * real cap is undocumented and the server may silently return fewer. */
const PER_PAGE = 100;

/** Runaway guard, not an expected limit. */
const MAX_PAGES = 100;

/** How far *behind* the sync cursor each run re-reads.
 *
 * The cursor is MAX(start_date), so a naive `after=cursor` can never see an
 * activity whose start_date is older than the newest row we already hold — and
 * that happens routinely. A 06:00 swim sits unuploaded on a watch; an 08:00
 * ride auto-uploads from a head unit and drags the cursor to 08:00; the watch
 * syncs at noon and the swim finally lands on Strava with a 06:00 start_date.
 * Its `create` webhook is then the *only* chance to ever see it, and webhook
 * deliveries do get dropped (Strava gives up retrying, or dev and prod are
 * fighting over the single global subscription). Backdated manual entries and
 * Garmin/Zwift backfills land the same way.
 *
 * Re-reading the trailing fortnight closes the whole class. The upserts are
 * idempotent, so the overlap costs roughly one extra page per run and changes
 * nothing when there is nothing to find. */
export const SYNC_LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000;

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
  private: boolean | null;
  name: string | null;
  synced_at: Date;
}

// Only the fields we persist. `z.object` strips unknown keys instead of
// rejecting them, so Strava can keep adding fields without breaking a sync.
// The nullish fields are genuinely absent in the wild: `suffer_score` and
// `average_heartrate` need a paired HR monitor, `visibility` predates the
// setting on old activities.
//
// `private` is read alongside `visibility` on purpose: `visibility` is not in
// Strava's published SummaryActivity model, so the entire privacy contract
// currently rests on an undocumented field that could vanish in an API
// revision. `private` is documented. Storing both means the filter can require
// agreement, and a disappearing `visibility` degrades to NULL — which the query
// layer already excludes — rather than to "publish everything".
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
  private: z.boolean().nullish(),
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

/** A non-2xx response from Strava, carrying the status so callers can tell a
 * transient failure from a permanent one. */
export class StravaHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "StravaHttpError";
    this.status = status;
  }
}

/** Whether retrying the operation that produced `error` could plausibly
 * succeed.
 *
 * 429 and 5xx are transient by definition. Anything that isn't an HTTP status
 * at all — a DNS failure, a reset socket, an AbortSignal timeout, a database
 * blip — is also worth another attempt. Every other 4xx will fail identically
 * however many times it is repeated, so retrying only burns quota. */
export function isRetryable(error: unknown): boolean {
  if (error instanceof StravaHttpError) {
    return error.status === 429 || error.status >= 500;
  }
  return true;
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
    // See STRAVA_TIMEOUT_MS: this call runs inside the auth transaction, so an
    // unbounded hang here is the one that takes the site down with it.
    signal: AbortSignal.timeout(STRAVA_TIMEOUT_MS),
  });

  const body = await res.text();
  // Status *and* body: a refresh failure is otherwise indistinguishable from a
  // network blip, and the body is where Strava says which credential is wrong.
  if (!res.ok) {
    throw new StravaHttpError(
      res.status,
      `Strava token refresh failed: ${res.status} ${res.statusText} — ${body}`,
    );
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
  // Holds the refresh token Strava has just issued so that a failure *after*
  // the refresh call — including a COMMIT that never lands — can still see it.
  // A boxed field rather than a bare `let` because the compiler narrows a
  // `let` that is only ever assigned inside a callback.
  const issued: { refreshToken: string | null } = { refreshToken: null };

  try {
    return await getSql().begin(async (tx) => {
      // Load-bearing, not decoration. The post-lock re-read below is only
      // correct under READ COMMITTED: at REPEATABLE READ this transaction's
      // snapshot is fixed *before* it queues on the lock, so the re-read would
      // return the stale pre-lock row, we would refresh a second time, and the
      // winner's freshly-issued token would be burned — exactly the race the
      // lock exists to prevent. Postgres defaults to READ COMMITTED, but a
      // server-side `default_transaction_isolation` would silently break it.
      await tx`SET TRANSACTION ISOLATION LEVEL READ COMMITTED`;

      // Bound the wait on the lock as well as the work under it; see
      // AUTH_LOCK_TIMEOUT. `set_config(..., is_local => true)` rather than
      // `SET LOCAL` because SET takes no bind parameters.
      await tx`SELECT set_config('lock_timeout', ${AUTH_LOCK_TIMEOUT}, true)`;

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
      issued.refreshToken = token.refresh_token;

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
  } catch (error) {
    if (issued.refreshToken) {
      // The unclosable gap: the INSERT can succeed and the COMMIT still fail,
      // rolling back the new refresh token while Strava has already destroyed
      // the old one. Nothing makes that atomic — Strava's rotation is outside
      // our transaction — but it can be made *recoverable*. Writing the rotated
      // token to the platform log at the one moment it would otherwise be lost
      // turns "redo the browser OAuth dance" into "copy one string out of the
      // Vercel log". A secret in a log is a real cost; for a single-user site
      // with a private log it is the cheaper of the two failures, and it is a
      // deliberate trade rather than an oversight.
      console.error(
        `[strava] token refresh succeeded but persisting it failed. Strava has already invalidated the previous refresh token, so recover by putting this one in STRAVA_REFRESH_TOKEN and deleting the strava_auth row: ${issued.refreshToken}`,
      );
    }
    throw error;
  }
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
    // A hung read is a hung route: both callers run inside a maxDuration that
    // the platform enforces by killing the invocation, which loses whatever
    // has already been fetched. Failing fast leaves a retryable error instead.
    signal: AbortSignal.timeout(STRAVA_TIMEOUT_MS),
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

/** What a pagination run managed to do. */
export interface FetchActivitiesResult {
  /** Pages that came back and were handed to `onPage`. */
  pages: number;
  /** True only when pagination ran all the way to an empty page — i.e. every
   * activity in the requested window was seen. Callers that reason about
   * *absence* (the deletion sweep) must check this: on false the set of
   * activities observed is a prefix, not the whole window. */
  complete: boolean;
  /** What stopped it, if anything. Pages already handed to `onPage` remain
   * valid — this is a partial result, not a failed one. */
  error: Error | null;
}

/** Every activity since `after`, paginated, handed to `onPage` one page at a
 * time.
 *
 * Pages are pushed to the caller rather than accumulated and returned because a
 * throw on page 5 of 8 used to discard pages 1-4: nothing was written, the
 * cursor never advanced, and a backfill big enough to exhaust the read quota
 * could never make progress — every run failed in exactly the same place.
 * Writing each page as it lands means a partial run still moves the cursor
 * forward and the next run resumes from there.
 *
 * Never throws; the error comes back in the result.
 *
 * Pagination stops on an *empty* page, not a short one. Neither Strava's
 * maximum per_page nor its ordering under `after` is documented, and Strava
 * applies some filtering after pagination, so a page can come back short while
 * later pages still hold data — page 1 returning 97 and page 2 returning 96
 * would silently truncate the sync under a short-page rule, permanently, since
 * the cursor would then advance past what was never fetched. Requiring an empty
 * page is the only sound stop condition and costs exactly one extra request. */
export async function fetchActivities(
  opts: { after?: Date },
  onPage: (batch: SummaryActivity[]) => Promise<void>,
): Promise<FetchActivitiesResult> {
  const result: FetchActivitiesResult = { pages: 0, complete: false, error: null };

  try {
    const token = await getAccessToken();

    for (let page = 1; page <= MAX_PAGES; page++) {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(PER_PAGE),
      });
      if (opts.after) params.set("after", String(Math.floor(opts.after.getTime() / 1000)));

      const res = await stravaGet("/athlete/activities", params, token);
      if (!res.ok) {
        throw new StravaHttpError(
          res.status,
          `Strava activity fetch failed (page ${page}): ${res.status} ${res.statusText} — ${await res.text()}`,
        );
      }

      const batch = parseActivities(await res.json(), `page ${page}`);
      if (batch.length === 0) {
        result.complete = true;
        return result;
      }

      await onPage(batch);
      result.pages++;
    }

    // Falling out of the loop means MAX_PAGES was reached without an empty
    // page, so this is an incomplete run and must be reported as one.
    result.error = new Error(
      `Strava pagination hit the ${MAX_PAGES}-page guard; the sync is almost certainly incomplete`,
    );
  } catch (error) {
    result.error = error instanceof Error ? error : new Error(String(error));
  }

  return result;
}

/** `GET /athlete/activities` can't filter by id, so this hits the by-id
 * endpoint. Returns null on 404: the activity was deleted between the webhook
 * firing and this call, which is a normal race rather than a failure. */
export async function fetchActivity(id: number): Promise<SummaryActivity | null> {
  const token = await getAccessToken();
  const res = await stravaGet(`/activities/${id}`, null, token);

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new StravaHttpError(
      res.status,
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
  "private",
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
    private: activity.private ?? null,
    name: activity.name ?? null,
  };
}

/** What one upsert actually did. Split because "rows written" alone can't tell
 * a backfill from a no-op re-read of the lookback window. */
export interface UpsertResult {
  inserted: number;
  updated: number;
}

/** Writes activities in one multi-row statement.
 * Idempotent by construction — replaying the same batch costs one query and
 * changes nothing but `synced_at`, so retries are free. */
export async function upsertActivities(activities: SummaryActivity[]): Promise<UpsertResult> {
  if (activities.length === 0) return { inserted: 0, updated: 0 };

  // Dedupe by id, last wins. `ON CONFLICT (id) DO UPDATE` raises
  // "ERROR 21000: ON CONFLICT DO UPDATE command cannot affect row a second
  // time" when one statement carries the same key twice, and that error takes
  // down the whole batch — nothing at all gets written. A duplicate is not
  // hypothetical: an activity created mid-pagination shifts the window under
  // `after`, so a boundary activity can legitimately appear on two pages.
  const byId = new Map<number, SummaryActivity>();
  for (const activity of activities) byId.set(activity.id, activity);

  const sql = getSql();
  const rows = [...byId.values()].map(toRow);
  // `xmax = 0` on a RETURNING row distinguishes a fresh insert from a conflict
  // update; without it every row looks written and the reported counts are
  // just `rows.length` wearing a disguise.
  const written = await sql<{ inserted: boolean }[]>`
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
      "private" = EXCLUDED."private",
      name = EXCLUDED.name,
      synced_at = now()
    RETURNING (xmax = 0) AS inserted
  `;

  let inserted = 0;
  for (const row of written) if (row.inserted) inserted++;
  return { inserted, updated: written.length - inserted };
}

/** Hard delete — Strava is the system of record, so there's deliberately no
 * tombstone column to reconcile against. */
export async function deleteActivity(id: number): Promise<boolean> {
  const deleted = await getSql()<{ id: string }[]>`
    DELETE FROM strava_activities WHERE id = ${id} RETURNING id
  `;
  return deleted.length > 0;
}

/** Bulk form of deleteActivity, for the reconciliation sweep. */
export async function deleteActivities(ids: number[]): Promise<number> {
  if (ids.length === 0) return 0;
  const sql = getSql();
  const deleted = await sql<{ id: string }[]>`
    DELETE FROM strava_activities WHERE id IN ${sql(ids)} RETURNING id
  `;
  return deleted.length;
}

/** Ids we hold whose start_date is strictly after `since`, or every id when
 * `since` is null.
 *
 * Strictly after, to mirror Strava's `after` filter: an activity sitting
 * exactly on the boundary may or may not come back in the fetch, and treating
 * it as "expected but missing" would delete a perfectly live row.
 *
 * Ids are int8 and postgres.js has no int8 parser, hence the `::text`. Strava
 * ids are far below 2^53, so Number is lossless here. */
export async function getActivityIdsSince(since: Date | null): Promise<number[]> {
  const sql = getSql();
  const rows = since
    ? await sql<{ id: string }[]>`
        SELECT id::text FROM strava_activities WHERE start_date > ${since}
      `
    : await sql<{ id: string }[]>`SELECT id::text FROM strava_activities`;
  return rows.map((row) => Number(row.id));
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
