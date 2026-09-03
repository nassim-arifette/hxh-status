import test from "node:test";
import assert from "node:assert/strict";

import {
  deliverPushForTweets,
  handlePushApi,
  runPushNotifications,
} from "./push-notifications.mjs";
import worker from "./index.mjs";


class MemoryKv {
  constructor(entries = []) {
    this.data = new Map(entries);
  }

  async get(key) {
    return this.data.get(key) ?? null;
  }

  async put(key, value) {
    this.data.set(key, String(value));
  }

  async delete(key) {
    this.data.delete(key);
  }

  async list({ prefix = "", limit = 1_000, cursor } = {}) {
    const keys = [...this.data.keys()]
      .filter((key) => key.startsWith(prefix))
      .sort();
    const start = cursor ? Number(cursor) : 0;
    const end = Math.min(start + limit, keys.length);

    return {
      keys: keys.slice(start, end).map((name) => ({ name })),
      list_complete: end >= keys.length,
      cursor: end < keys.length ? String(end) : "",
    };
  }
}

const baseEnv = {
  PUSH_NOTIFICATIONS_ENABLED: "true",
  PUSH_INITIAL_TWEET_ID: "2094673907626414299",
  TOGASHI_LIST_ID: "2095219478636495163",
  TOGASHI_USER_ID: "1528978792617611264",
  VAPID_PUBLIC_KEY: "test-public-key",
  VAPID_PRIVATE_KEY: "test-private-key",
  VAPID_SUBJECT: "mailto:contact@hxhstatus.com",
};

function encodeBase64Url(bytes) {
  return Buffer.from(bytes).toString("base64url");
}

async function validSubscription(suffix = "one") {
  const keys = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );
  const publicKey = new Uint8Array(
    await crypto.subtle.exportKey("raw", keys.publicKey),
  );

  return {
    endpoint: `https://fcm.googleapis.com/fcm/send/${suffix}`,
    expirationTime: null,
    keys: {
      p256dh: encodeBase64Url(publicKey),
      auth: encodeBase64Url(crypto.getRandomValues(new Uint8Array(16))),
    },
  };
}

function jsonRequest(path, method, body, origin = "https://hxhstatus.com") {
  return new Request(`https://hxhstatus.com${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "Sec-Fetch-Site": "same-origin",
    },
    body: JSON.stringify(body),
  });
}

function tweet(id = "2096000000000000001") {
  return {
    id,
    authorId: baseEnv.TOGASHI_USER_ID,
    screenName: "Un4v5s8bgsVk9Xp",
    createdAt: "2026-09-02T12:00:00.000Z",
    url: `https://x.com/Un4v5s8bgsVk9Xp/status/${id}`,
    fullText: "No.434, character inking complete.",
    mediaUrls: [],
  };
}

async function subscribe(env, subscription, locale = "en") {
  const response = await handlePushApi(
    jsonRequest("/api/push/subscriptions", "POST", {
      locale,
      subscription,
    }),
    env,
  );
  assert.equal(response.status, 201);
}

test("push API exposes only the public key and ignores non-API paths", async () => {
  const env = { ...baseEnv, PUSH_SUBSCRIPTIONS: new MemoryKv() };
  const response = await handlePushApi(
    new Request("https://hxhstatus.com/api/push/public-key"),
    env,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    publicKey: "test-public-key",
    testAvailable: false,
  });
  assert.equal(
    await handlePushApi(new Request("https://hxhstatus.com/robots.txt"), env),
    null,
  );
});

test("Worker routes push APIs before falling back to static assets", async () => {
  let assetCalls = 0;
  const env = {
    ...baseEnv,
    PUSH_SUBSCRIPTIONS: new MemoryKv(),
    ASSETS: {
      async fetch() {
        assetCalls += 1;
        return new Response("asset");
      },
    },
  };

  const apiResponse = await worker.fetch(
    new Request("https://hxhstatus.com/api/push/public-key"),
    env,
  );
  assert.equal(apiResponse.status, 200);
  assert.equal(assetCalls, 0);

  const assetResponse = await worker.fetch(
    new Request("https://hxhstatus.com/robots.txt"),
    env,
  );
  assert.equal(await assetResponse.text(), "asset");
  assert.equal(assetCalls, 1);
});
test("subscription upsert records locale and DELETE removes it", async () => {
  const store = new MemoryKv();
  const env = { ...baseEnv, PUSH_SUBSCRIPTIONS: store };
  const subscription = await validSubscription();

  await subscribe(env, subscription, "fr");
  const storedKeys = [...store.data.keys()].filter((key) =>
    key.startsWith("push:subscription:"),
  );
  assert.equal(storedKeys.length, 1);
  assert.equal(JSON.parse(store.data.get(storedKeys[0])).locale, "fr");

  const response = await handlePushApi(
    jsonRequest("/api/push/subscriptions", "DELETE", {
      endpoint: subscription.endpoint,
    }),
    env,
  );
  assert.equal(response.status, 200);
  assert.equal(store.data.has(storedKeys[0]), false);
});

test("subscription API rejects cross-origin, oversized, and SSRF endpoints", async () => {
  const env = { ...baseEnv, PUSH_SUBSCRIPTIONS: new MemoryKv() };
  const subscription = await validSubscription();
  const crossOrigin = await handlePushApi(
    jsonRequest(
      "/api/push/subscriptions",
      "POST",
      { locale: "en", subscription },
      "https://attacker.example",
    ),
    env,
  );
  assert.equal(crossOrigin.status, 403);

  const malicious = await handlePushApi(
    jsonRequest("/api/push/subscriptions", "POST", {
      locale: "en",
      subscription: {
        ...subscription,
        endpoint: "https://example.com/internal-target",
      },
    }),
    env,
  );
  assert.equal(malicious.status, 400);

  const oversized = await handlePushApi(
    new Request("https://hxhstatus.com/api/push/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ padding: "x".repeat(9_000) }),
    }),
    env,
  );
  assert.equal(oversized.status, 413);
});

test("local test endpoint sends a fixed schema to the stored browser", async () => {
  const store = new MemoryKv();
  const env = {
    ...baseEnv,
    PUSH_TEST_ENABLED: "true",
    PUSH_SUBSCRIPTIONS: store,
  };
  const subscription = await validSubscription();
  await subscribe(env, subscription, "fr");
  const sent = [];

  const response = await handlePushApi(
    jsonRequest("/api/push/test", "POST", {
      endpoint: subscription.endpoint,
    }),
    env,
    {
      sendPush: async (_env, target, payload) => {
        sent.push({ target, payload });
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].target.endpoint, subscription.endpoint);
  assert.deepEqual(sent[0].payload, {
    v: 1,
    kind: "test",
    locale: "fr",
  });
});

test("push notifications stay independent from disabled GitHub automation", async () => {
  let loaded = 0;
  const result = await runPushNotifications(
    {
      ...baseEnv,
      PUSH_NOTIFICATIONS_ENABLED: "false",
      PUSH_SUBSCRIPTIONS: new MemoryKv(),
    },
    async () => {
      throw new Error("network should not run");
    },
    async () => {
      loaded += 1;
      throw new Error("timeline should not run");
    },
  );

  assert.deepEqual(result, {
    enabled: false,
    complete: true,
    delivered: 0,
  });
  assert.equal(loaded, 0);
});

test("one new Togashi post is sent once and advances the push cursor", async () => {
  const store = new MemoryKv();
  const env = { ...baseEnv, PUSH_SUBSCRIPTIONS: store };
  await subscribe(env, await validSubscription(), "fr");
  const sent = [];
  const latest = tweet();

  const result = await runPushNotifications(
    env,
    fetch,
    async () => [latest],
    async (_env, subscription, payload) => {
      sent.push({ subscription, payload });
    },
  );

  assert.deepEqual(result, { enabled: true, complete: true, delivered: 1 });
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].payload, {
    v: 1,
    kind: "togashi-post",
    locale: "fr",
    tweetId: latest.id,
    count: 1,
    text: latest.fullText,
  });
  assert.equal(store.data.get("push:last-notified-tweet"), latest.id);
  assert.equal(store.data.has("push:pending-broadcast"), false);

  const second = await runPushNotifications(
    env,
    fetch,
    async () => [latest],
    async () => {
      throw new Error("the same post must not be sent twice");
    },
  );
  assert.deepEqual(second, { enabled: true, complete: true, delivered: 0 });
});

test("real-time delivery is idempotent once the post cursor has advanced", async () => {
  const store = new MemoryKv();
  const env = { ...baseEnv, PUSH_SUBSCRIPTIONS: store };
  await subscribe(env, await validSubscription(), "en");
  const latest = tweet();
  let sends = 0;

  const first = await deliverPushForTweets(env, [latest], async () => {
    sends += 1;
  });
  const replay = await deliverPushForTweets(env, [latest], async () => {
    throw new Error("a processed real-time post must not be sent twice");
  });

  assert.equal(first.complete, true);
  assert.equal(replay.complete, true);
  assert.equal(replay.delivered, 0);
  assert.equal(sends, 1);
});

test("webhook and fallback share one push cursor in either arrival order", async (t) => {
  for (const firstSource of ["webhook", "fallback"]) {
    await t.test(`${firstSource} arrives first`, async () => {
      const store = new MemoryKv();
      const env = { ...baseEnv, PUSH_SUBSCRIPTIONS: store };
      await subscribe(env, await validSubscription(firstSource), "en");
      const latest = tweet();
      let sends = 0;
      const send = async () => {
        sends += 1;
      };

      const webhook = () => deliverPushForTweets(env, [latest], send);
      const fallback = () =>
        runPushNotifications(env, fetch, async () => [latest], send);
      const first = firstSource === "webhook" ? webhook : fallback;
      const second = firstSource === "webhook" ? fallback : webhook;

      assert.equal((await first()).complete, true);
      const replay = await second();

      assert.equal(replay.complete, true);
      assert.equal(replay.delivered, 0);
      assert.equal(sends, 1);
      assert.equal(store.data.get("push:last-notified-tweet"), latest.id);
    });
  }
});

test("expired subscriptions are removed without blocking the cursor", async () => {
  const store = new MemoryKv();
  const env = { ...baseEnv, PUSH_SUBSCRIPTIONS: store };
  await subscribe(env, await validSubscription(), "en");
  const key = [...store.data.keys()].find((item) =>
    item.startsWith("push:subscription:"),
  );
  const latest = tweet();

  const result = await runPushNotifications(
    env,
    fetch,
    async () => [latest],
    async () => {
      throw { statusCode: 410 };
    },
  );

  assert.equal(result.complete, true);
  assert.equal(store.data.has(key), false);
  assert.equal(store.data.get("push:last-notified-tweet"), latest.id);
});

test("temporary delivery failure keeps a retryable pending job", async () => {
  const store = new MemoryKv();
  const env = { ...baseEnv, PUSH_SUBSCRIPTIONS: store };
  await subscribe(env, await validSubscription(), "en");
  const latest = tweet();

  await assert.rejects(
    runPushNotifications(
      env,
      fetch,
      async () => [latest],
      async () => {
        throw { statusCode: 503 };
      },
    ),
    /failed temporarily/,
  );
  assert.equal(store.data.has("push:pending-broadcast"), true);
  assert.equal(store.data.has("push:last-notified-tweet"), false);

  let timelineReloaded = false;
  const retry = await runPushNotifications(
    env,
    fetch,
    async () => {
      timelineReloaded = true;
      return [latest];
    },
    async () => {},
  );
  assert.equal(retry.complete, true);
  assert.equal(timelineReloaded, false);
  assert.equal(store.data.get("push:last-notified-tweet"), latest.id);
});

test("retry sends only to subscriptions that failed transiently", async () => {
  const store = new MemoryKv();
  const env = { ...baseEnv, PUSH_SUBSCRIPTIONS: store };
  const first = await validSubscription("first");
  const second = await validSubscription("second");
  await subscribe(env, first, "en");
  await subscribe(env, second, "en");
  const latest = tweet();
  const attempts = new Map();

  const send = async (_env, subscription) => {
    const count = (attempts.get(subscription.endpoint) ?? 0) + 1;
    attempts.set(subscription.endpoint, count);
    if (subscription.endpoint === second.endpoint && count === 1) {
      throw { statusCode: 503 };
    }
  };

  await assert.rejects(
    runPushNotifications(env, fetch, async () => [latest], send),
    /failed temporarily/,
  );

  const retry = await runPushNotifications(
    env,
    fetch,
    async () => {
      throw new Error("pending broadcasts must not reload the timeline");
    },
    send,
  );
  assert.equal(retry.complete, true);
  assert.equal(attempts.get(first.endpoint), 1);
  assert.equal(attempts.get(second.endpoint), 2);
  assert.equal(store.data.get("push:last-notified-tweet"), latest.id);
});

test("permanent recipient failure is removed without blocking the cursor", async () => {
  const store = new MemoryKv();
  const env = { ...baseEnv, PUSH_SUBSCRIPTIONS: store };
  await subscribe(env, await validSubscription("forbidden"), "en");
  const latest = tweet();

  const result = await runPushNotifications(
    env,
    fetch,
    async () => [latest],
    async () => {
      throw { statusCode: 403 };
    },
  );

  assert.equal(result.complete, true);
  assert.equal(
    [...store.data.keys()].some((key) =>
      key.startsWith("push:subscription:"),
    ),
    false,
  );
  assert.equal(store.data.get("push:last-notified-tweet"), latest.id);
});

test("transient recipient failure is dropped after six attempts", async () => {
  const store = new MemoryKv();
  const env = { ...baseEnv, PUSH_SUBSCRIPTIONS: store };
  await subscribe(env, await validSubscription("unavailable"), "en");
  const latest = tweet();
  let attempts = 0;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await assert.rejects(
      runPushNotifications(
        env,
        fetch,
        attempt === 1
          ? async () => [latest]
          : async () => {
              throw new Error("pending broadcasts must not reload the timeline");
            },
        async () => {
          attempts += 1;
          throw { statusCode: 503 };
        },
      ),
      /failed temporarily/,
    );
  }

  const finalAttempt = await runPushNotifications(
    env,
    fetch,
    async () => {
      throw new Error("pending broadcasts must not reload the timeline");
    },
    async () => {
      attempts += 1;
      throw { statusCode: 503 };
    },
  );

  assert.equal(finalAttempt.complete, true);
  assert.equal(attempts, 6);
  assert.equal(store.data.get("push:last-notified-tweet"), latest.id);
  assert.equal(
    [...store.data.keys()].some((key) =>
      key.startsWith("push:subscription:"),
    ),
    false,
  );
});
test("broadcasts paginate without exceeding 32 subscriptions per run", async () => {
  const store = new MemoryKv();
  const env = { ...baseEnv, PUSH_SUBSCRIPTIONS: store };
  const subscription = await validSubscription();
  const record = JSON.stringify({ subscription, locale: "en" });

  for (let index = 0; index < 33; index += 1) {
    store.data.set(
      `push:subscription:${String(index).padStart(2, "0")}`,
      record,
    );
  }

  let sends = 0;
  const latest = tweet();
  const first = await runPushNotifications(
    env,
    fetch,
    async () => [latest],
    async () => {
      sends += 1;
    },
  );
  assert.deepEqual(first, { enabled: true, complete: false, delivered: 32 });
  assert.equal(sends, 32);

  const second = await runPushNotifications(
    env,
    fetch,
    async () => {
      throw new Error("pending broadcasts must not reload the timeline");
    },
    async () => {
      sends += 1;
    },
  );
  assert.deepEqual(second, { enabled: true, complete: true, delivered: 1 });
  assert.equal(sends, 33);
});
