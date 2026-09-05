import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import data from "../app/data/status-data.json" with { type: "json" };
import feed from "../app/data/togashi-posts.json" with { type: "json" };
import { signAutomationPayload } from "./payload-auth.mjs";

test("replaying a committed payload retains its translated verdict without a Gemini key", async () => {
  const directory = await mkdtemp(join(tmpdir(), "hxh-verdict-replay-"));
  try {
    await mkdir(join(directory, "app/data"), { recursive: true });
    await mkdir(join(directory, "automation"));
    const post = feed.posts[0];
    const payload = {
      schemaVersion: 1, listId: "2095219478636495163", authorId: post.author.id,
      requestedAt: new Date().toISOString(),
      tweets: [{ id: post.id, authorId: post.author.id, screenName: post.author.screenName,
        createdAt: post.createdAt, url: post.url, fullText: post.originalText, mediaUrls: post.mediaUrls }],
    };
    const verdict = { requestedAt: payload.requestedAt, revision: "committed",
      posts: [{ id: post.id, notification: "raw", translations: post.translation.texts }],
      milestones: { chapters: [], publication: null } };
    const state = { schemaVersion: 1, listId: payload.listId, lastProcessedTweetId: post.id,
      recentEvents: [], pendingReviews: [], pendingVerdict: { payload, verdict } };
    for (const [path, value] of [["app/data/status-data.json", data], ["app/data/togashi-posts.json", feed], ["automation/state.json", state]]) {
      await writeFile(join(directory, path), JSON.stringify(value));
    }
    const body = JSON.stringify(payload);
    const secret = "replay-test-independent-hmac-secret-32chars";
    const output = join(directory, "verdict.json");
    const result = await promisify(execFile)(process.execPath, [resolve("scripts/process-togashi-events.mjs")], {
      cwd: directory, env: { ...process.env, GEMINI_API_KEY: "", AUTOMATION_PAYLOAD: body,
        AUTOMATION_PAYLOAD_SECRET: secret, AUTOMATION_PAYLOAD_SIGNATURE: await signAutomationPayload(body, secret),
        AUTOMATION_VERDICT_FILE: output, GITHUB_OUTPUT: join(directory, "outputs.txt") },
    });
    assert.match(result.stdout, /"analyzed":0/);
    assert.deepEqual(JSON.parse(await readFile(output, "utf8")), verdict);
    assert.deepEqual(JSON.parse(await readFile(join(directory, "automation/state.json"), "utf8")).pendingVerdict, state.pendingVerdict);
  } finally {
    assert.ok(resolve(directory).startsWith(join(resolve(tmpdir()), "hxh-verdict-replay-")));
    await rm(directory, { recursive: true, force: true });
  }
});
