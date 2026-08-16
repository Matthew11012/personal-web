# Strava training data — setup runbook

For setting up a fresh clone, or for future-you after this has been running
unattended for a year and every detail has been forgotten. Follow in order.

## 1. Create the Strava API app

1. Go to https://www.strava.com/settings/api and create an application.
   Name/website/icon can be anything — this is a personal integration, not a
   public one.
2. Set **Authorization Callback Domain** to `localhost`. The auth script in
   step 5 runs a local server and needs Strava to accept a redirect to it.
3. Record the **Client ID** and **Client Secret** shown on the app's settings
   page. You'll need both for `.env.local`.

## 2. Create a Supabase project

1. Create a project at https://supabase.com.
2. In the project's connection settings, find the **transaction-mode pooler**
   connection string — port **6543**, not the direct connection on 5432.
   `src/lib/db.ts` connects with `prepare: false` specifically because
   transaction-mode pooling can't carry prepared statements across checkouts,
   so pointing this at 5432 works right up until it doesn't.
3. This string goes in `.env.local` as `DATABASE_URL`.

## 3. Set up `.env.local`

```
cp .env.example .env.local
```

Fill in `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, and `DATABASE_URL` from
the steps above. Leave `STRAVA_REFRESH_TOKEN`, `STRAVA_ATHLETE_ID`,
`STRAVA_VERIFY_TOKEN`, `STRAVA_SUBSCRIPTION_ID` and `CRON_SECRET` for the steps below — pick any
string you like for `STRAVA_VERIFY_TOKEN` and `CRON_SECRET`, they're just
shared secrets you're choosing.

## 4. Apply the schema

```
npm run db:push
```

Applies `db/schema.sql` to `DATABASE_URL`. Safe to re-run any time — it's
written entirely in `CREATE ... IF NOT EXISTS` form.

## 5. Run the one-time OAuth dance

```
npm run strava:auth
```

Opens a local server on `localhost:8420`, prints an authorize URL — open it,
approve access, and the script catches the redirect itself. It prints:

- a **refresh token**: paste it into `.env.local` as `STRAVA_REFRESH_TOKEN`.
- an **athlete id**: paste it into `.env.local` as `STRAVA_ATHLETE_ID`. The
  webhook compares it against `owner_id` on incoming events and ignores
  anything that isn't yours.

This only needs to run once, ever, per environment. After the first
successful token refresh, the `strava_auth` table in Postgres becomes the
system of record and `STRAVA_REFRESH_TOKEN` goes stale (see below).

## 6. Deploy, then register the webhook

Deploy the site first — Strava validates the callback URL synchronously by
calling `GET` on it during subscription creation, so the endpoint has to
already be live.

```
npm run strava:subscribe create https://<your-production-domain>/api/strava/webhook
```

Strava allows exactly **one push subscription per application, globally**.
Dev and prod will fight over it if you try to register both. Point the one
subscription at production; for local testing, use a tunnel (ngrok or
similar) or register a second Strava app for development.

On success, the script prints a subscription id — set it as
`STRAVA_SUBSCRIPTION_ID`.

Use `npm run strava:subscribe list` to check what's currently registered, and
`npm run strava:subscribe delete` to remove it (reads the id from
`STRAVA_SUBSCRIPTION_ID` if you don't pass one).

## 7. Set every variable in both places

Everything in `.env.local` also needs to be set in the Vercel project's
environment variables: `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`,
`STRAVA_REFRESH_TOKEN`, `STRAVA_ATHLETE_ID`, `STRAVA_VERIFY_TOKEN`,
`STRAVA_SUBSCRIPTION_ID`, `DATABASE_URL`, `CRON_SECRET`.

## Why it's shaped this way

**Refresh tokens rotate.** Strava invalidates the previous refresh token the
instant it issues a new one. An env var can't be rewritten by a running
server, so `STRAVA_REFRESH_TOKEN` only ever bootstraps the `strava_auth`
table on the very first token refresh — after that, the table is
authoritative and the env var is inert. If you edit it later expecting it to
do anything, it won't.

**The webhook is the fast path for a privacy change or a delete, but not the
only one.** Flipping an activity to "Only You" on Strava, or deleting it,
reaches the site within seconds through the webhook `update`/`delete` events.
Strava never re-delivers an event once it has seen a 200, though, so the
webhook alone would mean a single dropped delivery leaves a private activity
published forever. Two things stop that: the webhook retries a failed fetch
three times before giving up, and the cron sweep re-reads the trailing
window and reconciles it (see below).

**The cron's cursor looks 14 days behind itself.** The cursor is
`MAX(start_date)`, and a naive `after = cursor` is permanently blind to
anything that lands *out of order* — a 06:00 swim still on the watch when an
08:00 ride auto-uploads and drags the cursor forward, a backdated manual
entry, a Garmin or Zwift backfill. Subtracting a fortnight before asking
Strava closes that; the upserts are idempotent, so the overlap costs about
one extra page per run.

That same window is what makes deletes self-heal. Once a run has paginated
all the way to an empty page, anything we hold inside the window that Strava
did *not* return has been deleted or hidden, and is removed locally. This is
strictly scoped to the fetched window and skipped entirely if pagination
stopped early — otherwise an incomplete run would wipe the history.

**The cron is a reconciliation sweep, not the primary path.** It exists to
catch webhook deliveries Strava gave up retrying. If webhooks never failed,
the cron would find nothing but rows it already has.

## Troubleshooting

**The site's "updated N days ago" readout looks stale.** That line is driven
by `MAX(synced_at)` and is the only failure signal anyone will actually
notice — it means the cron has been failing silently. Check the cron route's
logs (Vercel), and confirm `CRON_SECRET` still matches between Vercel's
scheduled invocation and the environment variable.

**The refresh token is stranded** (e.g. a deploy crashed mid-refresh after
Strava issued a new token but before the transaction committed, or the
database was reset). **Check the logs first.** `getAccessToken` prints the
newly-issued refresh token to `console.error` when a refresh succeeds but
persisting it fails — that is the exact moment it would otherwise be lost, so
writing it to the log is a deliberate trade. Search the Vercel logs for
`token refresh succeeded but persisting it failed`; if it's there, put that
token in `STRAVA_REFRESH_TOKEN`, delete the `strava_auth` row (below), and
you're done without re-authorising.

Otherwise, re-run the OAuth dance:

```
npm run strava:auth
```

Update `STRAVA_REFRESH_TOKEN` in `.env.local` (and Vercel) with the new
value, then delete the row in `strava_auth` so it re-seeds from the env var
on the next sync:

```sql
DELETE FROM strava_auth WHERE id = 1;
```
