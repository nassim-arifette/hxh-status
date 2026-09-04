const SIGNATURE_PREFIX = "sha256=";
const SIGNATURE_CONTEXT = "hxhstatus-automation-payload:v1\n";

// The Worker signs dispatches to the Action, and the Action signs verdicts back
// to the Worker. Domain-separating the two means a signature captured from one
// direction cannot be replayed as the other, even though both hang off secrets
// held by the same two parties.
export const AUTOMATION_SIGNATURE_CONTEXT = SIGNATURE_CONTEXT;
export const TRACKER_VERDICT_SIGNATURE_CONTEXT =
  "hxhstatus-tracker-verdict:v1\n";
const MIN_SECRET_LENGTH = 32;
const MAX_PAYLOAD_AGE_MS = 6 * 60 * 60 * 1_000;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1_000;
const encoder = new TextEncoder();

function assertSecret(secret) {
  if (typeof secret !== "string" || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `AUTOMATION_PAYLOAD_SECRET must contain at least ${MIN_SECRET_LENGTH} characters.`,
    );
  }
}

function assertPayloadText(payloadText) {
  if (typeof payloadText !== "string" || payloadText.length === 0) {
    throw new TypeError("Automation payload text must be a non-empty string.");
  }
}

async function importKey(secret, usage) {
  assertSecret(secret);
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

function signedBytes(payloadText, context) {
  assertPayloadText(payloadText);
  return encoder.encode(context + payloadText);
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function signAutomationPayload(
  payloadText,
  secret,
  { context = SIGNATURE_CONTEXT } = {},
) {
  const key = await importKey(secret, "sign");
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    signedBytes(payloadText, context),
  );
  return SIGNATURE_PREFIX + bytesToBase64(new Uint8Array(signature));
}

export async function verifyAutomationPayloadSignature(
  payloadText,
  signatureHeader,
  secret,
  { context = SIGNATURE_CONTEXT } = {},
) {
  if (
    typeof signatureHeader !== "string" ||
    !/^sha256=[A-Za-z0-9+/]{43}=$/.test(signatureHeader)
  ) {
    return false;
  }

  try {
    const key = await importKey(secret, "verify");
    return crypto.subtle.verify(
      "HMAC",
      key,
      base64ToBytes(signatureHeader.slice(SIGNATURE_PREFIX.length)),
      signedBytes(payloadText, context),
    );
  } catch {
    return false;
  }
}

export function assertFreshAutomationPayload(
  payload,
  now = Date.now(),
  {
    maxAgeMs = MAX_PAYLOAD_AGE_MS,
    maxFutureSkewMs = MAX_FUTURE_SKEW_MS,
  } = {},
) {
  const requestedAt = Date.parse(payload?.requestedAt ?? "");
  if (!Number.isFinite(requestedAt)) {
    throw new Error("Automation payload requestedAt is invalid.");
  }
  if (requestedAt > now + maxFutureSkewMs) {
    throw new Error("Automation payload requestedAt is in the future.");
  }
  if (requestedAt < now - maxAgeMs) {
    throw new Error("Automation payload has expired.");
  }
}
