import {
  TOGASHI_SCREEN_NAME,
  TOGASHI_USER_ID,
  canonicalTweetUrl,
  compareSnowflakeIds,
  isAllowedMediaUrl,
} from "../automation/contracts.mjs";

const MAX_TIMELINE_BYTES = 2_000_000;
const TIMELINE_TIMEOUT_MS = 15_000;

async function readTextWithLimit(response, maxBytes) {
  const declaredSize = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredSize) && declaredSize > maxBytes) {
    throw new Error("X timeline response exceeded the safety size limit.");
  }

  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) {
      throw new Error("X timeline response exceeded the safety size limit.");
    }
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new Error("X timeline response exceeded the safety size limit.");
      }
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }

  return text + decoder.decode();
}

export async function fetchTimelineTweets(
  { listId, expectedUserId = TOGASHI_USER_ID },
  fetchImpl = fetch,
) {
  const timelineUrl =
    "https://syndication.twitter.com/srv/timeline-list/list-id/" +
    `${listId}?lang=ja&dnt=true`;
  const response = await fetchImpl(timelineUrl, {
    headers: {
      Accept: "text/html",
      "User-Agent": "hxhstatus-automation/1.0",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(TIMELINE_TIMEOUT_MS),
  });

  if (!response.ok) {
    const reset = response.headers.get("x-rate-limit-reset");
    throw new Error(
      `X timeline request failed (${response.status})` +
        (reset ? `; rate limit resets at ${reset}` : ""),
    );
  }

  const html = await readTextWithLimit(response, MAX_TIMELINE_BYTES);
  return parseTimelineHtml(html, { expectedUserId });
}
function extractNextData(html) {
  if (typeof html !== "string") {
    throw new Error("X timeline response must be HTML.");
  }

  const match = html.match(
    /<script\b[^>]*\bid=(["'])__NEXT_DATA__\1[^>]*>([\s\S]*?)<\/script>/i,
  );

  if (!match) {
    throw new Error("X timeline response is missing __NEXT_DATA__.");
  }

  const data = JSON.parse(match[2]);
  const entries = data?.props?.pageProps?.timeline?.entries;

  if (!Array.isArray(entries)) {
    throw new Error("X timeline response has no entries array.");
  }

  return entries;
}

function mediaUrls(tweet) {
  const candidates = [
    ...(tweet.extended_entities?.media ?? []),
    ...(tweet.entities?.media ?? []),
  ];

  return [
    ...new Set(
      candidates
        .filter((media) => media?.type === "photo")
        .map((media) => media.media_url_https)
        .filter(isAllowedMediaUrl),
    ),
  ].slice(0, 4);
}

function isOriginalPost(tweet) {
  const text = tweet.full_text ?? tweet.text ?? "";

  return (
    !tweet.retweeted_status &&
    !/^RT\s+@/i.test(text) &&
    tweet.in_reply_to_status_id_str == null &&
    tweet.in_reply_to_user_id_str == null
  );
}

export function parseTimelineHtml(
  html,
  {
    expectedUserId = TOGASHI_USER_ID,
    expectedScreenName = TOGASHI_SCREEN_NAME,
  } = {},
) {
  const tweetsById = new Map();

  for (const entry of extractNextData(html)) {
    const tweet = entry?.type === "tweet" ? entry.content?.tweet : null;
    const id = tweet?.id_str;
    const user = tweet?.user;

    if (
      typeof id !== "string" ||
      !/^\d+$/.test(id) ||
      user?.id_str !== expectedUserId ||
      user?.screen_name?.toLowerCase() !== expectedScreenName.toLowerCase() ||
      !isOriginalPost(tweet)
    ) {
      continue;
    }

    const timestamp = Date.parse(tweet.created_at);
    if (Number.isNaN(timestamp)) continue;

    const fullText = String(tweet.full_text ?? tweet.text ?? "");
    if (fullText.length > 10_000) {
      throw new Error("X post text exceeded the safety size limit.");
    }

    tweetsById.set(id, {
      id,
      authorId: expectedUserId,
      screenName: expectedScreenName,
      createdAt: new Date(timestamp).toISOString(),
      url: canonicalTweetUrl(id),
      fullText,
      mediaUrls: mediaUrls(tweet),
    });
  }

  const tweets = [...tweetsById.values()].sort((left, right) =>
    compareSnowflakeIds(left.id, right.id),
  );

  if (tweets.length === 0) {
    throw new Error("X timeline returned no valid original Togashi posts.");
  }

  return tweets;
}

export function selectUnseenTweets(tweets, lastProcessedTweetId, limit = 5) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 5) {
    throw new Error("Tweet batch limit must be between one and five.");
  }

  const ordered = [...tweets].sort((left, right) =>
    compareSnowflakeIds(left.id, right.id),
  );
  const newest = ordered.at(-1);

  if (!newest) throw new Error("Cannot select from an empty timeline.");

  if (compareSnowflakeIds(newest.id, lastProcessedTweetId) < 0) {
    throw new Error(
      "X timeline regressed behind the repository cursor; refusing to advance.",
    );
  }

  return ordered
    .filter(
      (tweet) => compareSnowflakeIds(tweet.id, lastProcessedTweetId) > 0,
    )
    .slice(0, limit);
}
