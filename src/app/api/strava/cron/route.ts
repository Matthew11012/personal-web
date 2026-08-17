import { timingSafeEqual } from "node:crypto";
import { reconcileActivities, revalidateTrainingSurfaces } from "@/lib/sync";

// Never cached: a cached sweep would report the previous run's numbers and
// silently stop syncing.
export const dynamic = "force-dynamic";

// The first run has no cursor and walks the entire activity history; every
// later run is a handful of seconds. Even the backfill is only a few pages at
// this volume (~33 weeks), so 60s is generous — and it is also the ceiling on
// Vercel's Hobby plan, where a higher value is rejected at build time.
export const maxDuration = 60;

/** Constant-time compare that tolerates a length mismatch. `timingSafeEqual`
 * throws when the buffers differ in length, and the length check itself leaks
 * nothing an attacker can't already measure. */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The reconciliation sweep. Not the main sync path — the webhook is primary
 * and near-realtime; this exists to catch deliveries Strava gave up on.
 *
 * GET because that's what Vercel Cron issues.
 *
 * Status codes: 200 when the sync completed, 500 when work was attempted but
 * `errors` is non-empty. The body is the same `SyncResult` either way, so
 * hitting this by hand tells you the truth about what it did — that is the
 * entire diagnostic story for this integration. */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;

  // Fail closed. A missing secret must never mean "allow": unguarded, this
  // endpoint is a public rate-limit sink that anyone can hit to burn the day's
  // Strava quota, and the sync would then fail for the rest of the day.
  if (!secret) {
    return Response.json(
      { error: "CRON_SECRET is not set; refusing to run an unauthenticated sync." },
      { status: 500 },
    );
  }

  const authorization = request.headers.get("Authorization") ?? "";
  if (!secretMatches(authorization, `Bearer ${secret}`)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await reconcileActivities();

  if (result.synced > 0 || result.deleted > 0) {
    await revalidateTrainingSurfaces();
  }

  return Response.json(result, { status: result.errors.length > 0 ? 500 : 200 });
}
