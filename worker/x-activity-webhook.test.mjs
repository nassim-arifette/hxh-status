import assert from "node:assert/strict";
import test from "node:test";
import {
  createCrcResponseToken,
  enqueueActivityEvent,
  processPendingPost,
  serializePipeline,
  verifyWebhookSignature,
} from "./x-activity-webhook.mjs";

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

test("creates and verifies X webhook HMAC signatures", async () => {
  const secret = "test-consumer-secret";
  const body = new TextEncoder().encode('{"event":"post.create"}');
  const signature = await createCrcResponseToken(
    secret,
    new TextDecoder().decode(body),
  );

  assert.equal(await verifyWebhookSignature(secret, body, signature), true);
  assert.equal(
    await verifyWebhookSignature(secret, body, "sha256=invalid"),
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
