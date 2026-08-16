CREATE TABLE IF NOT EXISTS strava_activities (
  id bigint PRIMARY KEY,
  sport_type text NOT NULL,
  start_date timestamptz NOT NULL,
  -- Weeks bucket on this column (not start_date) so that a Sunday 23:00 session belongs to the week as it was lived, not as UTC saw it
  start_date_local timestamptz NOT NULL,
  moving_time integer NOT NULL,
  distance double precision NOT NULL,
  total_elevation_gain double precision,
  -- elapsed_time, average_speed, average_heartrate and suffer_score are unused
  -- by the shipped charts. They arrive free in the same SummaryActivity, and
  -- storing them now means the deferred pace-trend work needs no re-sync.
  elapsed_time integer NOT NULL,
  average_speed double precision,
  average_heartrate double precision,
  suffer_score double precision,
  -- visibility is what the privacy filter actually keys on, but it is not in
  -- Strava's published SummaryActivity model. "private" is documented, so both
  -- are stored and the query layer requires them to agree: if Strava ever drops
  -- visibility the column goes NULL, which is already excluded, rather than the
  -- filter quietly opening up.
  visibility text,
  "private" boolean,
  name text,
  synced_at timestamptz NOT NULL DEFAULT now()
);

-- Added after the table shipped; kept alongside the CREATE TABLE so this file
-- stays safe to re-run against either an old or a new database.
ALTER TABLE strava_activities ADD COLUMN IF NOT EXISTS "private" boolean;

CREATE INDEX IF NOT EXISTS idx_strava_activities_start_date
  ON strava_activities (start_date);

CREATE INDEX IF NOT EXISTS idx_strava_activities_start_date_local
  ON strava_activities (start_date_local);

ALTER TABLE strava_activities ENABLE ROW LEVEL SECURITY;
-- RLS enabled with no policies: deliberate default-deny backstop since all access is server-side via the connection string


CREATE TABLE IF NOT EXISTS strava_auth (
  id integer PRIMARY KEY DEFAULT 1,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at bigint NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (id = 1)
);

-- This table exists because Strava invalidates the previous refresh token the moment a new one is issued.
-- Vercel env vars are not writable at runtime, so the current refresh token and access token must be stored in the database.
ALTER TABLE strava_auth ENABLE ROW LEVEL SECURITY;
-- RLS enabled with no policies: deliberate default-deny backstop since all access is server-side via the connection string
