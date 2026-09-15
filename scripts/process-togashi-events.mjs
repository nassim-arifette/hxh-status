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

const queuedIds = new Set((state.pendingAnalysis ?? []).map(tweet => tweet.id));
const freshTweets = [...payload.tweets]
  .filter(
    (tweet) => compareSnowflakeIds(tweet.id, state.lastProcessedTweetId) > 0 ||
      (!state.pendingVerdict && queuedIds.has(tweet.id)),
  )
  .sort((left, right) => compareSnowflakeIds(left.id, right.id));

const analyzedEvents = [];
const processingByTweetId = new Map();
const geminiModel = process.env.GEMINI_MODEL || "gemini-3.7-flash";
// Explicit model selections stay exclusive unless fallbacks are also configured.
// An empty override disables fallback; the default uses one independent quota.
const geminiFallbackModels = process.env.GEMINI_FALLBACK_MODELS === undefined
  ? (process.env.GEMINI_MODEL ? [] : ["gemini-3.5-flash"])
  : process.env.GEMINI_FALLBACK_MODELS.split(",").map(model => model.trim()).filter(Boolean);

let providerUnavailable = Boolean(state.pendingVerdict);
for (const tweet of freshTweets) {
  let result;
  try {
    if (providerUnavailable) throw new Error("Post processing is deferred.");
    result = await analyzeTweet({
      tweet,
      currentChapters: statusData.chapters,
      apiKey: process.env.GEMINI_API_KEY,
      model: geminiModel,
      fallbackModels: geminiFallbackModels,
    });
  } catch (error) {
    // Source admission is authenticated above. Enrichment failures must never
    // prevent that original text, media and link from appearing in the feed.
    providerUnavailable ||= [429, 500, 502, 503, 504].includes(error?.status) ||
      !process.env.GEMINI_API_KEY;
    console.warn(`Post ${tweet.id} published as original; processing queued for retry.`);
    result = { deferred: true, translations: null, imageTexts: [], mediaErrors: [] };
  }

  processingByTweetId.set(tweet.id, result);

  analyzedEvents.push({
    tweetId: tweet.id,
    analysis: result.analysis,
    verification: result.verification,
    deferred: result.deferred === true,
    retryEnrichment: result.mediaErrors.length > 0,
  });

  for (const mediaError of result.mediaErrors) {
    console.warn(`Media warning for ${tweet.id}: ${mediaError}`);
  }
}

const result = applyAnalyzedEvents({
  statusData,
  state,
  payload: { ...payload, tweets: freshTweets },
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

  // A retry cannot erase translations or tracker history already published.
  const existing = feed.posts.find(post => post.id === tweet.id);
  if (processing.deferred && existing) return existing;

  const post = createTogashiPost({
    tweet,
    translations: processing.translations ?? null,
    imageTexts: processing.imageTexts ?? [],
    translationModel: processing.model,
    translatedAt: payload.requestedAt,
    audit,
  });
  if (existing && post.tracker.changes.length === 0 && existing.tracker.changes.length > 0) {
    post.tracker = structuredClone(existing.tracker);
  }
  if (existing && processing.mediaErrors.length > 0) {
    const imageTexts = new Map((existing.imageTexts ?? []).map(image => [image.imageIndex, image]));
    for (const image of post.imageTexts) imageTexts.set(image.imageIndex, image);
    post.imageTexts = [...imageTexts.values()].sort((left, right) => left.imageIndex - right.imageIndex);
  }
  return post;
});
const nextFeed = mergeTogashiFeed(feed, incomingPosts);
const feedChanged = JSON.stringify(nextFeed) !== JSON.stringify(feed);

if (result.statusChanged) {
  await writeJsonAtomically(statusPath, result.statusData);
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
if (process.env.AUTOMATION_VERDICT_FILE && freshTweets.length > 0 && !state.pendingVerdict) {
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

  result.state.pendingVerdict = {
    payload,
    verdict: {
      requestedAt: new Date().toISOString(),
      revision: trackerRevision(result.statusData),
      posts,
      milestones: trackerMilestones(statusData, result.statusData),
    },
  };
  result.stateChanged = true;
}

if (result.state.pendingVerdict && process.env.AUTOMATION_VERDICT_FILE) {
  await writeJsonAtomically(process.env.AUTOMATION_VERDICT_FILE, result.state.pendingVerdict.verdict);
  await setOutput("verdict_written", "true");
}

if (result.stateChanged) {
  const stateBytes = () => Buffer.byteLength(`${JSON.stringify(result.state, null, 2)}\n`, "utf8");
  // Keep originals in the archive even when a long outage fills the retry queue.
  // Budget the actual file bytes, including the pending notification verdict.
  while (stateBytes() > 100_000 && result.state.pendingAnalysis?.length) {
    result.state.pendingAnalysis.shift();
  }
  while (stateBytes() > 100_000 && result.state.recentEvents.length > 1) {
    result.state.recentEvents.shift();
  }
  while (stateBytes() > 100_000 && result.state.pendingReviews.length > 1) {
    result.state.pendingReviews.shift();
  }
  if (stateBytes() > 100_000) {
    throw new Error("Automation state exceeds the GitHub reader safety limit.");
  }
  await writeJsonAtomically(statePath, result.state);
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
