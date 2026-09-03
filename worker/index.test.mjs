import test from "node:test";
import assert from "node:assert/strict";

import { runAutomation } from "./index.mjs";

const env = {
  AUTOMATION_ENABLED: "true",
  TOGASHI_LIST_ID: "2095219478636495163",
  TOGASHI_USER_ID: "1528978792617611264",
  GITHUB_REPOSITORY: "nassim-arifette/hxh-status",
  GITHUB_BRANCH: "main",
  GITHUB_WORKFLOW_FILE: "togashi-status.yml",
  GITHUB_AUTOMATION_TOKEN: "test-token",
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

function fetchRouter({ active = false, cursor, timelineStatus = 200 } = {}) {
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
        return new Response(JSON.stringify(state(cursor)), { status: 200 });
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
