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
2. In the project's connection settings, find the **pooled** connection
   string (transaction-mode pooler, usually port 6543), not the direct one.
   `src/lib/db.ts` connects with `prepare: false` specifically because the
   pooled connection can't carry prepared statements across checkouts.
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

**The webhook is the only thing that can propagate a privacy change or a
delete.** The cron's cursor is `MAX(start_date)` — it only asks Strava for
activities newer than what's already stored, which by construction can never
see an existing activity change visibility or disappear. Flipping an
activity to "Only You" on Strava, or deleting it, only reaches this site
through the webhook `update`/`delete` events.

**The cron is a reconciliation sweep, not the primary path.** It exists
purely to catch webhook deliveries Strava gave up retrying. Its job is
narrow: fetch anything newer than the cursor and upsert it. If webhooks never
failed, the cron would never have anything to do.

## Troubleshooting

**The site's "updated N days ago" readout looks stale.** That line is driven
by `MAX(synced_at)` and is the only failure signal anyone will actually
notice — it means the cron has been failing silently. Check the cron route's
logs (Vercel), and confirm `CRON_SECRET` still matches between Vercel's
scheduled invocation and the environment variable.

**The refresh token is stranded** (e.g. a deploy crashed mid-refresh after
Strava issued a new token but before it was persisted, or the database was
reset). Re-run the OAuth dance:

```
npm run strava:auth
```

Update `STRAVA_REFRESH_TOKEN` in `.env.local` (and Vercel) with the new
value, then delete the row in `strava_auth` so it re-seeds from the env var
on the next sync:

```sql
DELETE FROM strava_auth WHERE id = 1;
```
