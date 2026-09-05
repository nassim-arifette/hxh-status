export const AUTOMATION_SCHEMA_VERSION = 1;
export const TOGASHI_USER_ID = "1528978792617611264";
export const TOGASHI_SCREEN_NAME = "Un4v5s8bgsVk9Xp";
export const TOGASHI_SOURCE_LABEL = "Yoshihiro Togashi on X";
export const AUTO_STATUSES = ["inking", "background", "delivered"];
export const PUBLIC_TRANSLATION_LOCALES = [
  "ar",
  "en",
  "es",
  "fr",
  "ja",
  "pt",
  "zh",
];

// The tracker's full vocabulary, ordered from "nothing confirmed" to "readable
// now". Every consumer ranks statuses off this one list so a milestone means
// the same thing in the reducer, the notifier and the site.
export const TRACKER_STATUSES = [
  "unknown",
  "inking",
  "background",
  "delivered",
  "scheduled",
  "published",
];

export const STATUS_RANK = Object.freeze(
  Object.fromEntries(TRACKER_STATUSES.map((status, rank) => [status, rank])),
);
export const MIN_AUTO_CONFIDENCE = 0.98;

const CLASSIFICATIONS = [
  "confirmed_chapter_stage",
  "partial_production_progress",
  "not_production_related",
  "ambiguous",
];

const COMPLETION_SCOPES = ["whole_chapter", "partial", "unclear"];
const EVIDENCE_BASES = [
  "explicit_tweet_text",
  "explicit_image_text",
  "visual_inference",
  "inference",
];

const stagePatterns = [
  {
    status: "inking",
    pattern:
      /No\.?\s*(\d{3})(?:[\u3001,:]|\s)+\u4EBA\u7269\u30DA\u30F3\u5165\u308C\u5B8C\u4E86(?=$|[\s\u3001\u3002!\uFF01?\uFF1F])/gu,
  },
  {
    status: "background",
    pattern:
      /No\.?\s*(\d{3})(?:[\u3001,:]|\s)+\u80CC\u666F\u6307\u5B9A\u66F8(?:\u4F5C\u6210)?\u5B8C\u4E86(?=$|[\s\u3001\u3002!\uFF01?\uFF1F])/gu,
  },
  {
    status: "delivered",
    pattern:
      /No\.?\s*(\d{3})(?:[\u3001,:]|\s)+\u539F\u7A3F\u5B8C\u6210(?=$|[\s\u3001\u3002!\uFF01?\uFF1F])/gu,
  },
];

export const analysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    schemaVersion: { type: "integer", enum: [AUTOMATION_SCHEMA_VERSION] },
    postClassification: { type: "string", enum: CLASSIFICATIONS },
    chapterUpdates: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          chapter: { type: "integer", minimum: 1 },
          proposedStatus: { type: "string", enum: AUTO_STATUSES },
          completionScope: { type: "string", enum: COMPLETION_SCOPES },
          evidenceBasis: { type: "string", enum: EVIDENCE_BASES },
          evidence: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
        required: [
          "chapter",
          "proposedStatus",
          "completionScope",
          "evidenceBasis",
          "evidence",
          "confidence",
        ],
      },
    },
    requiresHumanReview: { type: "boolean" },
    explanation: { type: "string" },
  },
  required: [
    "schemaVersion",
    "postClassification",
    "chapterUpdates",
    "requiresHumanReview",
    "explanation",
  ],
};

const translationsSchema = {
  type: "object",
  additionalProperties: false,
  properties: Object.fromEntries(
    PUBLIC_TRANSLATION_LOCALES.map((locale) => [
      locale,
      { type: "string", minLength: 1, maxLength: 10_000 },
    ]),
  ),
  required: PUBLIC_TRANSLATION_LOCALES,
};

// Analysis and translation deliberately share one model request. The reducer
// still consumes only `analysis`, while the other branch is validated and
// persisted for the public feed. API traffic never reaches Gemini.
export const tweetProcessingSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    analysis: analysisSchema,
    translations: translationsSchema,
  },
  required: ["analysis", "translations"],
};

export const imageVerificationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    schemaVersion: { type: "integer", enum: [AUTOMATION_SCHEMA_VERSION] },
    confirmed: { type: "boolean" },
    confirmations: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          chapter: { type: "integer", minimum: 1 },
          proposedStatus: { type: "string", enum: AUTO_STATUSES },
          evidence: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
        required: ["chapter", "proposedStatus", "evidence", "confidence"],
      },
    },
    explanation: { type: "string" },
  },
  required: ["schemaVersion", "confirmed", "confirmations", "explanation"],
};

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

function assertString(value, label, maxLength = 10_000) {
  if (typeof value !== "string" || value.length > maxLength) {
    throw new Error(
      `${label} must be a string no longer than ${maxLength} characters.`,
    );
  }
}

export function assertSnowflakeId(value, label = "Tweet ID") {
  if (typeof value !== "string" || !/^\d{1,20}$/.test(value)) {
    throw new Error(`${label} must be a decimal string of at most 20 digits.`);
  }
}

function assertNonEmptyString(value, label, maxLength) {
  assertString(value, label, maxLength);
  if (value.trim().length === 0) {
    throw new Error(`${label} must not be empty.`);
  }
}

function preservedTranslationTokens(value) {
  return (
    String(value).match(
      /https?:\/\/[^\s]+|@[A-Za-z0-9_]{1,15}|#[\p{L}\p{N}_]+|\d+(?:[.,]\d+)?/gu,
    ) ?? []
  );
}

export function validateTweetTranslations(value, sourceText) {
  if (!isObject(value)) {
    throw new Error("Tweet translations must be an object.");
  }

  assertExactKeys(value, PUBLIC_TRANSLATION_LOCALES, "Tweet translations");
  assertString(sourceText, "Tweet source text");

  const requiredTokens = [...new Set(preservedTranslationTokens(sourceText))];

  for (const locale of PUBLIC_TRANSLATION_LOCALES) {
    const translation = value[locale];
    assertNonEmptyString(translation, `translations.${locale}`, 10_000);

    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(translation)) {
      throw new Error(`translations.${locale} contains control characters.`);
    }

    for (const token of requiredTokens) {
      if (!translation.includes(token)) {
        throw new Error(
          `translations.${locale} does not preserve source token ${token}.`,
        );
      }
    }
  }

  if (value.ja !== sourceText) {
    throw new Error("translations.ja must preserve the original post exactly.");
  }

  return value;
}

export function validateTweetProcessing(value, sourceText) {
  if (!isObject(value)) {
    throw new Error("Gemini processing result must be an object.");
  }

  assertExactKeys(
    value,
    ["analysis", "translations"],
    "Gemini processing result",
  );

  return {
    analysis: validateModelAnalysis(value.analysis),
    translations: validateTweetTranslations(value.translations, sourceText),
  };
}

export function compareSnowflakeIds(left, right) {
  assertSnowflakeId(left, "Left tweet ID");
  assertSnowflakeId(right, "Right tweet ID");

  const normalizedLeft = left.replace(/^0+/, "") || "0";
  const normalizedRight = right.replace(/^0+/, "") || "0";

  if (normalizedLeft.length !== normalizedRight.length) {
    return normalizedLeft.length - normalizedRight.length;
  }

  return normalizedLeft.localeCompare(normalizedRight);
}

export function canonicalTweetUrl(tweetId) {
  assertSnowflakeId(tweetId);
  return `https://x.com/${TOGASHI_SCREEN_NAME}/status/${tweetId}`;
}

export function isAllowedMediaUrl(value) {
  if (typeof value !== "string" || value.length > 1_000) return false;

  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "pbs.twimg.com" &&
      url.pathname.startsWith("/media/")
    );
  } catch {
    return false;
  }
}

export function normalizeEvidenceText(value) {
  return String(value).normalize("NFKC").replace(/\s+/gu, " ").trim();
}

export function deterministicTextMatches(fullText) {
  const normalized = normalizeEvidenceText(fullText);
  const matches = [];

  for (const { status, pattern } of stagePatterns) {
    for (const match of normalized.matchAll(new RegExp(pattern))) {
      matches.push({ chapter: Number(match[1]), proposedStatus: status });
    }
  }

  return matches;
}

export function validateAutomationPayload(value) {
  if (!isObject(value)) throw new Error("Automation payload must be an object.");

  assertExactKeys(
    value,
    ["schemaVersion", "listId", "authorId", "requestedAt", "tweets"],
    "Automation payload",
  );

  if (value.schemaVersion !== AUTOMATION_SCHEMA_VERSION) {
    throw new Error("Unsupported automation payload version.");
  }

  assertSnowflakeId(value.listId, "List ID");

  if (value.authorId !== TOGASHI_USER_ID) {
    throw new Error("Unexpected X author ID.");
  }

  assertString(value.requestedAt, "requestedAt", 50);
  if (Number.isNaN(Date.parse(value.requestedAt))) {
    throw new Error("requestedAt must be a valid timestamp.");
  }

  if (!Array.isArray(value.tweets) || value.tweets.length > 5) {
    throw new Error("tweets must be an array containing at most five posts.");
  }

  const seenIds = new Set();

  for (const [index, tweet] of value.tweets.entries()) {
    if (!isObject(tweet)) {
      throw new Error(`tweets[${index}] must be an object.`);
    }

    assertExactKeys(
      tweet,
      [
        "id",
        "authorId",
        "screenName",
        "createdAt",
        "url",
        "fullText",
        "mediaUrls",
      ],
      `tweets[${index}]`,
    );

    assertSnowflakeId(tweet.id, `tweets[${index}].id`);
    if (seenIds.has(tweet.id)) throw new Error("Duplicate tweet ID in payload.");
    seenIds.add(tweet.id);

    if (tweet.authorId !== TOGASHI_USER_ID) {
      throw new Error("Tweet author ID does not match Togashi.");
    }

    if (
      typeof tweet.screenName !== "string" ||
      tweet.screenName.toLowerCase() !== TOGASHI_SCREEN_NAME.toLowerCase()
    ) {
      throw new Error("Tweet screen name does not match Togashi.");
    }

    assertString(tweet.createdAt, `tweets[${index}].createdAt`, 50);
    if (Number.isNaN(Date.parse(tweet.createdAt))) {
      throw new Error("Tweet createdAt must be a valid timestamp.");
    }

    if (tweet.url !== canonicalTweetUrl(tweet.id)) {
      throw new Error("Tweet URL is not canonical.");
    }

    assertString(tweet.fullText, `tweets[${index}].fullText`);
    if (
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(tweet.fullText)
    ) {
      throw new Error("Tweet text contains unsupported control characters.");
    }

    const snowflakeCreatedAt =
      Number(BigInt(tweet.id) >> 22n) + 1_288_834_974_657;
    if (Math.abs(Date.parse(tweet.createdAt) - snowflakeCreatedAt) > 604_800_000) {
      throw new Error("Tweet ID and createdAt are inconsistent.");
    }

    if (
      !Array.isArray(tweet.mediaUrls) ||
      tweet.mediaUrls.length > 4 ||
      tweet.mediaUrls.some((url) => !isAllowedMediaUrl(url))
    ) {
      throw new Error("Tweet media URLs are invalid.");
    }
  }

  return value;
}

export function validateModelAnalysis(value) {
  if (!isObject(value)) throw new Error("Gemini analysis must be an object.");

  assertExactKeys(
    value,
    [
      "schemaVersion",
      "postClassification",
      "chapterUpdates",
      "requiresHumanReview",
      "explanation",
    ],
    "Gemini analysis",
  );

  if (value.schemaVersion !== AUTOMATION_SCHEMA_VERSION) {
    throw new Error("Unsupported Gemini analysis version.");
  }

  if (!CLASSIFICATIONS.includes(value.postClassification)) {
    throw new Error("Unknown post classification.");
  }

  if (!Array.isArray(value.chapterUpdates) || value.chapterUpdates.length > 5) {
    throw new Error("chapterUpdates must contain at most five items.");
  }

  if (typeof value.requiresHumanReview !== "boolean") {
    throw new Error("requiresHumanReview must be a boolean.");
  }

  assertNonEmptyString(value.explanation, "explanation", 800);
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value.explanation)) {
    throw new Error("Gemini explanation contains control characters.");
  }

  for (const [index, update] of value.chapterUpdates.entries()) {
    if (!isObject(update)) {
      throw new Error(`chapterUpdates[${index}] must be an object.`);
    }

    assertExactKeys(
      update,
      [
        "chapter",
        "proposedStatus",
        "completionScope",
        "evidenceBasis",
        "evidence",
        "confidence",
      ],
      `chapterUpdates[${index}]`,
    );

    if (!Number.isInteger(update.chapter) || update.chapter < 1) {
      throw new Error("Gemini returned an invalid chapter number.");
    }

    if (!AUTO_STATUSES.includes(update.proposedStatus)) {
      throw new Error("Gemini returned a protected or unknown status.");
    }

    if (!COMPLETION_SCOPES.includes(update.completionScope)) {
      throw new Error("Gemini returned an invalid completion scope.");
    }

    if (!EVIDENCE_BASES.includes(update.evidenceBasis)) {
      throw new Error("Gemini returned an invalid evidence basis.");
    }

    assertNonEmptyString(update.evidence, "evidence", 300);
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(update.evidence)) {
      throw new Error("Gemini evidence contains control characters.");
    }

    if (
      typeof update.confidence !== "number" ||
      update.confidence < 0 ||
      update.confidence > 1
    ) {
      throw new Error("Gemini returned an invalid confidence.");
    }
  }

  return value;
}

export function validateImageVerification(value) {
  if (!isObject(value)) throw new Error("Image verification must be an object.");

  assertExactKeys(
    value,
    ["schemaVersion", "confirmed", "confirmations", "explanation"],
    "Image verification",
  );

  if (
    value.schemaVersion !== AUTOMATION_SCHEMA_VERSION ||
    typeof value.confirmed !== "boolean" ||
    !Array.isArray(value.confirmations) ||
    value.confirmations.length > 5
  ) {
    throw new Error("Image verification has invalid top-level values.");
  }

  assertNonEmptyString(value.explanation, "verification explanation", 800);

  for (const confirmation of value.confirmations) {
    if (!isObject(confirmation)) {
      throw new Error("Invalid image confirmation.");
    }

    assertExactKeys(
      confirmation,
      ["chapter", "proposedStatus", "evidence", "confidence"],
      "Image confirmation",
    );

    if (
      !Number.isInteger(confirmation.chapter) ||
      confirmation.chapter < 1 ||
      !AUTO_STATUSES.includes(confirmation.proposedStatus) ||
      typeof confirmation.confidence !== "number" ||
      confirmation.confidence < 0 ||
      confirmation.confidence > 1
    ) {
      throw new Error("Image confirmation contains invalid values.");
    }

    assertNonEmptyString(
      confirmation.evidence,
      "image confirmation evidence",
      300,
    );
  }

  return value;
}

export function evaluateAnalysis(tweet, rawAnalysis) {
  const analysis = validateModelAnalysis(rawAnalysis);
  const review = (reason) => ({
    decision: "review",
    reason,
    updates: [],
  });
  const textMatches = deterministicTextMatches(tweet.fullText);

  if (analysis.postClassification !== "confirmed_chapter_stage") {
    if (analysis.chapterUpdates.length > 0) {
      return review("Non-confirmed classifications cannot contain updates.");
    }

    if (textMatches.length > 0) {
      return review(
        "Deterministic post text and Gemini classification did not agree.",
      );
    }

    if (
      analysis.postClassification === "ambiguous" ||
      analysis.requiresHumanReview
    ) {
      return review(
        analysis.explanation || "Gemini marked the post as ambiguous.",
      );
    }

    return {
      decision: "ignore",
      reason:
        analysis.explanation || "No completed production stage detected.",
      updates: [],
    };
  }

  if (analysis.requiresHumanReview || analysis.chapterUpdates.length === 0) {
    return review(
      "Confirmed classifications require unambiguous chapter updates.",
    );
  }

  const chapters = new Set();
  const imageUpdates = analysis.chapterUpdates.filter(
    (update) => update.evidenceBasis === "explicit_image_text",
  );
  if (imageUpdates.length > 0) {
    return review("Image-only milestones require human review.");
  }

  const modelTextMilestones = analysis.chapterUpdates.filter(
    (update) => update.evidenceBasis === "explicit_tweet_text",
  );
  const missedDeterministicMilestone = textMatches.some(
    (match) =>
      !modelTextMilestones.some(
        (update) =>
          update.chapter === match.chapter &&
          update.proposedStatus === match.proposedStatus,
      ),
  );

  if (
    modelTextMilestones.length !== textMatches.length ||
    missedDeterministicMilestone
  ) {
    return review(
      "Deterministic post text and Gemini milestones did not agree exactly.",
    );
  }

  for (const update of analysis.chapterUpdates) {
    if (chapters.has(update.chapter)) {
      return review("Gemini returned multiple updates for the same chapter.");
    }
    chapters.add(update.chapter);

    if (
      update.completionScope !== "whole_chapter" ||
      update.confidence < MIN_AUTO_CONFIDENCE
    ) {
      return review(
        "The whole chapter milestone was not confirmed with enough confidence.",
      );
    }

    if (update.evidenceBasis === "explicit_tweet_text") {
      const normalizedEvidence = normalizeEvidenceText(update.evidence);
      const normalizedTweet = normalizeEvidenceText(tweet.fullText);
      const hasExactEvidence =
        normalizedEvidence.length > 0 &&
        normalizedTweet.includes(normalizedEvidence);
      const hasKnownPattern = textMatches.some(
        (match) =>
          match.chapter === update.chapter &&
          match.proposedStatus === update.proposedStatus,
      );

      if (!hasExactEvidence || !hasKnownPattern) {
        return review(
          "Tweet text does not match a known completed-stage expression.",
        );
      }
    } else {
      return review(
        "Inferred or purely visual milestones are never applied automatically.",
      );
    }
  }

  return {
    decision: "apply",
    reason: analysis.explanation,
    updates: analysis.chapterUpdates.map(({ chapter, proposedStatus }) => ({
      chapter,
      proposedStatus,
    })),
  };
}
