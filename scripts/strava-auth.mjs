#!/usr/bin/env node
// One-time OAuth dance to mint the initial Strava refresh token. Run by hand,
// once, per docs/strava-setup.md — everything after this is automatic via
// src/lib/strava.ts, which treats the strava_auth table as authoritative.
import { createServer } from "node:http";
import { URL } from "node:url";

const PORT = 8420;
const REDIRECT_URI = `http://localhost:${PORT}/exchange_token`;

const clientId = process.env.STRAVA_CLIENT_ID;
const clientSecret = process.env.STRAVA_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    [
      "STRAVA_CLIENT_ID and/or STRAVA_CLIENT_SECRET are not set.",
      "",
      "Create a Strava API app first:",
      "  1. Go to https://www.strava.com/settings/api",
      "  2. Create an application (any name/website is fine for a personal integration).",
      "  3. Set 'Authorization Callback Domain' to: localhost",
      "  4. Copy the Client ID and Client Secret into .env.local as",
      "     STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET, then re-run this script.",
    ].join("\n"),
  );
  process.exit(1);
}

const authorizeUrl = new URL("https://www.strava.com/oauth/authorize");
authorizeUrl.searchParams.set("client_id", clientId);
authorizeUrl.searchParams.set("response_type", "code");
authorizeUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authorizeUrl.searchParams.set("approval_prompt", "force");
authorizeUrl.searchParams.set("scope", "activity:read_all");

console.log("Open this URL in a browser and authorize the app:\n");
console.log(`  ${authorizeUrl.toString()}\n`);
console.log(
  [
    "Scope requested: activity:read_all. This is required to read activities whose",
    "visibility is 'Only You' — the site needs to know an activity is private in",
    "order to exclude it, which means it has to be able to see it in the first place.",
    "",
    "Reminder: the app's 'Authorization Callback Domain' (in the Strava API settings)",
    "must be set to 'localhost', or Strava will refuse the redirect.",
    "",
    `Waiting for the redirect on ${REDIRECT_URI} ...`,
  ].join("\n"),
);

function respond(res, status, body) {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
  res.end(body);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== "/exchange_token") {
    respond(res, 404, "<p>Not found.</p>");
    return;
  }

  const error = url.searchParams.get("error");
  if (error) {
    respond(res, 400, "<p>Authorization denied. You can close this tab.</p>");
    console.error(`\nStrava returned an error: ${error}`);
    process.exitCode = 1;
    server.close();
    return;
  }

  const code = url.searchParams.get("code");
  if (!code) {
    respond(res, 400, "<p>No authorization code in the redirect. You can close this tab.</p>");
    console.error("\nRedirect had no 'code' parameter — something is off. Try again.");
    process.exitCode = 1;
    server.close();
    return;
  }

  try {
    const tokenRes = await fetch("https://www.strava.com/api/v3/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
      }),
    });

    const body = await tokenRes.text();
    if (!tokenRes.ok) {
      throw new Error(`${tokenRes.status} ${tokenRes.statusText} — ${body}`);
    }

    const token = JSON.parse(body);

    respond(res, 200, "<p>Authorized. You can close this tab and go back to the terminal.</p>");

    console.log("\nAuthorized.\n");
    console.log(`Athlete id: ${token.athlete?.id ?? "(missing from response)"}`);
    console.log("Note this down — the webhook route needs it to verify owner_id.\n");
    console.log("Paste this into .env.local as STRAVA_REFRESH_TOKEN:\n");
    console.log(`  ${token.refresh_token}\n`);
  } catch (err) {
    respond(res, 500, "<p>Token exchange failed. Check the terminal.</p>");
    console.error(`\nToken exchange failed: ${err.message}`);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});

server.listen(PORT);
