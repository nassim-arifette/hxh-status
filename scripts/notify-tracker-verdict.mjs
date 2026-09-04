import { readFile } from "node:fs/promises";

import {
  TRACKER_VERDICT_SIGNATURE_CONTEXT,
  signAutomationPayload,
} from "../automation/payload-auth.mjs";

const TIMEOUT_MS = 15_000;
const ATTEMPTS = 3;

function required(name) {
  const value = process.env[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

const endpoint = new URL(required("TRACKER_VERDICT_URL"));
if (endpoint.protocol !== "https:") {
  throw new Error("TRACKER_VERDICT_URL must be https.");
}

const secret = required("TRACKER_VERDICT_SECRET");
const body = await readFile(required("AUTOMATION_VERDICT_FILE"), "utf8");
const signature = await signAutomationPayload(body, secret, {
  context: TRACKER_VERDICT_SIGNATURE_CONTEXT,
});

let lastError;

for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hxhstatus-signature": signature,
      },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = (await response.text()).slice(0, 500);

    if (response.ok) {
      console.log(
        JSON.stringify({ message: "Tracker verdict delivered.", body: text }),
      );
      process.exit(0);
    }

    // A rejected verdict will not become acceptable on a retry.
    if (response.status >= 400 && response.status < 500) {
      throw new Error(`Verdict rejected (${response.status}): ${text}`);
    }
    lastError = new Error(`Verdict failed (${response.status}): ${text}`);
  } catch (error) {
    if (/Verdict rejected/.test(error?.message ?? "")) throw error;
    lastError = error;
  }

  if (attempt < ATTEMPTS - 1) {
    await new Promise((resolve) => setTimeout(resolve, 1_000 * 2 ** attempt));
  }
}

// The Worker releases a withheld post on its own deadline, so a lost verdict
// costs latency and specificity, never the notification itself.
throw lastError ?? new Error("The tracker verdict could not be delivered.");
