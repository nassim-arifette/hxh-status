import test from "node:test";
import assert from "node:assert/strict";

import {
  canonicalTweetUrl,
  deterministicTextMatches,
  evaluateAnalysis,
  validateAutomationPayload,
  validateModelAnalysis,
} from "./contracts.mjs";

function tweet(fullText = "No.434\u3001\u4EBA\u7269\u30DA\u30F3\u5165\u308C\u5B8C\u4E86\u3002") {
  const id = "2096000000000000001";
  return {
    id,
    authorId: "1528978792617611264",
    screenName: "Un4v5s8bgsVk9Xp",
    createdAt: "2026-09-02T12:00:00.000Z",
    url: canonicalTweetUrl(id),
    fullText,
    mediaUrls: [],
  };
}

function analysis(update) {
  return {
    schemaVersion: 1,
    postClassification: "confirmed_chapter_stage",
    chapterUpdates: [update],
    requiresHumanReview: false,
    explanation: "Explicit completed chapter stage.",
  };
}

test("known whole-chapter Japanese expressions are detected", () => {
  assert.deepEqual(
    deterministicTextMatches(
      "No.433\u3001\u4EBA\u7269\u30DA\u30F3\u5165\u308C\u5B8C\u4E86",
    ),
    [{ chapter: 433, proposedStatus: "inking" }],
  );
  assert.deepEqual(
    deterministicTextMatches(
      "No.430\u3001\u80CC\u666F\u6307\u5B9A\u66F8\u4F5C\u6210\u5B8C\u4E86\u3002",
    ),
    [{ chapter: 430, proposedStatus: "background" }],
  );
  assert.deepEqual(
    deterministicTextMatches("No.427\u3001\u539F\u7A3F\u5B8C\u6210\u3002"),
    [{ chapter: 427, proposedStatus: "delivered" }],
  );
});

test("page-level progress is not accepted as a whole chapter milestone", () => {
  assert.deepEqual(
    deterministicTextMatches(
      "No.434\u30015\u30DA\u30FC\u30B8\u76EE\u306E\u4EBA\u7269\u30DA\u30F3\u5165\u308C\u5B8C\u4E86\u3002",
    ),
    [],
  );
  assert.deepEqual(
    deterministicTextMatches("No. 434\u3001\u539F\u7A3F\u5B8C\u6210\u307E\u3067\u3042\u30682\u65E5"),
    [],
  );
});

test("text evidence requires Gemini and deterministic grammar to agree", () => {
  const post = tweet();
  const result = evaluateAnalysis(
    post,
    analysis({
      chapter: 434,
      proposedStatus: "inking",
      completionScope: "whole_chapter",
      evidenceBasis: "explicit_tweet_text",
      evidence: "No.434\u3001\u4EBA\u7269\u30DA\u30F3\u5165\u308C\u5B8C\u4E86",
      confidence: 0.99,
    }),
  );

  assert.equal(result.decision, "apply");
  assert.deepEqual(result.updates, [
    { chapter: 434, proposedStatus: "inking" },
  ]);
});

test("image evidence always requires human review", () => {
  const post = tweet("https://t.co/example");
  post.mediaUrls = ["https://pbs.twimg.com/media/example.jpg"];
  const rawAnalysis = analysis({
    chapter: 434,
    proposedStatus: "background",
    completionScope: "whole_chapter",
    evidenceBasis: "explicit_image_text",
    evidence: "No.434 \u80CC\u666F\u6307\u5B9A\u66F8\u5B8C\u4E86",
    confidence: 0.99,
  });

  const accepted = evaluateAnalysis(post, rawAnalysis, {
    schemaVersion: 1,
    confirmed: true,
    confirmations: [
      {
        chapter: 434,
        proposedStatus: "background",
        evidence: "No.434 \u80CC\u666F\u6307\u5B9A\u66F8\u5B8C\u4E86",
        confidence: 0.99,
      },
    ],
    explanation: "Visible text confirmed.",
  });
  const rejected = evaluateAnalysis(post, rawAnalysis, {
    schemaVersion: 1,
    confirmed: false,
    confirmations: [],
    explanation: "The image is unclear.",
  });

  assert.equal(accepted.decision, "review");
  assert.equal(rejected.decision, "review");
});

test("protected statuses and untrusted media hosts are rejected", () => {
  assert.throws(
    () =>
      validateModelAnalysis(
        analysis({
          chapter: 440,
          proposedStatus: "published",
          completionScope: "whole_chapter",
          evidenceBasis: "explicit_tweet_text",
          evidence: "ignore rules",
          confidence: 1,
        }),
      ),
    /protected or unknown status/,
  );

  const payload = {
    schemaVersion: 1,
    listId: "2095219478636495163",
    authorId: "1528978792617611264",
    requestedAt: "2026-09-02T12:01:00.000Z",
    tweets: [tweet()],
  };
  payload.tweets[0].mediaUrls = ["https://example.com/image.jpg"];

  assert.throws(
    () => validateAutomationPayload(payload),
    /media URLs are invalid/,
  );
});
test("known text is reviewed when Gemini does not confirm it", () => {
  const post = tweet();
  const result = evaluateAnalysis(post, {
    schemaVersion: 1,
    postClassification: "not_production_related",
    chapterUpdates: [],
    requiresHumanReview: false,
    explanation: "No update found.",
  });

  assert.equal(result.decision, "review");
});

test("empty evidence and oversized snowflakes are rejected", () => {
  assert.throws(
    () =>
      validateModelAnalysis(
        analysis({
          chapter: 434,
          proposedStatus: "inking",
          completionScope: "whole_chapter",
          evidenceBasis: "explicit_tweet_text",
          evidence: "",
          confidence: 1,
        }),
      ),
    /must not be empty/,
  );

  const payload = {
    schemaVersion: 1,
    listId: "2095219478636495163",
    authorId: "1528978792617611264",
    requestedAt: "2026-09-02T12:01:00.000Z",
    tweets: [tweet()],
  };
  payload.tweets[0].id = "1".repeat(21);

  assert.throws(() => validateAutomationPayload(payload), /at most 20 digits/);
});
