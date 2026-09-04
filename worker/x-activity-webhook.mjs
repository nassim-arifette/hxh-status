import {
  AUTOMATION_SCHEMA_VERSION,
  TOGASHI_SCREEN_NAME,
  TOGASHI_USER_ID,
  TRACKER_STATUSES,
  assertSnowflakeId,
  canonicalTweetUrl,
  isAllowedMediaUrl,
  validateAutomationPayload,
} from "../automation/contracts.mjs";
import { hasMilestones } from "../automation/milestones.mjs";
import {
  TRACKER_VERDICT_SIGNATURE_CONTEXT,
  assertFreshAutomationPayload,
  verifyAutomationPayloadSignature,
} from "../automation/payload-auth.mjs";
import siteWorker, { runAutomation } from "./index.mjs";
import {
  deliverMilestones,
  deliverPushForTweets,
  maintainPushSubscriptions,
  skipPostBroadcast,
} from "./push-notifications.mjs";

const EVENT_TTL_SECONDS = 14 * 24 * 60 * 60;
const PROCESSED_TTL_SECONDS = 180 * 24 * 60 * 60;
const PENDING_TTL_SECONDS = 14 * 24 * 60 * 60;
const MAX_EVENT_BYTES = 2_000_000;
const MAX_CRC_TOKEN_BYTES = 512;
const MAX_X_RESPONSE_BYTES = 1_000_000;
const X_TIMEOUT_MS = 15_000;
const EVENT_PREFIX = "pipeline:event:";
const PENDING_PREFIX = "pipeline:pending:";
const PROCESSED_PREFIX = "pipeline:processed:";
const FALLBACK_INTERVAL_MS = 15 * 60 * 1_000;
// How long a post alert waits for the Action to say whether it moved a chapter.
// Long enough for Gemini to exhaust its three attempts, short enough that an
// incident does not swallow the notification entirely.
const WITHHELD_WINDOW_MS = 10 * 60 * 1_000;
const MAX_VERDICT_BYTES = 20_000;
const TRACKER_VERDICT_PATH = "/tracker-verdict";
const encoder = new TextEncoder();
let pipelineTail = Promise.resolve();

// X can deliver the webhook while the fallback Cron is running (or the other
// way around). Keep every downstream pipeline run ordered inside an isolate.
// Cross-isolate replays are still harmless because GitHub uses its repository
// cursor/concurrency group and Web Push uses its shared cursor and post topic.
export function serializePipeline(task) {
  if (typeof task !== "function") {
    throw new TypeError("Pipeline task must be a function.");
  }

  const run = pipelineTail.then(task, task);
  pipelineTail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function json(data, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function requiredString(env, name) {
  const value = env[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

function safeError(error) {
  return String(error?.message ?? error)
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 500);
}

async function importHmacKey(secret) {
  if (typeof secret !== "string" || secret.length === 0) {
    throw new Error("X consumer secret is not configured.");
  }
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
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

export async function createCrcResponseToken(secret, crcToken) {
  if (
    typeof crcToken !== "string" ||
    crcToken.length === 0 ||
    encoder.encode(crcToken).byteLength > MAX_CRC_TOKEN_BYTES
  ) {
    throw new TypeError("Invalid crc_token.");
  }

  // The CRC endpoint and event endpoint necessarily use the same X consumer
  // secret. Never sign a JSON object/array that could also be replayed as an
  // Activity POST body.
  try {
    // Match the POST decoder exactly; TextDecoder strips an initial UTF-8 BOM.
    const eventDecodedToken = new TextDecoder().decode(
      encoder.encode(crcToken),
    );
    const parsed = JSON.parse(eventDecodedToken);
    if (parsed !== null && typeof parsed === "object") {
      throw new TypeError("Invalid crc_token.");
    }
  } catch (error) {
    if (error instanceof TypeError) throw error;
  }

  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(crcToken),
  );
  return `sha256=${bytesToBase64(new Uint8Array(signature))}`;
}

export async function verifyWebhookSignature(secret, body, signatureHeader) {
  if (!/^sha256=[A-Za-z0-9+/]{43}=$/.test(signatureHeader ?? "")) {
    return false;
  }

  try {
    const signature = base64ToBytes(signatureHeader.slice("sha256=".length));
    const key = await importHmacKey(secret);
    return crypto.subtle.verify("HMAC", key, signature, body);
  } catch {
    return false;
  }
}

async function readBytesWithLimit(request, maxBytes) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new RangeError("Request body is too large.");
  }

  if (!request.body) return new Uint8Array();

  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new RangeError("Request body is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

async function responseTextWithLimit(response, maxBytes) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error("X response exceeded the safety size limit.");
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > maxBytes) {
    throw new Error("X response exceeded the safety size limit.");
  }
  return new TextDecoder().decode(bytes);
}

function isOriginalPost(payload) {
  if (!payload || typeof payload !== "object") return false;
  if (payload.in_reply_to_tweet_id || payload.in_reply_to_user_id) return false;

  return !(payload.referenced_tweets ?? []).some(
    (reference) =>
      reference?.type === "replied_to" || reference?.type === "retweeted",
  );
}

function validateActivityEvent(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new TypeError("X event data is invalid.");
  }
  if (
    typeof data.event_uuid !== "string" ||
    data.event_uuid.length < 1 ||
    data.event_uuid.length > 200 ||
    /[\u0000-\u001F\u007F]/.test(data.event_uuid)
  ) {
    throw new TypeError("X event UUID is invalid.");
  }

  if (data.event_type !== "post.create") {
    return { ignored: true, reason: "unsupported-event" };
  }
  if (
    data.filter?.user_id !== TOGASHI_USER_ID ||
    data.payload?.author_id !== TOGASHI_USER_ID
  ) {
    throw new TypeError("X event does not match the validated Togashi account.");
  }

  assertSnowflakeId(data.payload?.id, "X event post ID");
  if (!isOriginalPost(data.payload)) {
    return { ignored: true, reason: "reply-or-repost" };
  }

  return {
    ignored: false,
    eventUuid: data.event_uuid,
    postId: data.payload.id,
  };
}

async function digestKey(value) {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", encoder.encode(value)),
  );
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function eventKey(eventUuid) {
  return EVENT_PREFIX + (await digestKey(eventUuid));
}

function pendingKey(postId) {
  return PENDING_PREFIX + postId;
}

function processedKey(postId) {
  return PROCESSED_PREFIX + postId;
}

export async function enqueueActivityEvent(data, env) {
  if (!env.X_EVENT_STATE) {
    throw new Error("X_EVENT_STATE is not configured.");
  }

  const event = validateActivityEvent(data);
  const dedupeKey = await eventKey(data.event_uuid);
  if (await env.X_EVENT_STATE.get(dedupeKey)) {
    return { queued: false, duplicate: true };
  }

  await env.X_EVENT_STATE.put(dedupeKey, "1", {
    expirationTtl: EVENT_TTL_SECONDS,
  });

  if (event.ignored) {
    return { queued: false, duplicate: false, ignored: event.reason };
  }
  if (await env.X_EVENT_STATE.get(processedKey(event.postId))) {
    return { queued: false, duplicate: true };
  }

  const key = pendingKey(event.postId);
  if (!(await env.X_EVENT_STATE.get(key))) {
    await env.X_EVENT_STATE.put(
      key,
      JSON.stringify({
        version: 1,
        eventUuid: event.eventUuid,
        postId: event.postId,
        receivedAt: new Date().toISOString(),
        attempts: 0,
        automationComplete: false,
        pushComplete: false,
      }),
      { expirationTtl: PENDING_TTL_SECONDS },
    );
  }

  return { queued: true, duplicate: false, postId: event.postId };
}

function mediaUrls(includes) {
  return [
    ...new Set(
      (includes?.media ?? [])
        .filter((media) => media?.type === "photo")
        .map((media) => media.url)
        .filter(isAllowedMediaUrl),
    ),
  ].slice(0, 4);
}

export async function fetchTweetFromX(postId, env, fetchImpl = fetch) {
  assertSnowflakeId(postId, "Post ID");
  const bearerToken = requiredString(env, "X_BEARER_TOKEN");
  const url = new URL(`https://api.x.com/2/tweets/${postId}`);
  url.searchParams.set(
    "tweet.fields",
    "attachments,author_id,created_at,in_reply_to_user_id,note_tweet,referenced_tweets,text",
  );
  url.searchParams.set("expansions", "attachments.media_keys");
  url.searchParams.set(
    "media.fields",
    "media_key,preview_image_url,type,url",
  );

  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${bearerToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(X_TIMEOUT_MS),
  });
  const responseText = await responseTextWithLimit(
    response,
    MAX_X_RESPONSE_BYTES,
  );
  if (!response.ok) {
    throw new Error(
      `X post lookup failed (${response.status}): ${responseText
        .replace(/[\u0000-\u001F\u007F]/g, " ")
        .replace(/\s+/g, " ")
        .slice(0, 500)}`,
    );
  }

  const body = JSON.parse(responseText);
  const post = body?.data;
  if (
    post?.id !== postId ||
    post?.author_id !== TOGASHI_USER_ID ||
    !isOriginalPost(post)
  ) {
    throw new Error("X post lookup did not return an original Togashi post.");
  }

  const fullText = String(post.note_tweet?.text ?? post.text ?? "");
  const payload = validateAutomationPayload({
    schemaVersion: AUTOMATION_SCHEMA_VERSION,
    listId: requiredString(env, "TOGASHI_LIST_ID"),
    authorId: TOGASHI_USER_ID,
    requestedAt: new Date().toISOString(),
    tweets: [
      {
        id: post.id,
        authorId: TOGASHI_USER_ID,
        screenName: TOGASHI_SCREEN_NAME,
        createdAt: post.created_at,
        url: canonicalTweetUrl(post.id),
        fullText,
        mediaUrls: mediaUrls(body.includes),
      },
    ],
  });

  return payload.tweets[0];
}

async function saveJob(store, key, job) {
  await store.put(key, JSON.stringify(job), {
    expirationTtl: PENDING_TTL_SECONDS,
  });
}

async function parseQueuedJob(store, key, raw, postId) {
  try {
    const job = JSON.parse(raw);
    if (job?.version !== 1 || job?.postId !== postId) {
      throw new Error("Invalid queued X event.");
    }
    assertSnowflakeId(job.postId, "Queued post ID");
    return job;
  } catch {
    await store.delete(key);
    throw new Error("Stored X event is invalid.");
  }
}

async function finalizeProcessedPost(store, postId, job, tweet) {
  await Promise.all([
    store.put(processedKey(postId), new Date().toISOString(), {
      expirationTtl: PROCESSED_TTL_SECONDS,
    }),
    store.put(
      "togashi:latest-post",
      JSON.stringify({
        id: tweet.id,
        text: tweet.fullText,
        mediaUrls: tweet.mediaUrls,
        createdAt: tweet.createdAt,
        receivedAt: job.receivedAt,
        processedAt: new Date().toISOString(),
      }),
    ),
    store.delete(pendingKey(postId)),
  ]);
}

// Ends a post's hold. `announced` means a tracker milestone already told
// subscribers about this post, so the post alert is dropped — but the push
// cursor still moves, or the syndication fallback would send it later anyway.
export async function resolveWithheldPost(
  postId,
  env,
  {
    announced = false,
    fetchImpl = fetch,
    pushRunner = deliverPushForTweets,
    skipRunner = skipPostBroadcast,
    reason = "verdict",
  } = {},
) {
  const store = env.X_EVENT_STATE;
  if (!store) throw new Error("X_EVENT_STATE is not configured.");
  const key = pendingKey(postId);
  const raw = await store.get(key);
  if (!raw) return { complete: true, missing: true };

  const job = await parseQueuedJob(store, key, raw, postId);
  const tweet = await fetchTweetFromX(postId, env, fetchImpl);

  if (announced) {
    await skipRunner(env, postId);
  } else {
    const push = await pushRunner(env, [tweet]);
    if (!push.enabled || !push.complete) {
      throw new Error("Push notification delivery is still pending.");
    }
  }

  job.pushComplete = true;
  await finalizeProcessedPost(store, postId, job, tweet);
  return { complete: true, postId, announced, reason };
}

export async function processPendingPost(
  postId,
  env,
  {
    fetchImpl = fetch,
    automationRunner = runAutomation,
    pushRunner = deliverPushForTweets,
  } = {},
) {
  const store = env.X_EVENT_STATE;
  if (!store) throw new Error("X_EVENT_STATE is not configured.");
  const key = pendingKey(postId);
  const raw = await store.get(key);
  if (!raw) return { complete: true, missing: true };

  const job = await parseQueuedJob(store, key, raw, postId);

  try {
    // A withheld post is not waiting on more work, it is waiting on the
    // Action's verdict. Re-running the pipeline here would dispatch it twice.
    if (job.pushWithheldUntil) {
      const deadline = Date.parse(job.pushWithheldUntil);
      if (Number.isFinite(deadline) && Date.now() < deadline) {
        return { complete: false, withheld: true, postId };
      }

      // No verdict arrived in time. Announce the post itself: a vaguer alert
      // beats silence, and the milestone can still land later on its own.
      return await resolveWithheldPost(postId, env, {
        announced: false,
        fetchImpl,
        pushRunner,
        reason: "deadline",
      });
    }

    const tweet = await fetchTweetFromX(postId, env, fetchImpl);

    if (!job.automationComplete) {
      if (env.AUTOMATION_ENABLED !== "true") {
        throw new Error("Real-time automation is disabled.");
      }
      const automation = await automationRunner(
        env,
        fetchImpl,
        async () => [tweet],
      );
      if (automation.busy) {
        throw new Error("The GitHub automation workflow is currently busy.");
      }
      job.automationComplete = true;
      await saveJob(store, key, job);
    }

    if (!job.pushComplete) {
      if (env.PUSH_NOTIFICATIONS_ENABLED !== "true") {
        throw new Error("Real-time push notifications are disabled.");
      }

      // Hold the post alert until the Action reports whether this post moved a
      // chapter. If it did, the milestone says the same thing in the reader's
      // own language, and sending both would notify twice for one event. The
      // job stays in the pending list the Cron already reads, so waiting costs
      // no extra KV listing.
      job.pushWithheldUntil = new Date(
        Date.now() + WITHHELD_WINDOW_MS,
      ).toISOString();
      await saveJob(store, key, job);
      return { complete: false, withheld: true, postId };
    }

    await finalizeProcessedPost(store, postId, job, tweet);
    return { complete: true, postId };
  } catch (error) {
    job.attempts += 1;
    job.lastAttemptAt = new Date().toISOString();
    job.lastError = safeError(error);
    await saveJob(store, key, job);
    throw error;
  }
}

async function processQueuedPosts(env) {
  if (!env.X_EVENT_STATE) throw new Error("X_EVENT_STATE is not configured.");
  const page = await env.X_EVENT_STATE.list({
    prefix: PENDING_PREFIX,
    limit: 5,
  });
  const errors = [];

  for (const { name } of page.keys) {
    const postId = name.slice(PENDING_PREFIX.length);
    try {
      await processPendingPost(postId, env);
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "Queued Togashi post processing failed.",
          postId,
          error: safeError(error),
        }),
      );
      errors.push(error);
    }
  }

  if (errors.length > 0) {
    throw new AggregateError(errors, "One or more Togashi events failed.");
  }
}

// The Cron fires every five minutes but the syndication repair only needs to
// run every fifteen. This used to be gated on a KV key, which cost a read on
// every tick and a write on every third one — roughly a hundred writes a day
// to keep a clock. The schedule already carries the time, so derive it.
export function shouldRunSyndicationFallback(scheduledTime) {
  const minutes = Math.floor(scheduledTime / 60_000);
  return minutes % (FALLBACK_INTERVAL_MS / 60_000) === 0;
}

async function runSyndicationFallback(env, scheduledTime) {
  if (!env.X_EVENT_STATE) throw new Error("X_EVENT_STATE is not configured.");
  if (!shouldRunSyndicationFallback(scheduledTime)) {
    return { skipped: true };
  }

  await siteWorker.scheduled({ cron: "fallback" }, env);
  return { skipped: false };
}

function validateVerdict(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new TypeError("Verdict payload is invalid.");
  }

  const allowed = new Set([
    "requestedAt",
    "revision",
    "postIds",
    "milestones",
    "dryRun",
  ]);
  if (Object.keys(body).some((key) => !allowed.has(key))) {
    throw new TypeError("Verdict payload has unexpected fields.");
  }
  if (
    typeof body.revision !== "string" ||
    !/^[0-9A-Za-z-]{1,40}$/.test(body.revision)
  ) {
    throw new TypeError("Verdict revision is invalid.");
  }
  if (!Array.isArray(body.postIds) || body.postIds.length > 5) {
    throw new TypeError("Verdict post IDs are invalid.");
  }
  for (const id of body.postIds) {
    assertSnowflakeId(id, "Verdict post ID");
  }
  if (body.dryRun !== undefined && typeof body.dryRun !== "boolean") {
    throw new TypeError("Verdict dryRun is invalid.");
  }

  const milestones = body.milestones;
  if (
    !milestones ||
    typeof milestones !== "object" ||
    Array.isArray(milestones) ||
    !Array.isArray(milestones.chapters) ||
    milestones.chapters.length > 20
  ) {
    throw new TypeError("Verdict milestones are invalid.");
  }
  for (const entry of milestones.chapters) {
    if (
      !entry ||
      typeof entry !== "object" ||
      !Number.isInteger(entry.chapter) ||
      entry.chapter < 1 ||
      entry.chapter > 9_999 ||
      !TRACKER_STATUSES.includes(entry.from) ||
      !TRACKER_STATUSES.includes(entry.to)
    ) {
      throw new TypeError("Verdict milestone entry is invalid.");
    }
  }

  const publication = milestones.publication;
  if (
    publication !== null &&
    (!publication ||
      typeof publication !== "object" ||
      !["publishing", "hiatus"].includes(publication.from) ||
      !["publishing", "hiatus"].includes(publication.to))
  ) {
    throw new TypeError("Verdict publication change is invalid.");
  }

  return body;
}

// The Action reports what the reducer decided, for every run — including
// "nothing moved". That negative answer is what releases a withheld post
// straight away instead of leaving it to time out.
async function handleTrackerVerdict(request, env) {
  const secret = env.TRACKER_VERDICT_SECRET;
  if (typeof secret !== "string" || secret.length === 0) {
    return json(
      { error: "Verdict endpoint is not configured." },
      { status: 503 },
    );
  }

  let bytes;
  try {
    bytes = await readBytesWithLimit(request, MAX_VERDICT_BYTES);
  } catch (error) {
    if (error instanceof RangeError) {
      return json({ error: error.message }, { status: 413 });
    }
    throw error;
  }

  const text = new TextDecoder().decode(bytes);
  if (
    !(await verifyAutomationPayloadSignature(
      text,
      request.headers.get("x-hxhstatus-signature"),
      secret,
      { context: TRACKER_VERDICT_SIGNATURE_CONTEXT },
    ))
  ) {
    return json({ error: "Invalid verdict signature." }, { status: 401 });
  }

  let verdict;
  try {
    verdict = validateVerdict(JSON.parse(text));
    assertFreshAutomationPayload(verdict);
  } catch (error) {
    return json({ error: safeError(error) }, { status: 400 });
  }

  const dryRun =
    verdict.dryRun === true || env.TRACKER_VERDICT_DRY_RUN === "true";
  const milestones = {
    chapters: verdict.milestones.chapters,
    publication: verdict.milestones.publication,
  };
  const carriesMilestones = hasMilestones(milestones);

  return serializePipeline(async () => {
    const announcement = await deliverMilestones(
      env,
      { milestones, revision: verdict.revision },
      { dryRun },
    );

    const failures = [];
    let resolved = 0;

    // A dry run must not resolve anything: releasing a post here would send a
    // real notification, and suppressing one would lose it.
    if (!dryRun) {
      for (const postId of verdict.postIds) {
        try {
          await resolveWithheldPost(postId, env, {
            announced: carriesMilestones,
          });
          resolved += 1;
        } catch (error) {
          // One stuck post must not strand the others; the Cron retries it.
          failures.push({ postId, error: safeError(error) });
        }
      }
    }

    console.log(
      JSON.stringify({
        message: "Tracker verdict handled.",
        revision: verdict.revision,
        dryRun,
        carriesMilestones,
        announced: announcement.announced ?? 0,
        duplicate: announcement.duplicate ?? false,
        posts: verdict.postIds.length,
        resolved,
        failures,
      }),
    );

    return json({
      ok: failures.length === 0,
      dryRun,
      announced: announcement.announced ?? 0,
      duplicate: announcement.duplicate ?? false,
      ...(announcement.preview ? { preview: announcement.preview } : {}),
      resolved,
      failures,
    });
  });
}

async function handleCrc(url, secret) {
  const crcToken = url.searchParams.get("crc_token");
  if (!crcToken) return json({ error: "Missing crc_token." }, { status: 400 });

  try {
    return json({
      response_token: await createCrcResponseToken(secret, crcToken),
    });
  } catch (error) {
    if (error instanceof TypeError) {
      return json({ error: "Invalid crc_token." }, { status: 400 });
    }
    throw error;
  }
}

function configuredWebhookPath(env) {
  const pathSecret = requiredString(env, "X_WEBHOOK_PATH_SECRET");
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(pathSecret)) {
    throw new Error(
      "X_WEBHOOK_PATH_SECRET must be a 32-byte-or-longer base64url value.",
    );
  }
  return `/webhook/${pathSecret}`;
}

async function handleEvent(request, env, context) {
  const signature = request.headers.get("x-twitter-webhooks-signature");
  let body;
  try {
    body = await readBytesWithLimit(request, MAX_EVENT_BYTES);
  } catch (error) {
    if (error instanceof RangeError) {
      return json({ error: error.message }, { status: 413 });
    }
    throw error;
  }

  if (!(await verifyWebhookSignature(env.X_CONSUMER_SECRET, body, signature))) {
    return json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let envelope;
  try {
    envelope = JSON.parse(new TextDecoder().decode(body));
  } catch {
    return json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  let result;
  try {
    result = await enqueueActivityEvent(envelope?.data, env);
  } catch (error) {
    return json({ error: safeError(error) }, { status: 400 });
  }

  if (result.queued) {
    context.waitUntil(
      serializePipeline(() => processPendingPost(result.postId, env)).catch((error) => {
        console.error(
          JSON.stringify({
            message: "Real-time Togashi post processing deferred for retry.",
            postId: result.postId,
            error: safeError(error),
          }),
        );
      }),
    );
  }

  console.log(
    JSON.stringify({
      message: "Valid X Activity event received.",
      eventType: envelope?.data?.event_type ?? null,
      postId: envelope?.data?.payload?.id ?? null,
      queued: result.queued,
      duplicate: result.duplicate,
      ignored: result.ignored ?? null,
    }),
  );
  return json({ ok: true, queued: result.queued });
}

const worker = {
  async fetch(request, env, context) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      let webhookPathConfigured = false;
      try {
        configuredWebhookPath(env);
        webhookPathConfigured = true;
      } catch {
        // Report only the configuration state, never the secret path.
      }
      return json({
        ok: true,
        service: "togashi-events",
        webhookConfigured: Boolean(
          env.X_CONSUMER_SECRET && webhookPathConfigured,
        ),
        eventStorageConfigured: Boolean(env.X_EVENT_STATE),
        verdictConfigured: Boolean(env.TRACKER_VERDICT_SECRET),
        xLookupConfigured: Boolean(env.X_BEARER_TOKEN),
        automationConfigured: Boolean(env.GITHUB_AUTOMATION_TOKEN),
        pushConfigured: Boolean(
          env.PUSH_SUBSCRIPTIONS &&
            env.PUSH_REGISTRY &&
            env.VAPID_PUBLIC_KEY &&
            env.VAPID_PRIVATE_KEY,
        ),
      });
    }

    if (request.method === "POST" && url.pathname === TRACKER_VERDICT_PATH) {
      return handleTrackerVerdict(request, env);
    }

    let webhookPath;
    try {
      webhookPath = configuredWebhookPath(env);
    } catch {
      return json({ error: "Webhook is not configured." }, { status: 503 });
    }
    if (url.pathname !== webhookPath) {
      return json({ error: "Not found." }, { status: 404 });
    }
    if (!env.X_CONSUMER_SECRET) {
      return json({ error: "Webhook secret is not configured." }, { status: 503 });
    }
    if (request.method === "GET") {
      return handleCrc(url, env.X_CONSUMER_SECRET);
    }
    if (request.method === "POST") {
      return handleEvent(request, env, context);
    }
    return json({ error: "Method not allowed." }, { status: 405 });
  },

  async scheduled(controller, env) {
    const scheduledTime = Number.isFinite(controller?.scheduledTime)
      ? controller.scheduledTime
      : Date.now();

    return serializePipeline(async () => {
      const errors = [];
      // Name every failure in the logs; the AggregateError alone never says
      // which task broke.
      const runTask = async (task, run) => {
        try {
          await run();
        } catch (error) {
          console.error(
            JSON.stringify({
              message: "Scheduled Togashi task failed.",
              task,
              error: safeError(error),
            }),
          );
          errors.push(error);
        }
      };

      await runTask("maintainPushSubscriptions", () =>
        maintainPushSubscriptions(env),
      );

      // Always drain real-time events first. If the same post is also visible
      // through syndication, the repository and push cursors make the fallback
      // an immediate no-op.
      await runTask("processQueuedPosts", () => processQueuedPosts(env));

      await runTask("runSyndicationFallback", () =>
        runSyndicationFallback(env, scheduledTime),
      );

      if (errors.length > 0) {
        throw new AggregateError(errors, "One or more scheduled tasks failed.");
      }
    });
  },
};

export default worker;
