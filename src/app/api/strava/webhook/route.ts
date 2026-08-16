import { after } from "next/server";
import { z } from "zod";
import { deleteActivity, fetchActivity, upsertActivities } from "@/lib/strava";
import { revalidateTrainingSurfaces } from "@/lib/sync";

// Never cached: a cached handshake would echo a stale challenge, and a cached
// POST would drop events on the floor.
export const dynamic = "force-dynamic";

// One activity fetch plus one upsert — a fraction of the cron's budget. The
// ceiling matters because `after` work runs inside it: exceed it and the sync
// is killed after Strava has already been told 200.
export const maxDuration = 30;

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
 *    treat the payload as untrusted — `object_id` is used *only* to go fetch
 *    the activity from Strava, and no payload content is ever written to the
 *    database. Assume anyone can find this URL and make the site perform one
 *    Strava API call; the handler stays cheap and idempotent for that reason.
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

  // `Number(undefined)` is NaN, which matches nothing — an unset variable fails
  // closed rather than accepting every event that arrives.
  const expectedSubscription = Number(process.env.STRAVA_SUBSCRIPTION_ID);
  const expectedAthlete = Number(process.env.STRAVA_ATHLETE_ID);

  if (event.subscription_id !== expectedSubscription || event.owner_id !== expectedAthlete) {
    console.warn(
      `[webhook] ignoring event that isn't ours (subscription ${event.subscription_id}, owner ${event.owner_id})`,
    );
    return Response.json({ ok: true });
  }

  after(async () => {
    // An unhandled rejection in `after` is invisible: Strava has already been
    // told 200 and will never retry, so a swallowed error here is permanently
    // lost data. Everything is caught and logged so the cron sweep's
    // divergence has something to be read against.
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

      let changed = false;

      if (event.aspect_type === "delete") {
        // Hard delete, no tombstone: Strava is the system of record.
        changed = await deleteActivity(event.object_id);
      } else {
        const activity = await fetchActivity(event.object_id);

        // null means it was deleted in the race between the event firing and
        // this fetch; the matching delete event handles it.
        if (activity) {
          // An `update` is how a privacy change arrives: `fetchActivity`
          // returns the current `visibility`, the upsert stores it, and the
          // query layer filters on it, so "make private" flips to excluded on
          // the next render. This is why webhooks are load-bearing rather than
          // a nicety — the incremental MAX(start_date) cursor can never
          // observe an update or a delete.
          changed = (await upsertActivities([activity])) > 0;
        }
      }

      if (changed) {
        await revalidateTrainingSurfaces();
      }
    } catch (error) {
      console.error(
        `[webhook] failed to process ${event.aspect_type} for activity ${event.object_id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  });

  return Response.json({ ok: true });
}
