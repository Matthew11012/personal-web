// Server-side only. `server-only` isn't a dependency here, so nothing enforces
// this at build time — never import this module from a client component.
import postgres from "postgres";

// Cached on globalThis because `next dev` re-evaluates modules on every HMR
// reload, and a fresh client per reload leaks a connection pool each time.
const globalForDb = globalThis as typeof globalThis & {
  stravaDbClient?: postgres.Sql;
};

/** The one client for the whole app.
 *
 * Resolved lazily rather than at module scope so that a missing DATABASE_URL
 * breaks the sync — which genuinely needs it — instead of the entire build.
 * The plot and home pages import this transitively, so throwing at import time
 * would take the whole site down on any machine without credentials.
 *
 * Constructing the client opens no connection; postgres.js connects on first
 * query. Running a query at module scope would freeze data at build time. */
export function getSql(): postgres.Sql {
  const cached = globalForDb.stravaDbClient;
  if (cached) return cached;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add the Postgres connection string to .env.local for dev and to the deployment's environment variables.",
    );
  }

  const client = postgres(connectionString, {
    // Supabase's pooled connection string runs in transaction-mode pooling,
    // which cannot carry prepared statements across connection checkouts.
    prepare: false,
    // Serverless invocations are many and short-lived; a large pool per
    // instance exhausts the pooler long before it helps throughput.
    max: 3,
  });

  globalForDb.stravaDbClient = client;
  return client;
}
