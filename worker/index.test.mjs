import test from "node:test";
import assert from "node:assert/strict";

import siteWorker, { runAutomation } from "./index.mjs";

const env = {
  AUTOMATION_ENABLED: "true",
  TOGASHI_LIST_ID: "2095219478636495163",
  TOGASHI_USER_ID: "1528978792617611264",
  GITHUB_REPOSITORY: "nassim-arifette/hxh-status",
  GITHUB_BRANCH: "main",
  GITHUB_WORKFLOW_FILE: "togashi-status.yml",
  GITHUB_AUTOMATION_TOKEN: "test-token",
  AUTOMATION_PAYLOAD_SECRET: "test-automation-payload-secret-32-chars",
};

function timelineHtml(id = "2096000000000000001") {
  const entries = [
    {
      type: "tweet",
      content: {
        tweet: {
          id_str: id,
          created_at: "Wed Sep 02 12:00:00 +0000 2026",
          full_text:
            "No.434\u3001\u4EBA\u7269\u30DA\u30F3\u5165\u308C\u5B8C\u4E86\u3002",
          user: {
            id_str: "1528978792617611264",
            screen_name: "Un4v5s8bgsVk9Xp",
          },
        },
      },
    },
  ];

  return [
    "<html>",
    '<script id="__NEXT_DATA__" type="application/json">',
    JSON.stringify({ props: { pageProps: { timeline: { entries } } } }),
    "</script>",
    "</html>",
  ].join("");
}

function state(lastProcessedTweetId = "2094673907626414299") {
  return {
    schemaVersion: 1,
    listId: "2095219478636495163",
    lastProcessedTweetId,
    lastProcessedAt: "2026-09-01T06:29:11.000Z",
    lastRunAt: null,
    recentEvents: [],
    pendingReviews: [],
  };
}

function fetchRouter({ active = false, cursor, timelineStatus = 200, repositoryState } = {}) {
  const calls = [];

  return {
    calls,
    fetch: async (url, options = {}) => {
      calls.push({ url, options });

      if (url.includes("/runs?")) {
        return new Response(
          JSON.stringify({
            workflow_runs: active ? [{ status: "in_progress" }] : [],
          }),
          { status: 200 },
        );
      }

      if (url.includes("syndication.twitter.com")) {
        return new Response(timelineHtml(), { status: timelineStatus });
      }

      if (url.includes("/contents/automation/state.json")) {
        return new Response(JSON.stringify(repositoryState ?? state(cursor)), { status: 200 });
      }

      if (url.endsWith("/dispatches")) {
        return new Response(null, { status: 204 });
      }

      throw new Error(`Unexpected URL: ${url}`);
    },
  };
}

test("disabled automation performs no network calls", async () => {
  let calls = 0;
  const result = await runAutomation(
    { ...env, AUTOMATION_ENABLED: "false" },
    async () => {
      calls += 1;
      throw new Error("should not run");
    },
  );

  assert.deepEqual(result, { dispatched: false, count: 0 });
  assert.equal(calls, 0);
});

test("an acknowledged tweet with a pending verdict is retried when X is unavailable", async () => {
  const router = fetchRouter();
  await runAutomation(env, router.fetch);
  const original = router.calls.find((call) => call.url.endsWith("/dispatches"));
  const payload = JSON.parse(JSON.parse(original.options.body).inputs.payload);
  const pendingState = state(payload.tweets.at(-1).id);
  pendingState.pendingVerdict = { payload, verdict: { revision: "pending" } };
  const calls = [];
  const result = await runAutomation(env, async (url, options) => {
    calls.push({ url, options });
    if (url.includes("/contents/")) return Response.json(pendingState);
    return router.fetch(url, options);
  }, () => { throw new Error("X unavailable during verdict retry"); });
  assert.equal(result.pendingVerdict, true);
  const retry = JSON.parse(JSON.parse(calls.find((call) => call.url.endsWith("/dispatches")).options.body).inputs.payload);
  assert.deepEqual(retry.tweets, payload.tweets);
});

test("an active workflow suppresses duplicate dispatches", async () => {
  const router = fetchRouter({ active: true });
  const result = await runAutomation(env, router.fetch);

  assert.deepEqual(result, { dispatched: false, count: 0, busy: true });
  assert.equal(router.calls.length, 1);
});

test("dry-run finds the next post but does not dispatch it", async () => {
  const router = fetchRouter();
  const result = await runAutomation(
    { ...env, AUTOMATION_DRY_RUN: "true" },
    router.fetch,
  );

  assert.deepEqual(result, { dispatched: false, count: 1 });
  assert.equal(
    router.calls.some(({ url }) => url.endsWith("/dispatches")),
    false,
  );
});

test("idle automation dispatches one validated batch", async () => {
  const router = fetchRouter();
  const result = await runAutomation(env, router.fetch);
  const dispatch = router.calls.find(({ url }) => url.endsWith("/dispatches"));

  assert.deepEqual(result, { dispatched: true, count: 1 });
  assert.ok(dispatch);

  const body = JSON.parse(dispatch.options.body);
  const payload = JSON.parse(body.inputs.payload);
  assert.match(body.inputs.signature, /^sha256=[A-Za-z0-9+/]{43}=$/);
  assert.equal(payload.listId, env.TOGASHI_LIST_ID);
  assert.equal(payload.authorId, env.TOGASHI_USER_ID);
  assert.deepEqual(
    payload.tweets.map((tweet) => tweet.id),
    ["2096000000000000001"],
  );
});

test("a post already recorded by either source is not dispatched again", async () => {
  const processedId = "2096000000000000001";

  for (const secondSource of ["webhook", "syndication fallback"]) {
    const router = fetchRouter({ cursor: processedId });
    const result = await runAutomation(env, router.fetch);

    assert.deepEqual(result, { dispatched: false, count: 0 }, secondSource);
    assert.equal(
      router.calls.some(({ url }) => url.endsWith("/dispatches")),
      false,
      `${secondSource} must not dispatch an already processed post`,
    );
  }
});

test("timeline HTTP failures fail closed", async () => {
  const router = fetchRouter({ timelineStatus: 429 });

  await assert.rejects(runAutomation(env, router.fetch), /X timeline request failed/);
  assert.equal(
    router.calls.some(({ url }) => url.endsWith("/dispatches")),
    false,
  );
});

function retryTweet(id = "2096000000000000001") {
  return {
    id,
    authorId: env.TOGASHI_USER_ID,
    screenName: "Un4v5s8bgsVk9Xp",
    createdAt: "2026-09-02T12:00:00.000Z",
    url: `https://x.com/Un4v5s8bgsVk9Xp/status/${id}`,
    fullText: "No.434、人物ペン入れ完了。",
    mediaUrls: [],
  };
}

function dispatchedTweets(router) {
  const dispatch = router.calls.find(({ url }) => url.endsWith("/dispatches"));
  return dispatch
    ? JSON.parse(JSON.parse(dispatch.options.body).inputs.payload).tweets
    : [];
}

test("scheduled fallback retries cursor-covered analysis without any new timeline post", async () => {
  const pending = retryTweet();
  const repositoryState = { ...state(pending.id), pendingAnalysis: [pending] };
  const router = fetchRouter({ repositoryState });
  const previousFetch = globalThis.fetch;
  globalThis.fetch = router.fetch;
  try {
    await siteWorker.scheduled({ cron: "fallback" }, {
      ...env, PUSH_NOTIFICATIONS_ENABLED: "false",
    });
  } finally {
    globalThis.fetch = previousFetch;
  }
  assert.deepEqual(dispatchedTweets(router), [pending]);
  assert.equal(router.calls.filter(({ url }) => url.includes("/contents/")).length, 1);
});

test("only recorded pending analysis is retried below the cursor", async () => {
  const pending = retryTweet("2096000000000000001");
  const completed = retryTweet("2096000000000000002");
  const repositoryState = { ...state(completed.id), pendingAnalysis: [pending] };
  const router = fetchRouter({ repositoryState });
  const result = await runAutomation(env, router.fetch, async () => [pending, completed]);
  assert.deepEqual(result, { dispatched: true, count: 1 });
  assert.deepEqual(dispatchedTweets(router), [pending]);
});

test("pending verdict delivery precedes deferred analysis", async () => {
  const pending = retryTweet("2096000000000000001");
  const verdictTweet = retryTweet("2096000000000000002");
  const payload = {
    schemaVersion: 1,
    listId: env.TOGASHI_LIST_ID,
    authorId: env.TOGASHI_USER_ID,
    requestedAt: "2026-09-02T12:00:00.000Z",
    tweets: [verdictTweet],
  };
  const repositoryState = {
    ...state(verdictTweet.id),
    pendingAnalysis: [pending],
    pendingVerdict: { payload, verdict: { revision: "pending" } },
  };
  const router = fetchRouter({ repositoryState });
  const result = await runAutomation(env, router.fetch, async () => [verdictTweet]);
  assert.deepEqual(result, { dispatched: true, count: 0, pendingVerdict: true });
  assert.deepEqual(dispatchedTweets(router), [verdictTweet]);
});

test("a pending verdict dispatch also admits new originals without retrying old analysis", async () => {
  const pending = retryTweet("2096000000000000001");
  const verdictTweet = retryTweet("2096000000000000002");
  const fresh = retryTweet("2096000000000000003");
  const repositoryState = {
    ...state(verdictTweet.id),
    pendingAnalysis: [pending],
    pendingVerdict: {
      payload: {
        schemaVersion: 1,
        listId: env.TOGASHI_LIST_ID,
        authorId: env.TOGASHI_USER_ID,
        requestedAt: "2026-09-02T12:00:00.000Z",
        tweets: [verdictTweet],
      },
      verdict: { revision: "pending" },
    },
  };
  const router = fetchRouter({ repositoryState });
  const result = await runAutomation(env, router.fetch, async () => [pending, verdictTweet, fresh]);
  assert.deepEqual(result, { dispatched: true, count: 1, pendingVerdict: true });
  assert.deepEqual(dispatchedTweets(router), [verdictTweet, fresh]);
});

test("a full pending verdict batch reserves space for a new original", async () => {
  for (const large of [false, true]) {
    const retained = Array.from({ length: 5 }, (_, index) => ({
      ...retryTweet(`209600000000000000${index + 1}`),
      ...(large ? { fullText: "x".repeat(8_000) } : {}),
    }));
    const fresh = {
      ...retryTweet("2096000000000000006"),
      ...(large ? { fullText: "完".repeat(10_000) } : {}),
    };
    const repositoryState = {
      ...state(retained.at(-1).id),
      pendingVerdict: {
        payload: {
          schemaVersion: 1,
          listId: env.TOGASHI_LIST_ID,
          authorId: env.TOGASHI_USER_ID,
          requestedAt: "2026-09-02T12:00:00.000Z",
          tweets: retained,
        },
        verdict: { revision: "pending" },
      },
    };
    const router = fetchRouter({ repositoryState });
    const result = await runAutomation(env, router.fetch, async () => [...retained, fresh]);
    assert.deepEqual(result, { dispatched: true, count: 1, pendingVerdict: true });
    assert.deepEqual(dispatchedTweets(router), [...retained.slice(0, large ? 2 : 4), fresh]);
    const dispatch = router.calls.find(({ url }) => url.endsWith("/dispatches"));
    assert.ok(Buffer.byteLength(JSON.parse(dispatch.options.body).inputs.payload) <= 50_000);
  }
});

test("deferred analysis retries survive an unavailable timeline", async () => {
  const pending = retryTweet();
  const router = fetchRouter({
    timelineStatus: 429,
    repositoryState: { ...state(pending.id), pendingAnalysis: [pending] },
  });
  assert.deepEqual(await runAutomation(env, router.fetch), { dispatched: true, count: 1 });
  assert.deepEqual(dispatchedTweets(router), [pending]);
});

test("fresh posts take batch space before deferred analysis and IDs are deduplicated", async () => {
  const pending = retryTweet("2096000000000000001");
  const fresh = Array.from({ length: 5 }, (_, index) =>
    retryTweet(`209600000000000000${index + 2}`));
  const router = fetchRouter({
    repositoryState: { ...state(pending.id), pendingAnalysis: [pending, fresh[0]] },
  });
  const result = await runAutomation(env, router.fetch, async () => fresh);
  assert.deepEqual(result, { dispatched: true, count: 5 });
  assert.deepEqual(dispatchedTweets(router), fresh);
});

test("a pending post also present above the cursor is dispatched once", async () => {
  const pending = retryTweet();
  const router = fetchRouter({
    repositoryState: { ...state(), pendingAnalysis: [pending] },
  });
  assert.deepEqual(await runAutomation(env, router.fetch, async () => [pending]), {
    dispatched: true, count: 1,
  });
  assert.deepEqual(dispatchedTweets(router), [pending]);
});

test("removing completed pending analysis stops later redispatches", async () => {
  const completed = retryTweet();
  const router = fetchRouter({
    repositoryState: { ...state(completed.id), pendingAnalysis: [] },
  });
  assert.deepEqual(await runAutomation(env, router.fetch, async () => [completed]), {
    dispatched: false, count: 0,
  });
  assert.deepEqual(dispatchedTweets(router), []);
});

test("an empty timeline still retries stored analysis", async () => {
  const pending = retryTweet();
  const router = fetchRouter({
    repositoryState: { ...state(pending.id), pendingAnalysis: [pending] },
  });
  assert.deepEqual(await runAutomation(env, router.fetch, async () => []), { dispatched: true, count: 1 });
  assert.deepEqual(dispatchedTweets(router), [pending]);
});
