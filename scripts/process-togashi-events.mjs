import { Buffer } from "node:buffer";
import { appendFile, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import {
  compareSnowflakeIds,
  validateAutomationPayload,
} from "../automation/contracts.mjs";
import { analyzeTweet } from "../automation/gemini.mjs";
import {
  trackerMilestones,
  trackerRevision,
} from "../automation/milestones.mjs";
import { applyAnalyzedEvents } from "../automation/reducer.mjs";
import {
  assertFreshAutomationPayload,
  verifyAutomationPayloadSignature,
} from "../automation/payload-auth.mjs";
import {
  createTogashiPost,
  mergeTogashiFeed,
  validateTogashiFeed,
} from "../automation/togashi-feed.mjs";

const root = process.cwd();
const statusPath = join(root, "app", "data", "status-data.json");
const feedPath = join(root, "app", "data", "togashi-posts.json");
const statePath = join(root, "automation", "state.json");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJsonAtomically(path, value) {
  const temporaryPath = join(
    dirname(path),
    `.${path.split(/[\\/]/).at(-1)}.${process.pid}.tmp`,
  );
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporaryPath, path);
}

async function setOutput(name, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  await appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`, "utf8");
}

function safeReviewText(value) {
  return String(value)
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/@/g, "@\u200B")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1_000);
}

function compactPushText(value) {
  const normalized = String(value).replace(/\s+/gu, " ").trim();
  const characters = Array.from(normalized);
  return characters.length > 180
    ? `${characters.slice(0, 177).join("")}…`
    : normalized;
}

function reviewMarkdown(reviewItems) {
  const lines = [
    "# Togashi post requires review",
    "",
    "The automation deliberately made no status change for the item(s) below.",
    "",
  ];

  for (const item of reviewItems) {
    lines.push(
      `## Post ${item.tweetId}`,
      "",
      `- Source: ${item.tweetUrl}`,
      `- Published: ${item.createdAt}`,
      `- Validation result: ${safeReviewText(item.reason)}`,
      `- Gemini explanation: ${safeReviewText(
        item.explanation || "None",
      )}`,
      "",
    );
  }

  return `${lines.join("\n")}\n`;
}

const rawPayload = process.env.AUTOMATION_PAYLOAD;
if (!rawPayload) throw new Error("AUTOMATION_PAYLOAD is not configured.");
if (Buffer.byteLength(rawPayload, "utf8") > 60_000) {
  throw new Error("AUTOMATION_PAYLOAD exceeds the safety size limit.");
}

const payloadSignature = process.env.AUTOMATION_PAYLOAD_SIGNATURE;
const payloadSecret = process.env.AUTOMATION_PAYLOAD_SECRET;
if (!payloadSignature || !payloadSecret) {
  throw new Error("Automation payload authentication is not configured.");
}
if (
  !(await verifyAutomationPayloadSignature(
    rawPayload,
    payloadSignature,
    payloadSecret,
  ))
) {
  throw new Error("Automation payload signature is invalid.");
}

const payload = validateAutomationPayload(JSON.parse(rawPayload));
assertFreshAutomationPayload(payload);
const [statusData, state, feed] = await Promise.all([
  readJson(statusPath),
  readJson(statePath),
  readJson(feedPath).then(validateTogashiFeed),
]);

const freshTweets = [...payload.tweets]
  .filter(
    (tweet) => compareSnowflakeIds(tweet.id, state.lastProcessedTweetId) > 0,
  )
  .sort((left, right) => compareSnowflakeIds(left.id, right.id));

const analyzedEvents = [];
const processingByTweetId = new Map();
const geminiModel = process.env.GEMINI_MODEL || "gemini-3.7-flash";

for (const tweet of freshTweets) {
  const result = await analyzeTweet({
    tweet,
    currentChapters: statusData.chapters,
    apiKey: process.env.GEMINI_API_KEY,
    model: geminiModel,
  });

  processingByTweetId.set(tweet.id, result);

  analyzedEvents.push({
    tweetId: tweet.id,
    analysis: result.analysis,
    verification: result.verification,
  });

  for (const mediaError of result.mediaErrors) {
    console.warn(`Media warning for ${tweet.id}: ${mediaError}`);
  }
}

const result = applyAnalyzedEvents({
  statusData,
  state,
  payload,
  analyzedEvents,
});

const auditByTweetId = new Map(
  result.state.recentEvents.map((event) => [event.tweetId, event]),
);
const incomingPosts = freshTweets.map((tweet) => {
  const processing = processingByTweetId.get(tweet.id);
  const audit = auditByTweetId.get(tweet.id);
  if (!processing || !audit) {
    throw new Error(`Missing public feed data for tweet ${tweet.id}.`);
  }

  return createTogashiPost({
    tweet,
    translations: processing.translations ?? null,
    translationModel: geminiModel,
    translatedAt: payload.requestedAt,
    audit,
  });
});
const nextFeed = mergeTogashiFeed(feed, incomingPosts);
const feedChanged = JSON.stringify(nextFeed) !== JSON.stringify(feed);

if (result.statusChanged) {
  await writeJsonAtomically(statusPath, result.statusData);
}

if (result.stateChanged) {
  await writeJsonAtomically(statePath, result.state);
}

if (feedChanged) {
  await writeJsonAtomically(feedPath, nextFeed);
}

if (result.reviewItems.length > 0 && process.env.AUTOMATION_REVIEW_FILE) {
  await writeFile(
    process.env.AUTOMATION_REVIEW_FILE,
    reviewMarkdown(result.reviewItems),
    "utf8",
  );
}

// The Worker is holding every post alert from this batch until it hears what
// the reducer decided. Write that verdict — including "nothing moved", which is
// what releases the post alert straight away instead of letting it time out.
if (process.env.AUTOMATION_VERDICT_FILE) {
  const posts = freshTweets.map((tweet) => {
    const processing = processingByTweetId.get(tweet.id);
    const audit = auditByTweetId.get(tweet.id);
    if (!processing || !audit) {
      throw new Error(`Missing verdict data for tweet ${tweet.id}.`);
    }

    const notification = audit.changes.length > 0 ? "milestone" : "raw";
    return {
      id: tweet.id,
      notification,
      translations:
        notification === "raw" && processing.translations
          ? Object.fromEntries(
              Object.entries(processing.translations).map(([locale, text]) => [
                locale,
                compactPushText(text),
              ]),
            )
          : null,
    };
  });

  await writeFile(
    process.env.AUTOMATION_VERDICT_FILE,
    JSON.stringify({
      requestedAt: new Date().toISOString(),
      revision: trackerRevision(result.statusData),
      posts,
      milestones: trackerMilestones(statusData, result.statusData),
    }),
    "utf8",
  );
  await setOutput("verdict_written", "true");
}

await Promise.all([
  setOutput("status_changed", String(result.statusChanged)),
  setOutput("state_changed", String(result.stateChanged)),
  setOutput("feed_changed", String(feedChanged)),
  setOutput("review_needed", String(result.reviewItems.length > 0)),
  setOutput("review_tweet_id", result.reviewItems[0]?.tweetId ?? ""),
]);

console.log(
  JSON.stringify({
    analyzed: freshTweets.length,
    statusChanged: result.statusChanged,
    stateChanged: result.stateChanged,
    feedChanged,
    reviews: result.reviewItems.length,
  }),
);
