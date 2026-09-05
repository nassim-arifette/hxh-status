import assert from "node:assert/strict";
import test from "node:test";
import { dispatchDuePublications } from "./scheduled-publication.mjs";

const at = Date.parse("2026-09-06T14:57:00Z");
function fixture({ completed = [], active = false, fail = false } = {}) {
  const kv = new Map();
  const requests = [];
  const env = {
    AUTOMATION_ENABLED: "true", GITHUB_REPOSITORY: "owner/repo", GITHUB_BRANCH: "main", GITHUB_AUTOMATION_TOKEN: "test-token",
    X_EVENT_STATE: { get: async (key) => kv.get(key), put: async (key, value) => kv.set(key, value) },
  };
  const fetchImpl = async (url, options) => {
    requests.push({ url, ...options });
    assert.ok(url.startsWith("https://api.github.com/repos/owner/repo/"));
    if (url.includes("/contents/")) return Response.json({ completed });
    if (url.includes("/runs?")) return Response.json({ workflow_runs: active ? [{ status: "in_progress" }] : [] });
    assert.ok(url.endsWith("/publication-status.yml/dispatches"));
    assert.deepEqual(JSON.parse(options.body), { ref: "main" });
    return new Response(null, { status: fail ? 503 : 204 });
  };
  return { env, fetchImpl, requests, kv };
}

test("the publication scheduler has no network or storage cost outside its retry window", async () => {
  const f = fixture();
  f.env.X_EVENT_STATE.get = async () => assert.fail("Unexpected KV read");
  await dispatchDuePublications(f.env, at - 1, f.fetchImpl);
  await dispatchDuePublications(f.env, at + 8 * 86_400_000, f.fetchImpl);
  await dispatchDuePublications({ ...f.env, AUTOMATION_ENABLED: "false" }, at, f.fetchImpl);
  assert.equal(f.requests.length, 0);
});

test("the deadline dispatches a date-checked workflow and leaves failures retryable", async () => {
  const f = fixture();
  await dispatchDuePublications(f.env, at, f.fetchImpl);
  assert.equal(f.requests.filter((r) => r.method === "POST").length, 1);
  assert.equal(f.kv.size, 0);
  const failed = fixture({ fail: true });
  await assert.rejects(dispatchDuePublications(failed.env, at, failed.fetchImpl), /dispatch failed/);
  assert.equal(failed.kv.size, 0);
});

test("an active or completed job prevents duplicate dispatch", async () => {
  for (const option of [{ active: true }, { completed: [420] }]) {
    const f = fixture(option);
    await dispatchDuePublications(f.env, at, f.fetchImpl);
    assert.equal(f.requests.filter((r) => r.method === "POST").length, 0);
    if (option.completed) {
      const count = f.requests.length;
      await dispatchDuePublications(f.env, at + 300_000, f.fetchImpl);
      assert.equal(f.requests.length, count);
    }
  }
});
