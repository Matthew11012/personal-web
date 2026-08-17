#!/usr/bin/env node
// Applies db/schema.sql to DATABASE_URL. Safe to re-run — schema.sql is
// written entirely in CREATE ... IF NOT EXISTS form.
import postgres from "postgres";
import { fileURLToPath } from "node:url";
import path from "node:path";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. See .env.example.");
  process.exit(1);
}

const schemaPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "db",
  "schema.sql",
);

const sql = postgres(connectionString, { prepare: false, max: 1 });

try {
  // sql.file() with no bound args runs in simple-query mode, which is what
  // lets one call execute every statement in the file rather than just the
  // first.
  await sql.file(schemaPath);
  console.log(`Applied ${schemaPath}.`);
  console.log("Re-running this is safe — the schema is idempotent.\n");

  const [{ count: activityCount }] = await sql`SELECT count(*) FROM strava_activities`;
  const [{ count: authCount }] = await sql`SELECT count(*) FROM strava_auth`;
  console.log(`strava_activities: ${activityCount} row(s)`);
  console.log(`strava_auth: ${authCount} row(s)`);
} catch (err) {
  console.error(`Schema push failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
