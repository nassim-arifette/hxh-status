import assert from "node:assert/strict";
import test from "node:test";
import { publishVerifiedCommit } from "./verified-publish.mjs";

const sha = "a".repeat(40);
const branch = `automation/verify-123-2-${sha.slice(0, 12)}`;
const config = { repository: "owner/repo", token: "test-token", runId: "123", runAttempt: "2" };
const completed = (conclusion = "success") => ({
  id: 456, head_sha: sha, head_branch: branch, status: "completed", conclusion,
});

function fixture(runs, { dispatchStatus = 204, rejectMain = false } = {}) {
  const calls = [];
  let time = 0;
  let verified = false;
  return { calls, options: {
    ...config, now: () => time, timeoutMs: 30_000,
    wait: async (delay) => { time += delay; },
    git: async (args) => {
      calls.push({ git: args });
      if (args[0] === "rev-parse") return sha;
      if (args.at(-1) === `${sha}:refs/heads/main`) {
        assert.ok(verified, "Protected main must never be pushed before CI passes on its commit");
        if (rejectMain) throw new Error("main advanced; non-fast-forward");
      }
      return "";
    },
    fetchImpl: async (url, options) => {
      assert.equal(options.headers.Authorization, `Bearer ${config.token}`);
      if (url.endsWith("/dispatches")) {
        assert.equal(options.method, "POST");
        assert.deepEqual(JSON.parse(options.body), { ref: branch });
        assert.ok(calls.some((call) => call.git?.at(-1) === `${sha}:refs/heads/${branch}`));
        calls.push({ dispatch: true });
        return new Response(null, { status: dispatchStatus });
      }
      const query = new URL(url).searchParams;
      assert.equal(query.get("head_sha"), sha);
      assert.equal(query.get("branch"), branch);
      const result = runs.shift() ?? [];
      verified = result.some((run) => run.head_sha === sha && run.head_branch === branch &&
        run.status === "completed" && run.conclusion === "success");
      calls.push({ checked: result });
      return Response.json({ workflow_runs: result });
    },
  } };
}

test("a generated commit reaches protected main only after its real CI succeeds", async () => {
  const f = fixture([[], [{ ...completed(), status: "in_progress", conclusion: null }], [completed()]]);
  assert.deepEqual(await publishVerifiedCommit(f.options), { sha, runId: 456 });
  assert.deepEqual(f.calls.at(-2), { git: ["push", "origin", `${sha}:refs/heads/main`] });
  assert.deepEqual(f.calls.at(-1), { git: ["push", "origin", "--delete", branch] });
});

for (const conclusion of ["failure", "cancelled", "skipped", "timed_out"]) {
  test(`CI ${conclusion} leaves main untouched and cleans the temporary branch`, async () => {
    const f = fixture([[completed(conclusion)]]);
    await assert.rejects(publishVerifiedCommit(f.options), /CI verification did not pass/);
    assert.equal(f.calls.some((call) => call.git?.at(-1) === `${sha}:refs/heads/main`), false);
    assert.deepEqual(f.calls.at(-1), { git: ["push", "origin", "--delete", branch] });
  });
}

test("a successful run on a different commit or branch cannot authorize publication", async () => {
  const f = fixture([[{ ...completed(), head_sha: "b".repeat(40) }, { ...completed(), head_branch: "main" }]]);
  await assert.rejects(publishVerifiedCommit(f.options), /timed out/);
  assert.equal(f.calls.some((call) => call.git?.at(-1) === `${sha}:refs/heads/main`), false);
});

test("missing dispatch permission leaves main untouched and cleans the branch", async () => {
  const f = fixture([], { dispatchStatus: 403 });
  await assert.rejects(publishVerifiedCommit(f.options), /request failed \(403\)/);
  assert.equal(f.calls.some((call) => call.git?.at(-1) === `${sha}:refs/heads/main`), false);
  assert.deepEqual(f.calls.at(-1), { git: ["push", "origin", "--delete", branch] });
});

test("a concurrent main update is never force-pushed over", async () => {
  const f = fixture([[completed()]], { rejectMain: true });
  await assert.rejects(publishVerifiedCommit(f.options), /non-fast-forward/);
  assert.equal(f.calls.some((call) => call.git?.some((arg) => arg.startsWith("--force"))), false);
  assert.deepEqual(f.calls.at(-1), { git: ["push", "origin", "--delete", branch] });
});
