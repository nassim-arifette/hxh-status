import {
  PUBLIC_TRANSLATION_LOCALES,
  TOGASHI_SCREEN_NAME,
  TOGASHI_USER_ID,
  TRACKER_STATUSES,
  assertSnowflakeId,
  canonicalTweetUrl,
  compareSnowflakeIds,
  isAllowedMediaUrl,
  validateTweetTranslations,
  validateImageTexts,
} from "./contracts.mjs";

export const TOGASHI_FEED_SCHEMA_VERSION = 1;
export const MAX_PUBLIC_TOGASHI_POSTS = 50;

const DECISIONS = ["apply", "ignore", "review"];
const TRANSLATION_PROVIDERS = ["gemini", "manual"];
const unsupportedControls = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactKeys(value, keys, label) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();

  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new Error(`${label} contains unexpected or missing fields.`);
  }
}

function assertText(value, label, maxLength = 10_000) {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > maxLength ||
    unsupportedControls.test(value)
  ) {
    throw new Error(`${label} is invalid.`);
  }
}

function assertTimestamp(value, label) {
  if (
    typeof value !== "string" ||
    Number.isNaN(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new Error(`${label} must be an ISO timestamp.`);
  }
}

function validateTranslation(value, originalText, label) {
  if (!isObject(value)) throw new Error(`${label} must be an object.`);

  assertExactKeys(
    value,
    ["status", "provider", "model", "generatedAt", "texts"],
    label,
  );

  if (value.status === "unavailable") {
    if (
      value.provider !== null ||
      value.model !== null ||
      value.generatedAt !== null ||
      value.texts !== null
    ) {
      throw new Error(`${label} unavailable state must contain only null data.`);
    }
    return value;
  }

  if (
    value.status !== "available" ||
    !TRANSLATION_PROVIDERS.includes(value.provider)
  ) {
    throw new Error(`${label} has an invalid status or provider.`);
  }

  if (value.provider === "gemini") {
    assertText(value.model, `${label}.model`, 100);
  } else if (value.model !== null) {
    throw new Error(`${label}.model must be null for a manual translation.`);
  }

  assertTimestamp(value.generatedAt, `${label}.generatedAt`);
  validateTweetTranslations(value.texts, originalText);
  return value;
}

function validateTracker(value, label) {
  if (!isObject(value)) throw new Error(`${label} must be an object.`);
  assertExactKeys(value, ["decision", "changes"], label);

  if (!DECISIONS.includes(value.decision) || !Array.isArray(value.changes)) {
    throw new Error(`${label} contains invalid values.`);
  }

  if (value.changes.length > 5) {
    throw new Error(`${label}.changes contains too many items.`);
  }

  for (const [index, change] of value.changes.entries()) {
    if (!isObject(change)) {
      throw new Error(`${label}.changes[${index}] must be an object.`);
    }
    assertExactKeys(
      change,
      ["chapter", "from", "to"],
      `${label}.changes[${index}]`,
    );

    if (
      !Number.isInteger(change.chapter) ||
      change.chapter < 1 ||
      !TRACKER_STATUSES.includes(change.from) ||
      !TRACKER_STATUSES.includes(change.to)
    ) {
      throw new Error(`${label}.changes[${index}] contains invalid values.`);
    }
  }

  if (value.decision !== "apply" && value.changes.length > 0) {
    throw new Error(`${label} cannot contain changes for this decision.`);
  }

  return value;
}

export function validateTogashiPost(value, label = "Togashi post") {
  if (!isObject(value)) throw new Error(`${label} must be an object.`);
  assertExactKeys(
    value,
    [
      "id",
      "author",
      "createdAt",
      "url",
      "originalText",
      "mediaUrls",
      "translation",
      "tracker",
      ...(Object.hasOwn(value, "imageTexts") ? ["imageTexts"] : []),
    ],
    label,
  );

  assertSnowflakeId(value.id, `${label}.id`);
  assertTimestamp(value.createdAt, `${label}.createdAt`);
  if (value.url !== canonicalTweetUrl(value.id)) {
    throw new Error(`${label}.url is not canonical.`);
  }
  assertText(value.originalText, `${label}.originalText`);

  if (!isObject(value.author)) throw new Error(`${label}.author is invalid.`);
  assertExactKeys(value.author, ["id", "name", "screenName"], `${label}.author`);
  if (
    value.author.id !== TOGASHI_USER_ID ||
    value.author.screenName !== TOGASHI_SCREEN_NAME ||
    value.author.name !== "Yoshihiro Togashi"
  ) {
    throw new Error(`${label}.author does not identify Yoshihiro Togashi.`);
  }

  if (
    !Array.isArray(value.mediaUrls) ||
    value.mediaUrls.length > 4 ||
    value.mediaUrls.some((url) => !isAllowedMediaUrl(url))
  ) {
    throw new Error(`${label}.mediaUrls is invalid.`);
  }

  validateTranslation(value.translation, value.originalText, `${label}.translation`);
  validateImageTexts(value.imageTexts ?? [], value.mediaUrls.map((_, index) => index + 1));
  validateTracker(value.tracker, `${label}.tracker`);
  return value;
}

export function validateTogashiFeed(value) {
  if (!isObject(value)) throw new Error("Togashi feed must be an object.");
  assertExactKeys(value, ["schemaVersion", "posts"], "Togashi feed");

  if (
    value.schemaVersion !== TOGASHI_FEED_SCHEMA_VERSION ||
    !Array.isArray(value.posts) ||
    value.posts.length > MAX_PUBLIC_TOGASHI_POSTS
  ) {
    throw new Error("Togashi feed has invalid top-level values.");
  }

  const ids = new Set();
  for (const [index, post] of value.posts.entries()) {
    validateTogashiPost(post, `posts[${index}]`);
    if (ids.has(post.id)) throw new Error("Togashi feed contains duplicate IDs.");
    ids.add(post.id);

    if (
      index > 0 &&
      compareSnowflakeIds(value.posts[index - 1].id, post.id) <= 0
    ) {
      throw new Error("Togashi feed posts must be newest first.");
    }
  }

  return value;
}

export function createTogashiPost({
  tweet,
  translations,
  imageTexts = [],
  translationModel,
  translatedAt,
  audit,
}) {
  const hasTranslations = translations !== null;
  const post = {
    id: tweet.id,
    author: {
      id: TOGASHI_USER_ID,
      name: "Yoshihiro Togashi",
      screenName: TOGASHI_SCREEN_NAME,
    },
    createdAt: tweet.createdAt,
    url: canonicalTweetUrl(tweet.id),
    originalText: tweet.fullText,
    mediaUrls: [...tweet.mediaUrls],
    imageTexts,
    translation: hasTranslations
      ? {
          status: "available",
          provider: "gemini",
          model: translationModel,
          generatedAt: translatedAt,
          texts: Object.fromEntries(
            PUBLIC_TRANSLATION_LOCALES.map((locale) => [
              locale,
              translations[locale],
            ]),
          ),
        }
      : {
          status: "unavailable",
          provider: null,
          model: null,
          generatedAt: null,
          texts: null,
        },
    tracker: {
      decision: audit.decision,
      changes: audit.changes.map(({ chapter, from, to }) => ({
        chapter,
        from,
        to,
      })),
    },
  };

  return validateTogashiPost(post);
}

export function mergeTogashiFeed(rawFeed, incomingPosts) {
  const feed = validateTogashiFeed(rawFeed);
  if (!Array.isArray(incomingPosts)) {
    throw new Error("Incoming Togashi posts must be an array.");
  }

  const postsById = new Map(feed.posts.map((post) => [post.id, post]));
  for (const [index, post] of incomingPosts.entries()) {
    postsById.set(post.id, validateTogashiPost(post, `incomingPosts[${index}]`));
  }

  const posts = [...postsById.values()]
    .sort((left, right) => compareSnowflakeIds(right.id, left.id))
    .slice(0, MAX_PUBLIC_TOGASHI_POSTS);

  return validateTogashiFeed({
    schemaVersion: TOGASHI_FEED_SCHEMA_VERSION,
    posts,
  });
}
