import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import webpush from "web-push";

const file = resolve(process.cwd(), ".dev.vars");
let existing = "";

try {
  existing = await readFile(file, "utf8");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const entries = new Map();
const passthrough = [];

for (const line of existing.split(/\r?\n/)) {
  const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  if (match) entries.set(match[1], match[2]);
  else if (line) passthrough.push(line);
}

const hasPublicKey = entries.has("VAPID_PUBLIC_KEY");
const hasPrivateKey = entries.has("VAPID_PRIVATE_KEY");

if (hasPublicKey !== hasPrivateKey) {
  throw new Error(
    ".dev.vars contains only one VAPID key. Remove the incomplete key and retry.",
  );
}

if (!hasPublicKey) {
  const keys = webpush.generateVAPIDKeys();
  entries.set("VAPID_PUBLIC_KEY", keys.publicKey);
  entries.set("VAPID_PRIVATE_KEY", keys.privateKey);
}

entries.set("PUSH_NOTIFICATIONS_ENABLED", "true");
entries.set("PUSH_TEST_ENABLED", "true");
entries.set("PUSH_INITIAL_TWEET_ID", "2094673907626414299");
entries.set("VAPID_SUBJECT", "mailto:contact@hxhstatus.com");

if (!entries.has("TOGASHI_LIST_ID")) {
  entries.set("TOGASHI_LIST_ID", "2095219478636495163");
}
if (!entries.has("TOGASHI_USER_ID")) {
  entries.set("TOGASHI_USER_ID", "1528978792617611264");
}

const managedOrder = [
  "PUSH_NOTIFICATIONS_ENABLED",
  "PUSH_TEST_ENABLED",
  "PUSH_INITIAL_TWEET_ID",
  "VAPID_SUBJECT",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "TOGASHI_LIST_ID",
  "TOGASHI_USER_ID",
];
const managed = new Set(managedOrder);
const lines = [
  ...passthrough,
  ...[...entries]
    .filter(([key]) => !managed.has(key))
    .map(([key, value]) => `${key}=${value}`),
  ...managedOrder.map((key) => `${key}=${entries.get(key)}`),
  "",
];

await writeFile(file, lines.join("\n"), { mode: 0o600 });
console.log("Local browser push is configured in .dev.vars (private key hidden).");
