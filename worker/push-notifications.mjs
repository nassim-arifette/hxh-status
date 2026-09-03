import webpush from "web-push";

import {
  TOGASHI_USER_ID,
  assertSnowflakeId,
  compareSnowflakeIds,
} from "../automation/contracts.mjs";
import { fetchTimelineTweets, selectUnseenTweets } from "./x-timeline.mjs";

const API_PREFIX = "/api/push/";
const PUBLIC_KEY_PATH = API_PREFIX + "public-key";
const SUBSCRIPTIONS_PATH = API_PREFIX + "subscriptions";
const TEST_PATH = API_PREFIX + "test";
const SUBSCRIPTION_PREFIX = "push:subscription:";
const CURSOR_KEY = "push:last-notified-tweet";
const PENDING_KEY = "push:pending-broadcast";
const MAX_BODY_BYTES = 8_192;
const MAX_SUBSCRIPTIONS_PER_RUN = 32;
const VALID_LOCALES = new Set(["en", "fr", "ja"]);
const PUSH_ENDPOINT_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /(?:^|\.)push\.apple\.com$/,
  /(?:^|\.)notify\.windows\.com$/,
];

function json(data, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function apiError(status, message) {
  return json({ error: message }, { status });
}

function requiredString(env, name) {
  const value = env[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

function requirePushStore(env) {
  if (!env.PUSH_SUBSCRIPTIONS) {
    throw new Error("PUSH_SUBSCRIPTIONS is not configured.");
  }
  return env.PUSH_SUBSCRIPTIONS;
}

function assertPushApiConfigured(env) {
  requiredString(env, "VAPID_PUBLIC_KEY");
  requirePushStore(env);
}

function assertPushDeliveryConfigured(env) {
  assertPushApiConfigured(env);
  requiredString(env, "VAPID_PRIVATE_KEY");
  requiredString(env, "VAPID_SUBJECT");
}

function isSameOriginRequest(request) {
  const origin = request.headers.get("Origin");
  const fetchSite = request.headers.get("Sec-Fetch-Site");

  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return false;
  }

  return !origin || origin === new URL(request.url).origin;
}

function assertExactKeys(value, allowed, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`Invalid ${label}.`);
  }

  const allowedKeys = new Set(allowed);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) {
    throw new TypeError(`Invalid ${label}.`);
  }
}

async function enforceMutationRateLimit(request, env, pathname) {
  if (!env.PUSH_RATE_LIMITER) return true;

  const clientKey = request.headers.get("CF-Connecting-IP") ?? "local";
  const { success } = await env.PUSH_RATE_LIMITER.limit({
    key: `${pathname}:${clientKey}`,
  });
  return success;
}
async function readBodyText(request) {
  const declaredLength = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw new RangeError("Request body is too large.");
  }

  if (!request.body) return "";

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new RangeError("Request body is too large.");
      }
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }

  return text + decoder.decode();
}

async function readJson(request) {
  if (!request.headers.get("Content-Type")?.startsWith("application/json")) {
    throw new TypeError("Content-Type must be application/json.");
  }

  const text = await readBodyText(request);
  return JSON.parse(text);
}

function decodeBase64Url(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new TypeError("Invalid subscription key.");
  }

  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/") + padding);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function validateEndpoint(endpoint) {
  if (typeof endpoint !== "string" || endpoint.length > 2_048) {
    throw new TypeError("Invalid push endpoint.");
  }

  const url = new URL(endpoint);
  const allowedHost = PUSH_ENDPOINT_HOSTS.some((pattern) =>
    pattern.test(url.hostname),
  );

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.hash ||
    (url.port && url.port !== "443") ||
    !allowedHost
  ) {
    throw new TypeError("Unsupported push endpoint.");
  }

  return url.href;
}

async function validateSubscription(input) {
  assertExactKeys(
    input,
    ["endpoint", "expirationTime", "keys"],
    "push subscription",
  );
  assertExactKeys(input.keys, ["p256dh", "auth"], "subscription keys");

  const endpoint = validateEndpoint(input.endpoint);
  const p256dh = input.keys?.p256dh;
  const auth = input.keys?.auth;
  const publicKey = decodeBase64Url(p256dh);
  const authSecret = decodeBase64Url(auth);

  if (publicKey.length !== 65 || publicKey[0] !== 4) {
    throw new TypeError("Invalid subscription public key.");
  }
  try {
    await crypto.subtle.importKey(
      "raw",
      publicKey,
      { name: "ECDH", namedCurve: "P-256" },
      false,
      [],
    );
  } catch {
    throw new TypeError("Invalid subscription public key.");
  }
  if (authSecret.length !== 16) {
    throw new TypeError("Invalid subscription auth secret.");
  }

  const expirationTime = input.expirationTime ?? null;
  if (
    expirationTime !== null &&
    (!Number.isSafeInteger(expirationTime) || expirationTime <= Date.now())
  ) {
    throw new TypeError("Invalid subscription expiration.");
  }

  return {
    endpoint,
    expirationTime,
    keys: { p256dh, auth },
  };
}

function normalizeLocale(value) {
  return VALID_LOCALES.has(value) ? value : "en";
}

function validateLocale(value) {
  if (!VALID_LOCALES.has(value)) {
    throw new TypeError("Unsupported notification locale.");
  }
  return value;
}

async function subscriptionKey(endpoint) {
  const bytes = new TextEncoder().encode(endpoint);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return (
    SUBSCRIPTION_PREFIX +
    [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("")
  );
}

async function storeSubscription(env, input, locale) {
  const store = requirePushStore(env);
  const subscription = await validateSubscription(input);
  const key = await subscriptionKey(subscription.endpoint);

  await store.put(
    key,
    JSON.stringify({
      subscription,
      locale: validateLocale(locale),
      updatedAt: new Date().toISOString(),
    }),
  );

  return subscription;
}

async function deleteSubscription(env, endpoint) {
  const store = requirePushStore(env);
  const validatedEndpoint = validateEndpoint(endpoint);
  await store.delete(await subscriptionKey(validatedEndpoint));
}

function compactText(value) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  const characters = Array.from(normalized);
  return characters.length > 180
    ? characters.slice(0, 177).join("") + "…"
    : normalized;
}

function notificationPayload(tweet, count, locale) {
  return {
    v: 1,
    kind: "togashi-post",
    locale: normalizeLocale(locale),
    tweetId: tweet.id,
    count,
    text: compactText(tweet.fullText),
  };
}

async function defaultSendPush(env, subscription, payload) {
  assertPushDeliveryConfigured(env);
  const topic =
    payload.kind === "togashi-post" ? payload.tweetId : "hxhstatus-test";

  return webpush.sendNotification(subscription, JSON.stringify(payload), {
    TTL: 86_400,
    urgency: "normal",
    topic,
    timeout: 10_000,
    contentEncoding: "aes128gcm",
    vapidDetails: {
      subject: env.VAPID_SUBJECT,
      publicKey: env.VAPID_PUBLIC_KEY,
      privateKey: env.VAPID_PRIVATE_KEY,
    },
  });
}

async function loadStoredSubscription(store, key) {
  const raw = await store.get(key);
  if (!raw) return null;

  try {
    const record = JSON.parse(raw);
    return {
      subscription: await validateSubscription(record.subscription),
      locale: normalizeLocale(record.locale),
    };
  } catch {
    await store.delete(key);
    return null;
  }
}

function pushStatus(error) {
  const status = Number(error?.statusCode);
  return Number.isInteger(status) ? status : 0;
}

function isTransientPushFailure(status) {
  return (
    status === 0 ||
    status === 408 ||
    status === 409 ||
    status === 425 ||
    status === 429 ||
    status >= 500
  );
}

async function deliverPage(env, job, sendPush) {
  const store = requirePushStore(env);
  const retrying = Array.isArray(job.retryKeys);
  const page = retrying
    ? {
        keys: job.retryKeys.map((name) => ({ name })),
        list_complete: job.retryListComplete,
        cursor: job.retryNextCursor,
      }
    : await store.list({
        prefix: SUBSCRIPTION_PREFIX,
        limit: MAX_SUBSCRIPTIONS_PER_RUN,
        ...(job.cursor ? { cursor: job.cursor } : {}),
      });
  const transientKeys = [];
  const retryAttempt = retrying ? job.retryAttempt + 1 : 1;

  for (let start = 0; start < page.keys.length; start += 4) {
    const keys = page.keys.slice(start, start + 4);
    await Promise.all(
      keys.map(async ({ name }) => {
        const record = await loadStoredSubscription(store, name);
        if (!record) return;

        try {
          await sendPush(
            env,
            record.subscription,
            notificationPayload(job.tweet, job.count, record.locale),
          );
        } catch (error) {
          const status = pushStatus(error);
          if (status === 404 || status === 410) {
            await store.delete(name);
            return;
          }
          if (isTransientPushFailure(status) && retryAttempt < 6) {
            transientKeys.push(name);
            return;
          }

          // Permanent failures and exhausted retries must not block later posts.
          await store.delete(name);
        }
      }),
    );
  }

  if (transientKeys.length > 0) {
    await store.put(
      PENDING_KEY,
      JSON.stringify({
        ...job,
        retryKeys: transientKeys,
        retryAttempt,
        retryListComplete: page.list_complete,
        retryNextCursor: page.cursor || null,
      }),
    );
    throw new Error(
      `Push delivery failed temporarily for ${transientKeys.length} subscription(s).`,
    );
  }

  if (page.list_complete) {
    await Promise.all([
      store.put(CURSOR_KEY, job.tweet.id),
      store.delete(PENDING_KEY),
    ]);
    return { complete: true, delivered: page.keys.length };
  }

  await store.put(
    PENDING_KEY,
    JSON.stringify({
      ...job,
      cursor: page.cursor,
      retryKeys: undefined,
      retryAttempt: undefined,
      retryListComplete: undefined,
      retryNextCursor: undefined,
    }),
  );
  return { complete: false, delivered: page.keys.length };
}

async function loadPendingJob(store) {
  const raw = await store.get(PENDING_KEY);
  if (!raw) return null;

  try {
    const job = JSON.parse(raw);
    assertSnowflakeId(job?.tweet?.id, "pending tweet ID");
    if (
      job?.tweet?.url !==
      `https://x.com/Un4v5s8bgsVk9Xp/status/${job.tweet.id}`
    ) {
      throw new Error("Invalid URL.");
    }
    if (!Number.isInteger(job.count) || job.count < 1 || job.count > 5) {
      throw new Error("Invalid post count.");
    }
    if (job.retryKeys !== undefined) {
      if (
        !Array.isArray(job.retryKeys) ||
        job.retryKeys.length < 1 ||
        job.retryKeys.length > MAX_SUBSCRIPTIONS_PER_RUN ||
        job.retryKeys.some(
          (key) =>
            typeof key !== "string" ||
            !/^push:subscription:[a-f0-9]{64}$/.test(key),
        ) ||
        new Set(job.retryKeys).size !== job.retryKeys.length ||
        !Number.isInteger(job.retryAttempt) ||
        job.retryAttempt < 1 ||
        job.retryAttempt > 5 ||
        typeof job.retryListComplete !== "boolean" ||
        !(
          job.retryNextCursor === null ||
          typeof job.retryNextCursor === "string"
        )
      ) {
        throw new Error("Invalid retry state.");
      }
    }
    return job;
  } catch {
    await store.delete(PENDING_KEY);
    throw new Error("Stored push broadcast state is invalid.");
  }
}

export async function runPushNotifications(
  env,
  fetchImpl = fetch,
  timelineLoader,
  sendPush = defaultSendPush,
) {
  if (env.PUSH_NOTIFICATIONS_ENABLED !== "true") {
    return { enabled: false, complete: true, delivered: 0 };
  }

  assertPushDeliveryConfigured(env);
  const store = requirePushStore(env);
  let job = await loadPendingJob(store);

  if (!job) {
    const listId = requiredString(env, "TOGASHI_LIST_ID");
    const expectedUserId = requiredString(env, "TOGASHI_USER_ID");
    if (expectedUserId !== TOGASHI_USER_ID) {
      throw new Error("TOGASHI_USER_ID does not match the validated account.");
    }

    const storedCursor = await store.get(CURSOR_KEY);
    const initialCursor =
      storedCursor ?? requiredString(env, "PUSH_INITIAL_TWEET_ID");
    assertSnowflakeId(initialCursor, "push notification cursor");

    const loadTimeline =
      timelineLoader ??
      (() =>
        fetchTimelineTweets(
          { listId, expectedUserId },
          fetchImpl,
        ));
    const tweets = await loadTimeline();
    const unseen = selectUnseenTweets(tweets, initialCursor, 5);

    if (unseen.length === 0) {
      return { enabled: true, complete: true, delivered: 0 };
    }

    job = {
      tweet: unseen.at(-1),
      count: unseen.length,
      cursor: null,
      createdAt: new Date().toISOString(),
    };
    await store.put(PENDING_KEY, JSON.stringify(job));
  }

  return { enabled: true, ...(await deliverPage(env, job, sendPush)) };
}

export async function deliverPushForTweets(
  env,
  tweets,
  sendPush = defaultSendPush,
) {
  if (!Array.isArray(tweets) || tweets.length < 1 || tweets.length > 5) {
    throw new TypeError("Push delivery requires between one and five posts.");
  }

  const ordered = [...tweets].sort((left, right) =>
    compareSnowflakeIds(left.id, right.id),
  );
  const newest = ordered.at(-1);
  const store = requirePushStore(env);
  let delivered = 0;

  for (let cycle = 0; cycle < 3; cycle += 1) {
    const cursor = await store.get(CURSOR_KEY);
    if (cursor && compareSnowflakeIds(cursor, newest.id) >= 0) {
      return { enabled: true, complete: true, delivered };
    }

    const result = await runPushNotifications(
      env,
      fetch,
      async () => ordered,
      sendPush,
    );
    delivered += result.delivered;

    if (!result.enabled || !result.complete) {
      return { ...result, delivered };
    }
  }

  const cursor = await store.get(CURSOR_KEY);
  return {
    enabled: true,
    complete: Boolean(cursor && compareSnowflakeIds(cursor, newest.id) >= 0),
    delivered,
  };
}

async function handleTestNotification(request, env, sendPush) {
  if (env.PUSH_TEST_ENABLED !== "true") {
    return apiError(404, "Not found.");
  }

  const body = await readJson(request);
  assertExactKeys(body, ["endpoint"], "test request");
  const endpoint = validateEndpoint(body.endpoint);
  const store = requirePushStore(env);
  const key = await subscriptionKey(endpoint);
  const record = await loadStoredSubscription(store, key);

  if (!record) return apiError(404, "Subscription not found.");

  try {
    await sendPush(env, record.subscription, {
      v: 1,
      kind: "test",
      locale: record.locale,
    });
  } catch (error) {
    const status = pushStatus(error);
    if (status === 404 || status === 410) {
      await store.delete(key);
      return apiError(410, "Subscription expired.");
    }
    return apiError(502, "Test notification could not be sent.");
  }

  return json({ ok: true });
}

export async function handlePushApi(
  request,
  env,
  { sendPush = defaultSendPush } = {},
) {
  const { pathname } = new URL(request.url);
  if (!pathname.startsWith(API_PREFIX)) return null;

  if (pathname === PUBLIC_KEY_PATH && request.method === "GET") {
    if (env.PUSH_NOTIFICATIONS_ENABLED !== "true") {
      return apiError(503, "Push notifications are not enabled.");
    }

    try {
      assertPushApiConfigured(env);
      return json({
        publicKey: env.VAPID_PUBLIC_KEY,
        testAvailable: env.PUSH_TEST_ENABLED === "true",
      });
    } catch {
      return apiError(503, "Push notifications are not configured.");
    }
  }

  if (!isSameOriginRequest(request)) {
    return apiError(403, "Cross-origin requests are not allowed.");
  }

  if (env.PUSH_NOTIFICATIONS_ENABLED !== "true") {
    return apiError(503, "Push notifications are not enabled.");
  }

  try {
    assertPushApiConfigured(env);

    if (
      request.method !== "GET" &&
      !(await enforceMutationRateLimit(request, env, pathname))
    ) {
      return json(
        { error: "Too many requests." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    if (pathname === SUBSCRIPTIONS_PATH && request.method === "POST") {
      const body = await readJson(request);
      assertExactKeys(body, ["locale", "subscription"], "subscription request");
      await storeSubscription(env, body.subscription, body.locale);
      return json({ ok: true }, { status: 201 });
    }

    if (pathname === SUBSCRIPTIONS_PATH && request.method === "DELETE") {
      const body = await readJson(request);
      assertExactKeys(body, ["endpoint"], "unsubscribe request");
      await deleteSubscription(env, body.endpoint);
      return json({ ok: true });
    }

    if (pathname === TEST_PATH && request.method === "POST") {
      assertPushDeliveryConfigured(env);
      return handleTestNotification(request, env, sendPush);
    }
  } catch (error) {
    if (error instanceof RangeError) {
      return apiError(413, "Request body is too large.");
    }
    if (error instanceof SyntaxError || error instanceof TypeError) {
      return apiError(400, "Invalid push subscription request.");
    }
    return apiError(503, "Push notifications are unavailable.");
  }

  return apiError(405, "Method not allowed.");
}
