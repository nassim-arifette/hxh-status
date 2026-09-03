import assert from "node:assert/strict";
import test from "node:test";

import {
  assertFreshAutomationPayload,
  signAutomationPayload,
  verifyAutomationPayloadSignature,
} from "./payload-auth.mjs";

const secret = "test-automation-payload-secret-32-chars";
const payload = JSON.stringify({ requestedAt: "2026-09-03T06:00:00.000Z" });

test("authenticates the exact automation payload with domain separation", async () => {
  const signature = await signAutomationPayload(payload, secret);

  assert.match(signature, /^sha256=[A-Za-z0-9+/]{43}=$/);
  assert.equal(
    await verifyAutomationPayloadSignature(payload, signature, secret),
    true,
  );
  assert.equal(
    await verifyAutomationPayloadSignature(payload + " ", signature, secret),
    false,
  );
  assert.equal(
    await verifyAutomationPayloadSignature(
      payload,
      signature,
      "different-automation-payload-secret!",
    ),
    false,
  );
});

test("rejects malformed signatures and weak secrets", async () => {
  assert.equal(
    await verifyAutomationPayloadSignature(payload, "sha256=invalid", secret),
    false,
  );
  await assert.rejects(
    signAutomationPayload(payload, "too-short"),
    /at least 32 characters/,
  );
});

test("accepts fresh payloads and rejects stale or future payloads", () => {
  const now = Date.parse("2026-09-03T06:00:00.000Z");

  assert.doesNotThrow(() =>
    assertFreshAutomationPayload(
      { requestedAt: "2026-09-03T05:59:00.000Z" },
      now,
    ),
  );
  assert.throws(
    () =>
      assertFreshAutomationPayload(
        { requestedAt: "2026-09-02T23:59:59.999Z" },
        now,
      ),
    /expired/,
  );
  assert.throws(
    () =>
      assertFreshAutomationPayload(
        { requestedAt: "2026-09-03T06:05:00.001Z" },
        now,
      ),
    /future/,
  );
});
