import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

import webpush from "web-push";

// Sends a real, encrypted Web Push to the subscriptions held by the *local*
// Wrangler state, so a notification can be rehearsed end to end — encryption,
// the browser's push service, the service worker's rendering — without any
// chance of reaching a production subscriber. Local KV is a different store
// from the deployed one, and this script never passes `--remote`.
const NAMESPACE_ID = "3851985703a94cffa6a925d1dbbf5eb2";
const ACTIVE_PREFIX = "push:verified:";

const DEFAULT_PAYLOAD = {
  v: 1,
  kind: "tracker-milestone",
  revision: "2094673907626414299",
  chapters: [{ chapter: 428, to: "delivered" }],
  publication: null,
};

function wrangler(args) {
  return execFileSync("npx", ["wrangler", ...args], {
    encoding: "utf8",
    shell: true,
    stdio: ["ignore", "pipe", "ignore"],
  });
}

async function devVars() {
  const entries = new Map();

  for (const line of (await readFile(".dev.vars", "utf8")).split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (match) entries.set(match[1], match[2]);
  }

  return entries;
}

const vars = await devVars();
const publicKey = vars.get("VAPID_PUBLIC_KEY");
const privateKey = vars.get("VAPID_PRIVATE_KEY");
const subject = vars.get("VAPID_SUBJECT") ?? "mailto:contact@hxhstatus.com";

if (!publicKey || !privateKey) {
  throw new Error("Run `npm run push:setup-local` first: .dev.vars has no VAPID pair.");
}

const argument = process.argv[2];
const payload = argument ? JSON.parse(argument) : DEFAULT_PAYLOAD;

const keys = JSON.parse(
  wrangler(["kv", "key", "list", `--namespace-id=${NAMESPACE_ID}`]),
).filter((key) => key.name.startsWith(ACTIVE_PREFIX));

if (keys.length === 0) {
  throw new Error(
    "No local subscription. Run `npm run cf:dev`, open the site and enable notifications.",
  );
}

for (const { name } of keys) {
  const record = JSON.parse(
    wrangler(["kv", "key", "get", `--namespace-id=${NAMESPACE_ID}`, name, "--text"]),
  );
  const locale = payload.locale ?? record.locale ?? "en";

  try {
    await webpush.sendNotification(
      record.subscription,
      JSON.stringify({ ...payload, locale }),
      {
        vapidDetails: { subject, publicKey, privateKey },
        TTL: 60,
      },
    );
    console.log(`sent (${locale}) to ${new URL(record.subscription.endpoint).host}`);
  } catch (error) {
    console.error(
      `failed for ${name}: ${error?.statusCode ?? ""} ${error?.body ?? error?.message ?? error}`,
    );
  }
}
