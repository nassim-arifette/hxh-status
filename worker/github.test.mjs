import test from "node:test";
import assert from "node:assert/strict";

import {
  dispatchAutomationWorkflow,
  fetchAutomationState,
  hasActiveAutomationRun,
} from "./github.mjs";

const config = {
  token: "secret-token",
  repository: "nassim-arifette/hxh-status",
  branch: "main",
  workflowFile: "togashi-status.yml",
};

test("fetchAutomationState reads the raw file from the configured branch", async () => {
  const expected = {
    schemaVersion: 1,
    listId: "2095219478636495163",
    lastProcessedTweetId: "2094673907626414299",
  };

  const result = await fetchAutomationState(config, async (url, options) => {
    assert.match(
      url,
      /repos\/nassim-arifette\/hxh-status\/contents\/automation\/state\.json\?ref=main$/,
    );
    assert.equal(options.headers.Authorization, "Bearer secret-token");
    assert.ok(options.signal instanceof AbortSignal);
    return new Response(JSON.stringify(expected), { status: 200 });
  });

  assert.deepEqual(result, expected);
});

test("active workflow runs prevent another dispatch", async () => {
  const active = await hasActiveAutomationRun(config, async (url) => {
    assert.match(url, /togashi-status\.yml\/runs\?branch=main&per_page=20$/);
    return new Response(
      JSON.stringify({ workflow_runs: [{ status: "in_progress" }] }),
      { status: 200 },
    );
  });
  const idle = await hasActiveAutomationRun(config, async () =>
    new Response(
      JSON.stringify({ workflow_runs: [{ status: "completed" }] }),
      { status: 200 },
    ),
  );

  assert.equal(active, true);
  assert.equal(idle, false);
});

test("dispatch sends one JSON payload and requires GitHub 204", async () => {
  const payload = { schemaVersion: 1, tweets: [] };
  let called = false;

  await dispatchAutomationWorkflow(
    { ...config, payload },
    async (url, options) => {
      called = true;
      assert.match(url, /togashi-status\.yml\/dispatches$/);
      assert.equal(options.method, "POST");
      assert.deepEqual(JSON.parse(options.body), {
        ref: "main",
        inputs: { payload: JSON.stringify(payload) },
      });
      return new Response(null, { status: 204 });
    },
  );

  assert.equal(called, true);

  await assert.rejects(
    dispatchAutomationWorkflow(
      { ...config, payload },
      async () => new Response('{"message":"not found"}', { status: 404 }),
    ),
    (error) =>
      /workflow dispatch failed \(404\)/.test(error.message) &&
      !error.message.includes(config.token),
  );
});
