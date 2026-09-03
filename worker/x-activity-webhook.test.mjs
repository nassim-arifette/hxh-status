import assert from "node:assert/strict";
import test from "node:test";
import {
  createCrcResponseToken,
  enqueueActivityEvent,
  processPendingPost,
  serializePipeline,
  verifyWebhookSignature,
} from "./x-activity-webhook.mjs";
import activityWorker from "./x-activity-webhook.mjs";

class MemoryKv {
  constructor() {
    this.data = new Map();
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

  async list({ prefix = "", limit = 1_000 } = {}) {
    const keys = [...this.data.keys()]
      .filter((key) => key.startsWith(prefix))
      .sort()
      .slice(0, limit)
      .map((name) => ({ name }));
    return { keys, list_complete: true, cursor: "" };
  }
}

const postId = "2096000000000000001";
const baseEnv = {
  X_BEARER_TOKEN: "test-x-token",
  TOGASHI_LIST_ID: "2095219478636495163",
  TOGASHI_USER_ID: "1528978792617611264",
  AUTOMATION_ENABLED: "true",
  PUSH_NOTIFICATIONS_ENABLED: "true",
  X_CONSUMER_SECRET: "test-consumer-secret",
  X_WEBHOOK_PATH_SECRET:
    "test-webhook-path-secret-which-is-longer-than-32-bytes",
};

function activityData(overrides = {}) {
  return {
    event_uuid: "event-2096000000000000001",
    event_type: "post.create",
    filter: { user_id: baseEnv.TOGASHI_USER_ID },
    payload: {
      id: postId,
      author_id: baseEnv.TOGASHI_USER_ID,
      created_at: "2026-09-02T12:00:00.000Z",
      text: "No.434、人物ペン入れ完了。",
    },
    ...overrides,
  };
}

async function signWebhookBody(secret, body) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, body),
  );
  return `sha256=${Buffer.from(bytes).toString("base64")}`;
}

test("creates CRC responses and independently verifies X POST signatures", async () => {
  const secret = "test-consumer-secret";
  const body = new TextEncoder().encode('{"event":"post.create"}');
  const signature = await signWebhookBody(secret, body);

  assert.match(
    await createCrcResponseToken(secret, "opaque-x-crc-challenge"),
    /^sha256=[A-Za-z0-9+/]{43}=$/,
  );

  assert.equal(await verifyWebhookSignature(secret, body, signature), true);
  assert.equal(
    await verifyWebhookSignature(secret, body, "sha256=invalid"),
    false,
  );
});

test("CRC refuses to sign JSON event-shaped values", async () => {
  await assert.rejects(
    createCrcResponseToken("test-consumer-secret", '{"data":{}}'),
    /Invalid crc_token/,
  );
  await assert.rejects(
    createCrcResponseToken("test-consumer-secret", "  []  "),
    /Invalid crc_token/,
  );
  await assert.rejects(
    createCrcResponseToken("test-consumer-secret", '\uFEFF{"data":{}}'),
    /Invalid crc_token/,
  );
});

test("webhook requires the unguessable configured callback path", async () => {
  const context = { waitUntil() {} };
  const plain = await activityWorker.fetch(
    new Request("https://events.example/webhook?crc_token=opaque"),
    baseEnv,
    context,
  );
  assert.equal(plain.status, 404);

  const configured = await activityWorker.fetch(
    new Request(
      `https://events.example/webhook/${baseEnv.X_WEBHOOK_PATH_SECRET}` +
        "?crc_token=opaque",
    ),
    baseEnv,
    context,
  );
  assert.equal(configured.status, 200);
  assert.match(
    (await configured.json()).response_token,
    /^sha256=[A-Za-z0-9+/]{43}=$/,
  );
});

test("configured callback accepts a genuinely signed X event and rejects forgery", async () => {
  const store = new MemoryKv();
  const env = { ...baseEnv, X_EVENT_STATE: store };
  const data = activityData({
    payload: {
      ...activityData().payload,
      in_reply_to_tweet_id: "2095000000000000000",
    },
  });
  const body = new TextEncoder().encode(JSON.stringify({ data }));
  const signature = await signWebhookBody(env.X_CONSUMER_SECRET, body);
  const url =
    `https://events.example/webhook/${env.X_WEBHOOK_PATH_SECRET}`;
  const context = {
    waitUntil() {
      assert.fail("Replies must not start downstream processing.");
    },
  };

  const accepted = await activityWorker.fetch(
    new Request(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-twitter-webhooks-signature": signature,
      },
      body,
    }),
    env,
    context,
  );
  assert.equal(accepted.status, 200);
  assert.deepEqual(await accepted.json(), { ok: true, queued: false });

  const rejected = await activityWorker.fetch(
    new Request(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-twitter-webhooks-signature": "sha256=" + "A".repeat(43) + "=",
      },
      body,
    }),
    env,
    context,
  );
  assert.equal(rejected.status, 401);
  assert.equal(
    [...store.data.keys()].some((key) => key.startsWith("pipeline:pending:")),
    false,
  );
});

test("rejects unsupported signature formats", async () => {
  assert.equal(
    await verifyWebhookSignature(
      "test-consumer-secret",
      new TextEncoder().encode("payload"),
      "not-a-signature",
    ),
    false,
  );
});

test("serializes webhook and fallback pipeline work", async () => {
  const events = [];
  let releaseFirst;
  const firstGate = new Promise((resolve) => {
    releaseFirst = resolve;
  });

  const webhook = serializePipeline(async () => {
    events.push("webhook:start");
    await firstGate;
    events.push("webhook:end");
  });
  const fallback = serializePipeline(async () => {
    events.push("fallback:start");
    events.push("fallback:end");
  });

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(events, ["webhook:start"]);
  releaseFirst();
  await Promise.all([webhook, fallback]);
  assert.deepEqual(events, [
    "webhook:start",
    "webhook:end",
    "fallback:start",
    "fallback:end",
  ]);
});

test("queues an original Togashi post and ignores replies", async () => {
  const store = new MemoryKv();
  const env = { ...baseEnv, X_EVENT_STATE: store };
  const queued = await enqueueActivityEvent(activityData(), env);

  assert.deepEqual(queued, {
    queued: true,
    duplicate: false,
    postId,
  });
  assert.equal(store.data.has(`pipeline:pending:${postId}`), true);

  const reply = activityData({
    event_uuid: "reply-event",
    payload: {
      ...activityData().payload,
      id: "2096000000000000002",
      in_reply_to_tweet_id: postId,
    },
  });
  assert.deepEqual(await enqueueActivityEvent(reply, env), {
    queued: false,
    duplicate: false,
    ignored: "reply-or-repost",
  });
});

test("processes one queued post through GitHub automation and browser push", async () => {
  const store = new MemoryKv();
  const env = { ...baseEnv, X_EVENT_STATE: store };
  await enqueueActivityEvent(activityData(), env);
  const automationTweets = [];
  const pushedTweets = [];

  const result = await processPendingPost(postId, env, {
    fetchImpl: async (url, options) => {
      assert.equal(new URL(url).pathname, `/2/tweets/${postId}`);
      assert.equal(options.headers.Authorization, "Bearer test-x-token");
      return new Response(
        JSON.stringify({
          data: {
            id: postId,
            author_id: baseEnv.TOGASHI_USER_ID,
            created_at: "2026-09-02T12:00:00.000Z",
            text: "No.434、人物ペン入れ完了。",
          },
          includes: {
            media: [
              {
                media_key: "3_test",
                type: "photo",
                url: "https://pbs.twimg.com/media/example.jpg",
              },
            ],
          },
        }),
        { status: 200 },
      );
    },
    automationRunner: async (_env, _fetch, timelineLoader) => {
      automationTweets.push(...(await timelineLoader()));
      return { dispatched: true, count: 1 };
    },
    pushRunner: async (_env, tweets) => {
      pushedTweets.push(...tweets);
      return { enabled: true, complete: true, delivered: 1 };
    },
  });

  assert.deepEqual(result, { complete: true, postId });
  assert.equal(automationTweets.length, 1);
  assert.equal(pushedTweets.length, 1);
  assert.deepEqual(automationTweets[0], pushedTweets[0]);
  assert.deepEqual(automationTweets[0].mediaUrls, [
    "https://pbs.twimg.com/media/example.jpg",
  ]);
  assert.equal(store.data.has(`pipeline:pending:${postId}`), false);
  assert.equal(store.data.has(`pipeline:processed:${postId}`), true);
  assert.equal(JSON.parse(store.data.get("togashi:latest-post")).id, postId);

  const replay = await enqueueActivityEvent(
    activityData({ event_uuid: "different-event-same-post" }),
    env,
  );
  assert.deepEqual(replay, { queued: false, duplicate: true });
});

test("keeps failed pipeline work queued for the retry Cron", async () => {
  const store = new MemoryKv();
  const env = { ...baseEnv, X_EVENT_STATE: store };
  await enqueueActivityEvent(activityData(), env);

  await assert.rejects(
    processPendingPost(postId, env, {
      fetchImpl: async () =>
        new Response(JSON.stringify({ title: "temporary failure" }), {
          status: 503,
        }),
    }),
    /X post lookup failed/,
  );

  const job = JSON.parse(store.data.get(`pipeline:pending:${postId}`));
  assert.equal(job.attempts, 1);
  assert.match(job.lastError, /X post lookup failed/);
});
