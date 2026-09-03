import test from "node:test";
import assert from "node:assert/strict";

import {
  deliverPushForTweets,
  handlePushApi,
  maintainPushSubscriptions,
  runPushNotifications,
  verifyPendingPushSubscriptions,
} from "./push-notifications.mjs";
import worker from "./index.mjs";


class MemoryKv {
  constructor(entries = []) {
    this.data = new Map(entries);
    this.putOptions = new Map();
  }

  async get(key) {
    return this.data.get(key) ?? null;
  }

  async put(key, value, options) {
    this.data.set(key, String(value));
    this.putOptions.set(key, options ?? null);
  }

  async delete(key) {
    this.data.delete(key);
    this.putOptions.delete(key);
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

class MemoryRegistry {
  constructor({ activeLimit = 5_000, pendingLimit = 256, store = null } = {}) {
    this.activeLimit = activeLimit;
    this.pendingLimit = pendingLimit;
    this.store = store;
    this.entries = new Map();
    this.queue = Promise.resolve();
  }

  getByName(name) {
    assert.equal(name, "global");
    return this;
  }

  fetch(input, options) {
    const operation = this.queue.then(() => this.handle(input, options));
    this.queue = operation.catch(() => undefined);
    return operation;
  }

  async handle(input, options) {
    const path = new URL(input).pathname;
    const { id, record, revision } = JSON.parse(options.body);
    const existing = this.entries.get(id);
    const activeKey = `push:verified:${id}`;
    const pendingKey = `push:pending-subscription:${id}`;
    const legacyKey = `push:subscription:${id}`;

    if (path === "/upsert" || path === "/migrate") {
      if (path === "/migrate" && !(await this.store.get(legacyKey))) {
        return Response.json({ error: "missing" }, { status: 404 });
      }
      if (existing) {
        const previous =
          existing === "active"
            ? JSON.parse(await this.store.get(activeKey))
            : null;
        const stored = {
          ...record,
          state: existing,
          ...(existing === "active"
            ? { verifiedAt: previous?.verifiedAt ?? new Date().toISOString() }
            : {}),
        };
        await this.store.put(
          existing === "active" ? activeKey : pendingKey,
          JSON.stringify(stored),
          { expirationTtl: existing === "active" ? 15_552_000 : 600 },
        );
        await this.store.delete(existing === "active" ? pendingKey : activeKey);
        await this.store.delete(legacyKey);
        return Response.json({ state: existing, created: false });
      }

      const pending = [...this.entries.values()].filter(
        (state) => state === "pending",
      ).length;
      if (
        this.entries.size >= this.activeLimit ||
        pending >= this.pendingLimit
      ) {
        return Response.json({ error: "capacity" }, { status: 429 });
      }
      this.entries.set(id, "pending");
      await this.store.put(pendingKey, JSON.stringify(record), {
        expirationTtl: 600,
      });
      await this.store.delete(activeKey);
      await this.store.delete(legacyKey);
      return Response.json({ state: "pending", created: true }, { status: 201 });
    }

    if (path === "/inspect") {
      return existing
        ? Response.json({ state: existing })
        : Response.json({ error: "missing" }, { status: 404 });
    }

    if (path === "/promote") {
      if (existing !== "pending") {
        return Response.json({ error: "missing" }, { status: 404 });
      }
      const pending = JSON.parse(await this.store.get(pendingKey));
      if (pending.revision !== revision) {
        return Response.json({ error: "changed" }, { status: 409 });
      }
      this.entries.set(id, "active");
      await this.store.put(
        activeKey,
        JSON.stringify({
          ...pending,
          state: "active",
          verifiedAt: pending.verifiedAt ?? new Date().toISOString(),
        }),
        { expirationTtl: 15_552_000 },
      );
      await this.store.delete(pendingKey);
      return Response.json({ state: "active", created: false });
    }

    if (path === "/renew") {
      if (existing !== "active") {
        return Response.json({ error: "missing" }, { status: 404 });
      }
      const active = JSON.parse(await this.store.get(activeKey));
      if (active.revision !== revision) {
        return Response.json({ error: "changed" }, { status: 409 });
      }
      await this.store.put(activeKey, JSON.stringify(active), {
        expirationTtl: 15_552_000,
      });
      return Response.json({ state: "active", created: false });
    }

    if (path === "/release" || path === "/release-if-current") {
      if (path === "/release-if-current" && existing) {
        const current = JSON.parse(
          await this.store.get(existing === "active" ? activeKey : pendingKey),
        );
        if (current.revision !== revision) {
          return Response.json({ error: "changed" }, { status: 409 });
        }
      }
      this.entries.delete(id);
      await this.store.delete(activeKey);
      await this.store.delete(pendingKey);
      await this.store.delete(legacyKey);
      return Response.json({ released: true });
    }

    return Response.json({ error: "missing" }, { status: 404 });
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

function makeEnv(store = new MemoryKv(), overrides = {}) {
  const registry = overrides.PUSH_REGISTRY ?? new MemoryRegistry();
  registry.store = store;
  return {
    ...baseEnv,
    PUSH_SUBSCRIPTIONS: store,
    ...overrides,
    PUSH_REGISTRY: registry,
  };
}

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

async function subscriptionId(endpoint) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(endpoint),
  );
  return Buffer.from(digest).toString("hex");
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

async function registerPending(env, subscription, locale = "en") {
  const response = await handlePushApi(
    jsonRequest("/api/push/subscriptions", "POST", {
      locale,
      subscription,
    }),
    env,
  );
  assert.equal(response.status, 201);
  return response;
}

async function subscribe(env, subscription, locale = "en") {
  await registerPending(env, subscription, locale);
  const result = await verifyPendingPushSubscriptions(env, async () => {});
  assert.equal(result.verified, 1);
}

test("push API exposes only the public key and ignores non-API paths", async () => {
  const env = makeEnv();
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
  const env = makeEnv(new MemoryKv(), {
    ASSETS: {
      async fetch() {
        assetCalls += 1;
        return new Response("asset");
      },
    },
  });

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
  const env = makeEnv(store);
  const subscription = await validSubscription();

  await subscribe(env, subscription, "fr");
  const storedKeys = [...store.data.keys()].filter((key) =>
    key.startsWith("push:verified:"),
  );
  assert.equal(storedKeys.length, 1);
  assert.equal(JSON.parse(store.data.get(storedKeys[0])).locale, "fr");
  assert.equal(
    store.putOptions.get(storedKeys[0]).expirationTtl,
    180 * 24 * 60 * 60,
  );

  const refreshed = await handlePushApi(
    jsonRequest("/api/push/subscriptions", "POST", {
      locale: "ja",
      subscription,
    }),
    env,
  );
  assert.equal(refreshed.status, 201);
  assert.equal(JSON.parse(store.data.get(storedKeys[0])).locale, "ja");
  assert.equal(env.PUSH_REGISTRY.entries.size, 1);

  const response = await handlePushApi(
    jsonRequest("/api/push/subscriptions", "DELETE", {
      endpoint: subscription.endpoint,
    }),
    env,
  );
  assert.equal(response.status, 200);
  assert.equal(store.data.has(storedKeys[0]), false);
});

test("an in-flight delivery cannot overwrite a concurrent locale refresh", async () => {
  const store = new MemoryKv();
  const env = makeEnv(store);
  const subscription = await validSubscription("locale-race");
  await subscribe(env, subscription, "fr");

  let signalStarted;
  let releaseSend;
  const started = new Promise((resolve) => {
    signalStarted = resolve;
  });
  const blocked = new Promise((resolve) => {
    releaseSend = resolve;
  });
  const delivery = deliverPushForTweets(env, [tweet()], async () => {
    signalStarted();
    await blocked;
  });
  await started;

  const refresh = await handlePushApi(
    jsonRequest("/api/push/subscriptions", "POST", {
      locale: "ja",
      subscription,
    }),
    env,
  );
  assert.equal(refresh.status, 201);
  releaseSend();
  await delivery;

  const activeKey = [...store.data.keys()].find((key) =>
    key.startsWith("push:verified:"),
  );
  assert.ok(activeKey);
  assert.equal(JSON.parse(store.data.get(activeKey)).locale, "ja");
  assert.equal(env.PUSH_REGISTRY.entries.size, 1);
});

test("an in-flight delivery cannot recreate a deleted subscription", async () => {
  const store = new MemoryKv();
  const env = makeEnv(store);
  const subscription = await validSubscription("delete-race");
  await subscribe(env, subscription, "fr");

  let signalStarted;
  let releaseSend;
  const started = new Promise((resolve) => {
    signalStarted = resolve;
  });
  const blocked = new Promise((resolve) => {
    releaseSend = resolve;
  });
  const delivery = deliverPushForTweets(env, [tweet()], async () => {
    signalStarted();
    await blocked;
  });
  await started;

  const deletion = await handlePushApi(
    jsonRequest("/api/push/subscriptions", "DELETE", {
      endpoint: subscription.endpoint,
    }),
    env,
  );
  assert.equal(deletion.status, 200);
  releaseSend();
  await delivery;

  assert.equal(env.PUSH_REGISTRY.entries.size, 0);
  assert.equal(
    [...store.data.keys()].some((key) =>
      /push:(?:verified|pending-subscription):/.test(key),
    ),
    false,
  );
});

test("new registrations remain short-lived until a push service accepts them", async () => {
  const store = new MemoryKv();
  const env = makeEnv(store);
  const subscription = await validSubscription("pending");

  await registerPending(env, subscription, "ja");
  const pendingKey = [...store.data.keys()].find((key) =>
    key.startsWith("push:pending-subscription:"),
  );
  assert.ok(pendingKey);
  assert.equal(
    store.putOptions.get(pendingKey).expirationTtl,
    10 * 60,
  );
  assert.equal(
    [...store.data.keys()].some((key) => key.startsWith("push:verified:")),
    false,
  );

  const sent = [];
  const result = await verifyPendingPushSubscriptions(
    env,
    async (_env, target, payload) => sent.push({ target, payload }),
  );
  assert.deepEqual(result, {
    enabled: true,
    verified: 1,
    removed: 0,
    pending: 0,
  });
  assert.equal(sent[0].target.endpoint, subscription.endpoint);
  assert.deepEqual(sent[0].payload, { v: 1, kind: "test", locale: "ja" });
  assert.equal(store.data.has(pendingKey), false);
  assert.equal(
    [...store.data.keys()].some((key) => key.startsWith("push:verified:")),
    true,
  );
});

test("pending verification promotes the newest concurrent locale revision", async () => {
  const store = new MemoryKv();
  const env = makeEnv(store);
  const subscription = await validSubscription("pending-locale-race");
  await registerPending(env, subscription, "fr");

  let signalStarted;
  let releaseSend;
  const started = new Promise((resolve) => {
    signalStarted = resolve;
  });
  const blocked = new Promise((resolve) => {
    releaseSend = resolve;
  });
  const verification = verifyPendingPushSubscriptions(env, async () => {
    signalStarted();
    await blocked;
  });
  await started;
  await handlePushApi(
    jsonRequest("/api/push/subscriptions", "POST", {
      locale: "ja",
      subscription,
    }),
    env,
  );
  releaseSend();

  assert.equal((await verification).pending, 1);
  const retry = await verifyPendingPushSubscriptions(env, async () => {});
  assert.equal(retry.verified, 1);
  const activeKey = [...store.data.keys()].find((key) =>
    key.startsWith("push:verified:"),
  );
  assert.equal(JSON.parse(store.data.get(activeKey)).locale, "ja");
});

test("pending verification cannot recreate a deleted subscription", async () => {
  const store = new MemoryKv();
  const env = makeEnv(store);
  const subscription = await validSubscription("pending-delete-race");
  await registerPending(env, subscription, "fr");

  let signalStarted;
  let releaseSend;
  const started = new Promise((resolve) => {
    signalStarted = resolve;
  });
  const blocked = new Promise((resolve) => {
    releaseSend = resolve;
  });
  const verification = verifyPendingPushSubscriptions(env, async () => {
    signalStarted();
    await blocked;
  });
  await started;
  const deletion = await handlePushApi(
    jsonRequest("/api/push/subscriptions", "DELETE", {
      endpoint: subscription.endpoint,
    }),
    env,
  );
  assert.equal(deletion.status, 200);
  releaseSend();
  await verification;

  assert.equal(env.PUSH_REGISTRY.entries.size, 0);
  assert.equal(
    [...store.data.keys()].some((key) =>
      /push:(?:verified|pending-subscription):/.test(key),
    ),
    false,
  );
});

test("unreachable push endpoints are removed instead of becoming active", async () => {
  const store = new MemoryKv();
  const registry = new MemoryRegistry();
  const env = makeEnv(store, { PUSH_REGISTRY: registry });
  await registerPending(env, await validSubscription("unreachable"));

  const result = await verifyPendingPushSubscriptions(env, async () => {
    throw { statusCode: 404 };
  });

  assert.equal(result.verified, 0);
  assert.equal(result.removed, 1);
  assert.equal(registry.entries.size, 0);
  assert.equal(
    [...store.data.keys()].some((key) =>
      key.startsWith("push:pending-subscription:"),
    ),
    false,
  );
});

test("the shared registry enforces a global pending and active cap", async () => {
  const store = new MemoryKv();
  const registry = new MemoryRegistry({ activeLimit: 1, pendingLimit: 1 });
  const env = makeEnv(store, { PUSH_REGISTRY: registry });
  await registerPending(env, await validSubscription("first-cap"));

  const second = await handlePushApi(
    jsonRequest("/api/push/subscriptions", "POST", {
      locale: "en",
      subscription: await validSubscription("second-cap"),
    }),
    env,
  );

  assert.equal(second.status, 429);
  assert.equal(registry.entries.size, 1);
});

test("legacy records are revalidated and moved onto finite leases", async () => {
  const store = new MemoryKv();
  const env = makeEnv(store);
  const subscription = await validSubscription("legacy");
  const id = await subscriptionId(subscription.endpoint);
  store.data.set(
    `push:subscription:${id}`,
    JSON.stringify({ subscription, locale: "fr" }),
  );

  const result = await maintainPushSubscriptions(env, async () => {});

  assert.equal(result.migrated, 1);
  assert.equal(result.verified, 1);
  assert.equal(store.data.has(`push:subscription:${id}`), false);
  assert.equal(store.data.has(`push:verified:${id}`), true);
  assert.equal(
    store.putOptions.get(`push:verified:${id}`).expirationTtl,
    180 * 24 * 60 * 60,
  );
});

test("subscription API rejects cross-origin, oversized, and SSRF endpoints", async () => {
  const env = makeEnv();
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
  const env = makeEnv(store, { PUSH_TEST_ENABLED: "true" });
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
    makeEnv(new MemoryKv(), { PUSH_NOTIFICATIONS_ENABLED: "false" }),
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
  const env = makeEnv(store);
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

test("a stale KV record is ignored if its registry lease vanished", async () => {
  const store = new MemoryKv();
  const registry = new MemoryRegistry();
  const env = makeEnv(store, { PUSH_REGISTRY: registry });
  await subscribe(env, await validSubscription("lease-recovery"), "en");
  registry.entries.clear();
  let sends = 0;

  const result = await runPushNotifications(
    env,
    fetch,
    async () => [tweet()],
    async () => {
      sends += 1;
    },
  );

  assert.equal(result.complete, true);
  assert.equal(sends, 0);
  assert.equal(registry.entries.size, 0);
  assert.equal(
    [...store.data.keys()].some((key) => key.startsWith("push:verified:")),
    true,
  );
});

test("real-time delivery is idempotent once the post cursor has advanced", async () => {
  const store = new MemoryKv();
  const env = makeEnv(store);
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
      const env = makeEnv(store);
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
  const env = makeEnv(store);
  await subscribe(env, await validSubscription(), "en");
  const key = [...store.data.keys()].find((item) =>
    item.startsWith("push:verified:"),
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
  const env = makeEnv(store);
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
  const env = makeEnv(store);
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
  const env = makeEnv(store);
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
      key.startsWith("push:verified:"),
    ),
    false,
  );
  assert.equal(store.data.get("push:last-notified-tweet"), latest.id);
});

test("transient recipient failure is dropped after six attempts", async () => {
  const store = new MemoryKv();
  const env = makeEnv(store);
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
      key.startsWith("push:verified:"),
    ),
    false,
  );
});
test("broadcasts paginate without exceeding 32 subscriptions per run", async () => {
  const store = new MemoryKv();
  const env = makeEnv(store);
  const subscription = await validSubscription();
  for (let index = 0; index < 33; index += 1) {
    const id = index.toString(16).padStart(64, "0");
    const record = JSON.stringify({
      version: 2,
      revision: crypto.randomUUID(),
      state: "active",
      subscription,
      locale: "en",
      verifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    store.data.set(
      `push:verified:${id}`,
      record,
    );
    env.PUSH_REGISTRY.entries.set(id, "active");
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
