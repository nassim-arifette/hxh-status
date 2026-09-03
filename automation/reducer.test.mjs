import test from "node:test";
import assert from "node:assert/strict";

import { canonicalTweetUrl } from "./contracts.mjs";
import { applyAnalyzedEvents } from "./reducer.mjs";

const listId = "2095219478636495163";

function state() {
  return {
    schemaVersion: 1,
    listId,
    lastProcessedTweetId: "2094673907626414299",
    lastProcessedAt: "2026-09-01T06:29:11.000Z",
    lastRunAt: null,
    recentEvents: [],
    pendingReviews: [],
  };
}

function statusData() {
  return {
    lastUpdated: "2026-09-02",
    chapters: [
      {
        chapter: 420,
        status: "scheduled",
        releaseAt: "2026-09-07T00:00:00+09:00",
        jumpIssue: "41",
      },
      { chapter: 428, status: "background" },
      { chapter: 434, status: "unknown", note: "keep this" },
    ],
  };
}

function post(id, fullText) {
  return {
    id,
    authorId: "1528978792617611264",
    screenName: "Un4v5s8bgsVk9Xp",
    createdAt: "2026-09-03T03:00:00.000Z",
    url: canonicalTweetUrl(id),
    fullText,
    mediaUrls: [],
  };
}

function payload(tweet) {
  return {
    schemaVersion: 1,
    listId,
    authorId: "1528978792617611264",
    requestedAt: "2026-09-03T03:05:00.000Z",
    tweets: [tweet],
  };
}

function analyzed(tweetId, chapter, proposedStatus, evidence) {
  return {
    tweetId,
    analysis: {
      schemaVersion: 1,
      postClassification: "confirmed_chapter_stage",
      chapterUpdates: [
        {
          chapter,
          proposedStatus,
          completionScope: "whole_chapter",
          evidenceBasis: "explicit_tweet_text",
          evidence,
          confidence: 0.99,
        },
      ],
      requiresHumanReview: false,
      explanation: "Explicit completed stage.",
    },
    verification: null,
  };
}

test("a validated milestone updates only production fields", () => {
  const evidence = "No.434\u3001\u4EBA\u7269\u30DA\u30F3\u5165\u308C\u5B8C\u4E86";
  const tweet = post("2096000000000000001", `${evidence}\u3002`);
  const result = applyAnalyzedEvents({
    statusData: statusData(),
    state: state(),
    payload: payload(tweet),
    analyzedEvents: [analyzed(tweet.id, 434, "inking", evidence)],
  });
  const chapter = result.statusData.chapters.find(
    (record) => record.chapter === 434,
  );

  assert.equal(result.statusChanged, true);
  assert.equal(chapter.status, "inking");
  assert.equal(chapter.note, "keep this");
  assert.equal(chapter.source, tweet.url);
  assert.equal(chapter.sourcePostId, tweet.id);
  assert.equal(chapter.sourcePublishedAt, tweet.createdAt);
  assert.equal(result.state.lastProcessedTweetId, tweet.id);
});

test("a regression or protected chapter is a no-op but advances the cursor", () => {
  const evidence = "No.428\u3001\u4EBA\u7269\u30DA\u30F3\u5165\u308C\u5B8C\u4E86";
  const tweet = post("2096000000000000002", evidence);
  const regression = applyAnalyzedEvents({
    statusData: statusData(),
    state: state(),
    payload: payload(tweet),
    analyzedEvents: [analyzed(tweet.id, 428, "inking", evidence)],
  });

  assert.equal(regression.statusChanged, false);
  assert.equal(regression.stateChanged, true);
  assert.equal(
    regression.statusData.chapters.find((record) => record.chapter === 428)
      .status,
    "background",
  );

  const deliveredEvidence = "No.420\u3001\u539F\u7A3F\u5B8C\u6210";
  const scheduledTweet = post("2096000000000000003", deliveredEvidence);
  const protectedResult = applyAnalyzedEvents({
    statusData: statusData(),
    state: state(),
    payload: payload(scheduledTweet),
    analyzedEvents: [
      analyzed(scheduledTweet.id, 420, "delivered", deliveredEvidence),
    ],
  });

  const chapter420 = protectedResult.statusData.chapters.find(
    (record) => record.chapter === 420,
  );
  assert.equal(chapter420.status, "scheduled");
  assert.equal(chapter420.releaseAt, "2026-09-07T00:00:00+09:00");
  assert.equal(chapter420.jumpIssue, "41");
});

test("an untracked chapter is queued for review without changing status", () => {
  const evidence = "No.441\u3001\u539F\u7A3F\u5B8C\u6210";
  const tweet = post("2096000000000000004", evidence);
  const result = applyAnalyzedEvents({
    statusData: statusData(),
    state: state(),
    payload: payload(tweet),
    analyzedEvents: [analyzed(tweet.id, 441, "delivered", evidence)],
  });

  assert.equal(result.statusChanged, false);
  assert.equal(result.reviewItems.length, 1);
  assert.equal(result.state.pendingReviews[0].tweetId, tweet.id);
});

test("replaying a cursor-covered payload is a complete no-op", () => {
  const evidence = "No.434\u3001\u4EBA\u7269\u30DA\u30F3\u5165\u308C\u5B8C\u4E86";
  const tweet = post("2096000000000000005", evidence);
  const processedState = {
    ...state(),
    lastProcessedTweetId: tweet.id,
    lastProcessedAt: tweet.createdAt,
  };
  const originalStatus = statusData();

  const result = applyAnalyzedEvents({
    statusData: originalStatus,
    state: processedState,
    payload: payload(tweet),
    analyzedEvents: [analyzed(tweet.id, 434, "inking", evidence)],
  });

  assert.equal(result.statusChanged, false);
  assert.equal(result.stateChanged, false);
  assert.deepEqual(result.statusData, originalStatus);
  assert.deepEqual(result.state, processedState);
  assert.deepEqual(result.reviewItems, []);
});
