#!/usr/bin/env node
// Manage the single Strava push subscription. See docs/strava-setup.md.
//
// This endpoint authenticates with client_id + client_secret as plain
// form/query params, not a bearer token — unlike every other Strava API call.
import { URL } from "node:url";

const BASE = "https://www.strava.com/api/v3/push_subscriptions";
const CALLBACK_MAX_LENGTH = 255;

const HELP = `
Usage:
  node scripts/strava-subscribe.mjs list
  node scripts/strava-subscribe.mjs create <callback_url>
  node scripts/strava-subscribe.mjs delete [subscription_id]

Strava allows exactly ONE push subscription per application, globally. Dev
and prod will fight over it — point the subscription at production and use a
tunnel for local testing, or register a second Strava app for development.

'create' asks Strava to call GET on <callback_url> synchronously as part of
validation, so the endpoint must already be deployed and reachable before
this will succeed.
`.trim();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is not set. See .env.example.`);
    process.exit(1);
  }
  return value;
}

async function list(clientId, clientSecret) {
  const url = new URL(BASE);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);

  const res = await fetch(url);
  const body = await res.text();
  if (!res.ok) {
    console.error(`List failed: ${res.status} ${res.statusText} — ${body}`);
    process.exit(1);
  }

  const subs = JSON.parse(body);
  if (subs.length === 0) {
    console.log("No active subscriptions.");
    return;
  }
  for (const sub of subs) {
    console.log(`id=${sub.id}  callback_url=${sub.callback_url}  created_at=${sub.created_at}`);
  }
}

async function create(clientId, clientSecret, callbackUrl) {
  if (!callbackUrl) {
    console.error("Usage: node scripts/strava-subscribe.mjs create <callback_url>");
    process.exit(1);
  }
  if (callbackUrl.length > CALLBACK_MAX_LENGTH) {
    console.error(
      `callback_url is ${callbackUrl.length} characters; Strava's limit is ${CALLBACK_MAX_LENGTH}.`,
    );
    process.exit(1);
  }

  console.log(
    "Reminder: Strava allows exactly one subscription per application, globally, and\n" +
      "validates this callback with a synchronous GET request during creation — the\n" +
      "endpoint must already be deployed and reachable before this will succeed.\n",
  );

  const verifyToken = requireEnv("STRAVA_VERIFY_TOKEN");
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      callback_url: callbackUrl,
      verify_token: verifyToken,
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    console.error(`Create failed: ${res.status} ${res.statusText} — ${body}`);
    process.exit(1);
  }

  const sub = JSON.parse(body);
  console.log(`Subscription created: id=${sub.id}`);
  console.log("Set this as STRAVA_SUBSCRIPTION_ID in .env.local and in Vercel.");
}

async function del(clientId, clientSecret, idArg) {
  const id = idArg ?? process.env.STRAVA_SUBSCRIPTION_ID;
  if (!id) {
    console.error(
      "No subscription id given and STRAVA_SUBSCRIPTION_ID is not set.\n" +
        "Usage: node scripts/strava-subscribe.mjs delete [subscription_id]",
    );
    process.exit(1);
  }

  const url = new URL(`${BASE}/${id}`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);

  const res = await fetch(url, { method: "DELETE" });
  if (res.status !== 204 && !res.ok) {
    const body = await res.text();
    console.error(`Delete failed: ${res.status} ${res.statusText} — ${body}`);
    process.exit(1);
  }
  console.log(`Subscription ${id} deleted.`);
}

const [, , command, ...args] = process.argv;

if (!command || !["list", "create", "delete"].includes(command)) {
  console.log(HELP);
  process.exit(command ? 1 : 0);
}

const clientId = requireEnv("STRAVA_CLIENT_ID");
const clientSecret = requireEnv("STRAVA_CLIENT_SECRET");

if (command === "list") await list(clientId, clientSecret);
else if (command === "create") await create(clientId, clientSecret, args[0]);
else if (command === "delete") await del(clientId, clientSecret, args[0]);
