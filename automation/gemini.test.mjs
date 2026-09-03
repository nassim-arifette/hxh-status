import test from "node:test";
import assert from "node:assert/strict";

import { analyzeTweet, retryDelay } from "./gemini.mjs";
import { canonicalTweetUrl } from "./contracts.mjs";

function tweet(overrides = {}) {
  const id = "2096000000000000001";
  return {
    id,
    authorId: "1528978792617611264",
    screenName: "Un4v5s8bgsVk9Xp",
    createdAt: "2026-09-03T03:00:00.000Z",
    url: canonicalTweetUrl(id),
    fullText:
      "No.434\u3001\u4EBA\u7269\u30DA\u30F3\u5165\u308C\u5B8C\u4E86\u3002",
    mediaUrls: [],
    ...overrides,
  };
}

function completedResponse(analysis) {
  const output = JSON.stringify(analysis);
  return new Response(
    JSON.stringify({
      status: "completed",
      output_text: output,
      steps: [
        {
          type: "model_output",
          content: [{ type: "text", text: output }],
        },
      ],
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    },
  );
}

function confirmedAnalysis() {
  return {
    schemaVersion: 1,
    postClassification: "confirmed_chapter_stage",
    chapterUpdates: [
      {
        chapter: 434,
        proposedStatus: "inking",
        completionScope: "whole_chapter",
        evidenceBasis: "explicit_tweet_text",
        evidence:
          "No.434\u3001\u4EBA\u7269\u30DA\u30F3\u5165\u308C\u5B8C\u4E86",
        confidence: 0.99,
      },
    ],
    requiresHumanReview: false,
    explanation: "The whole-chapter milestone is explicit.",
  };
}

test("Gemini request uses a system instruction and validates completed output", async () => {
  let requests = 0;
  const analysis = confirmedAnalysis();

  const result = await analyzeTweet({
    tweet: tweet(),
    currentChapters: [{ chapter: 434, status: "unknown" }],
    apiKey: "test-key",
    model: "gemini-test",
    fetchImpl: async (url, options) => {
      requests += 1;
      assert.equal(
        url,
        "https://generativelanguage.googleapis.com/v1/interactions",
      );
      assert.equal(options.method, "POST");
      assert.equal(options.headers["x-goog-api-key"], "test-key");
      assert.ok(options.signal instanceof AbortSignal);

      const body = JSON.parse(options.body);
      assert.equal(body.model, "gemini-test");
      assert.equal(body.store, false);
      assert.match(body.system_instruction, /untrusted\s+evidence/);
      assert.match(
        body.system_instruction,
        /\u4EBA\u7269\u30DA\u30F3\u5165\u308C\u5B8C\u4E86/u,
      );
      assert.doesNotMatch(body.input[0].text, /You are a conservative/);
      return completedResponse(analysis);
    },
  });

  assert.equal(requests, 1);
  assert.deepEqual(result.analysis, analysis);
  assert.equal(result.verification, null);
});

test("non-completed Gemini responses are rejected", async () => {
  await assert.rejects(
    analyzeTweet({
      tweet: tweet(),
      currentChapters: [{ chapter: 434, status: "unknown" }],
      apiKey: "test-key",
      model: "gemini-test",
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            status: "incomplete",
            steps: [
              {
                type: "model_output",
                content: [{ type: "text", text: "{}" }],
              },
            ],
          }),
          { status: 200 },
        ),
    }),
    /not completed/,
  );
});

test("missing media without deterministic text is forced to human review", async () => {
  let requests = 0;
  const result = await analyzeTweet({
    tweet: tweet({
      fullText: "https://t.co/example",
      mediaUrls: ["https://pbs.twimg.com/media/example.jpg"],
    }),
    currentChapters: [{ chapter: 434, status: "unknown" }],
    apiKey: "test-key",
    model: "gemini-test",
    fetchImpl: async () => {
      requests += 1;
      throw new Error("temporary network failure");
    },
  });

  assert.equal(requests, 1);
  assert.equal(result.analysis.postClassification, "ambiguous");
  assert.equal(result.analysis.requiresHumanReview, true);
  assert.equal(result.mediaErrors.length, 1);
});

test("Retry-After falls back when absent and accepts seconds", () => {
  assert.equal(retryDelay(null, 0), 1_000);
  assert.equal(retryDelay(null, 2), 4_000);
  assert.equal(retryDelay("2", 0), 2_000);
});
