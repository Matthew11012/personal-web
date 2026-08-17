import { after } from "next/server";
import { z } from "zod";
import { deleteActivity, fetchActivity, isRetryable, upsertActivities } from "@/lib/strava";
import { revalidateTrainingSurfaces } from "@/lib/sync";

// Never cached: a cached handshake would echo a stale challenge, and a cached
// POST would drop events on the floor.
export const dynamic = "force-dynamic";

// One activity fetch plus one upsert — a fraction of the cron's budget. The
// ceiling matters because `after` work runs inside it: exceed it and the sync
// is killed after Strava has already been told 200.
export const maxDuration = 30;

/** Attempts for the deferred work, including the first. Three attempts with the
 * backoff below is a couple of seconds of waiting at worst, comfortably inside
 * `maxDuration`. */
const MAX_ATTEMPTS = 3;

/** Waits between attempts, in milliseconds. Long enough to ride out a 502 or a
 * brief 429; short enough that the whole retry chain plus three Strava requests
 * stays well under the 30s ceiling. */
const RETRY_DELAYS_MS = [1_000, 3_000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** An env var that must be a whole number, or null. Missing, empty,
 * whitespace-only and non-numeric all collapse to null so the caller can reject
 * rather than compare against an accidental 0. */
function requiredId(value: string | undefined): number | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : null;
}

/** Runs `work` until it succeeds or the attempts run out.
 *
 * This exists because a failure here is *permanent data loss*, not a missed
 * refresh. Strava never re-delivers an event once it has seen a 200, and the
 * cron's incremental cursor cannot observe an update or a delete on its own. So
 * the sequence "activity flipped to only_me → update event → fetchActivity hits
 * a 429 → error logged and dropped" leaves the stored row saying
 * `visibility = 'everyone'` and the activity published on the site
 * indefinitely. Revalidation doesn't help; the row is wrong, not the cache.
 *
 * Only retryable failures are retried — a clean 404 never reaches here at all
 * (fetchActivity returns null for it), and a 401 would fail identically three
 * times over. */
async function withRetries<T>(label: string, work: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await work();
    } catch (error) {
      if (attempt >= MAX_ATTEMPTS || !isRetryable(error)) throw error;
      const delay = RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
      console.warn(
        `[webhook] ${label} failed on attempt ${attempt}/${MAX_ATTEMPTS}, retrying in ${delay}ms: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      await sleep(delay);
    }
  }
}

/** Strava's event payload. Untrusted input — anyone can POST here (see below),
 * so nothing in this shape is believed beyond `object_id`, which is only ever
 * used to go ask Strava what the activity actually is. */
const eventSchema = z.object({
  object_type: z.enum(["activity", "athlete"]),
  object_id: z.number(),
  aspect_type: z.enum(["create", "update", "delete"]),
  updates: z.record(z.string(), z.unknown()).optional(),
  owner_id: z.number(),
  subscription_id: z.number(),
  event_time: z.number(),
});

/** The subscription handshake. Strava calls this synchronously while
 * `POST /push_subscriptions` is still in flight and gives up after ~2s, so
 * this does the comparison and nothing else — no database, no Strava call.
 *
 * A plain string compare is enough: the handshake is a one-off, and the only
 * thing a leaked verify token buys an attacker is an echoed challenge. */
export function GET(request: Request): Response {
  const expected = process.env.STRAVA_VERIFY_TOKEN;

  // Fail closed. Without the token there is nothing to prove the callback is
  // ours, and confirming a subscription we can't validate is worse than none.
  if (!expected) {
    return Response.json(
      { error: "STRAVA_VERIFY_TOKEN is not set; refusing to confirm a subscription." },
      { status: 403 },
    );
  }

  const params = new URL(request.url).searchParams;
  const challenge = params.get("hub.challenge");

  if (
    params.get("hub.mode") !== "subscribe" ||
    params.get("hub.verify_token") !== expected ||
    challenge === null
  ) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // `hub.challenge` is a literal key containing a dot, not a nested object.
  // Strava rejects the subscription outright if this shape is wrong.
  return Response.json({ "hub.challenge": challenge });
}

/** An activity or athlete event. Three constraints shape everything here:
 *
 * 1. Strava wants 200 within two seconds. Miss it and it retries three times
 *    and then drops the event permanently — so the response goes out first and
 *    the fetch-and-upsert happens in `after()`. Nothing is awaited before the
 *    return.
 *
 * 2. This endpoint cannot be secret-protected. Strava sends no bearer token; it
 *    POSTs unauthenticated to a public URL, so `CRON_SECRET` has no place here
 *    and requiring it would simply break the integration. The defences instead
 *    are: reject anything whose `subscription_id`/`owner_id` isn't ours, and
 *    treat the payload as untrusted — `object_id` is used *only* to go ask
 *    Strava about that activity, and every write is driven by Strava's answer
 *    rather than by the payload. That includes the destructive one: a `delete`
 *    event is confirmed with a fetch that must 404 before anything is removed,
 *    so a forged payload cannot delete a row that still exists on Strava.
 *    Assume anyone can find this URL and make the site perform one Strava API
 *    call; the handler stays cheap and idempotent for that reason.
 *
 * 3. Strava allows one subscription per application, globally — dev and prod
 *    will fight over it. Not a code concern, but it's why `subscription_id` is
 *    checked at all.
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  // A malformed body gets a 200: a retry would deliver the same garbage, so
  // there is nothing to gain from asking Strava to send it again.
  try {
    body = await request.json();
  } catch {
    console.warn("[webhook] ignoring request with an unparseable body");
    return Response.json({ ok: true });
  }

  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    console.warn(`[webhook] ignoring unrecognised payload: ${parsed.error.message}`);
    return Response.json({ ok: true });
  }

  const event = parsed.data;

  // Fail closed on anything that isn't a real id. `Number(undefined)` is NaN
  // and matches nothing, but `Number("")` and `Number("  ")` are both **0** —
  // and an env var that exists but is empty is a single stray keystroke in the
  // Vercel dashboard. Under a bare `Number()` an unauthenticated POST of
  // `{"subscription_id":0,"owner_id":0}` would then pass both checks, which is
  // the opposite of failing closed.
  const expectedSubscription = requiredId(process.env.STRAVA_SUBSCRIPTION_ID);
  const expectedAthlete = requiredId(process.env.STRAVA_ATHLETE_ID);

  if (expectedSubscription === null || expectedAthlete === null) {
    console.error(
      "[webhook] STRAVA_SUBSCRIPTION_ID and STRAVA_ATHLETE_ID must both be set to integers; refusing to process events until they are.",
    );
    return Response.json({ ok: true });
  }

  if (event.subscription_id !== expectedSubscription || event.owner_id !== expectedAthlete) {
    console.warn(
      `[webhook] ignoring event that isn't ours (subscription ${event.subscription_id}, owner ${event.owner_id})`,
    );
    return Response.json({ ok: true });
  }

  after(async () => {
    // An unhandled rejection in `after` is invisible: Strava has already been
    // told 200 and will never retry, so a swallowed error here is lost data.
    // The retries above are the first line of defence and the cron's lookback
    // sweep is the second; this catch is what makes the failure visible in
    // between.
    try {
      // A deauthorisation (`updates.authorized === "false"`). Activity data is
      // deliberately left alone; loud because the integration is now dead and
      // every subsequent sync fails until the OAuth dance is redone.
      if (event.object_type === "athlete") {
        console.error(
          `[webhook] athlete event for ${event.owner_id} (${JSON.stringify(event.updates ?? {})}) — if this is a deauthorisation, the integration is dead until \`npm run strava:auth\` is re-run`,
        );
        return;
      }

      const changed = await withRetries(
        `${event.aspect_type} for activity ${event.object_id}`,
        async () => {
          if (event.aspect_type === "delete") {
            // Verify against Strava before destroying anything. The payload is
            // untrusted and `object_id` is just an integer someone POSTed: a
            // straight `deleteActivity(event.object_id)` deletes by
            // attacker-supplied id, and a row older than the sync cursor is
            // then unrecoverable by any sweep. Asking Strava first costs one
            // read and makes the destructive path answerable to Strava rather
            // than to the caller — only a 404 (fetchActivity returning null)
            // confirms the activity is genuinely gone.
            const stillThere = await fetchActivity(event.object_id);
            if (stillThere) {
              console.warn(
                `[webhook] ignoring delete for activity ${event.object_id}: Strava still has it`,
              );
              return false;
            }
            // Hard delete, no tombstone: Strava is the system of record.
            return await deleteActivity(event.object_id);
          }

          const activity = await fetchActivity(event.object_id);

          // null means it was deleted in the race between the event firing and
          // this fetch; the matching delete event handles it.
          if (!activity) return false;

          // An `update` is how a privacy change arrives: `fetchActivity`
          // returns the current `visibility` and `private`, the upsert stores
          // them, and the query layer filters on them, so "make private" flips
          // to excluded on the next render. This is why webhooks are the fast
          // path — though no longer the only one, since reconcileActivities now
          // re-reads the trailing window and heals a lost delivery.
          const written = await upsertActivities([activity]);
          return written.inserted + written.updated > 0;
        },
      );

      if (changed) {
        await revalidateTrainingSurfaces();
      }
    } catch (error) {
      console.error(
        `[webhook] gave up on ${event.aspect_type} for activity ${event.object_id} after ${MAX_ATTEMPTS} attempts; the next cron sweep should heal it: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  });

  return Response.json({ ok: true });
}
