import { readFile, writeFile, rename } from "node:fs/promises";
import { parseArgs } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { analyzeTweet } from "../automation/gemini.mjs";
import { canonicalTweetUrl, TOGASHI_USER_ID, TOGASHI_SCREEN_NAME, isAllowedMediaUrl } from "../automation/contracts.mjs";
import { createTogashiPost, mergeTogashiFeed, validateTogashiFeed } from "../automation/togashi-feed.mjs";

// A maintainer backfill, deliberately separate from the signed event runner:
// archived posts cannot change production status, cursors or visitor alerts.
const { values } = parseArgs({ options: {
  input: { type: "string" },
  since: { type: "string", default: "2026-01-01" },
  limit: { type: "string", default: "50" },
  "originals-only": { type: "boolean", default: false },
} });
const limit = Number(values.limit);
if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("limit must be 1–100");
if (!/^\d{4}-\d{2}-\d{2}$/.test(values.since) || !Number.isFinite(Date.parse(values.since))) throw new Error("Invalid since date");
try { process.loadEnvFile(".env"); } catch (error) { if (error.code !== "ENOENT") throw error; }
if (!values["originals-only"] && !process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is required");
let response;
if (values.input) response = JSON.parse(await readFile(values.input, "utf8"));
else {
  if (!process.env.X_BEARER_TOKEN) throw new Error("X_BEARER_TOKEN is required");
  const url = new URL(`https://api.x.com/2/users/${TOGASHI_USER_ID}/tweets`);
  url.search = new URLSearchParams({ max_results: "100", exclude: "retweets,replies", "tweet.fields": "created_at,author_id,attachments", expansions: "attachments.media_keys", "media.fields": "url,type" }).toString();
  const result = await fetch(url, { headers: { Authorization: `Bearer ${process.env.X_BEARER_TOKEN}` }, signal: AbortSignal.timeout(25000) });
  if (!result.ok) throw new Error(`X archive request returned HTTP ${result.status}`);
  response = await result.json();
}
if (!Array.isArray(response.data) || response.errors?.length) throw new Error("Incomplete X API response");
const media = new Map((response.includes?.media ?? []).map(item => [item.media_key, item]));
const posts = response.data.filter(post => post.created_at >= values.since).slice(0, limit);
const feedPath = "app/data/togashi-posts.json";
let feed = validateTogashiFeed(JSON.parse(await readFile(feedPath, "utf8")));
const status = JSON.parse(await readFile("app/data/status-data.json", "utf8"));
let imported = 0;
const failures = [];
for (const post of posts) {
  if (post.author_id !== TOGASHI_USER_ID) throw new Error("Unexpected post author");
  if (feed.posts.some(existing => existing.id === post.id && existing.translation.status === "available")) continue;
  const tweet = {
    id: post.id, authorId: post.author_id, screenName: TOGASHI_SCREEN_NAME,
    createdAt: new Date(post.created_at).toISOString(), url: canonicalTweetUrl(post.id), fullText: post.text,
    mediaUrls: (post.attachments?.media_keys ?? []).map(key => media.get(key)).filter(item => item?.type === "photo" && isAllowedMediaUrl(item.url)).map(item => item.url),
  };
  try {
    const model = process.env.GEMINI_MODEL || "gemini-3.7-flash";
    if (!values["originals-only"]) await delay(13000);
    const result = values["originals-only"]
      ? { translations: null, imageTexts: [], mediaErrors: [] }
      : await analyzeTweet({ tweet, currentChapters: status.chapters, apiKey: process.env.GEMINI_API_KEY, model });
    const incoming = createTogashiPost({ tweet, translations: result.translations, imageTexts: result.imageTexts, translationModel: model, translatedAt: new Date().toISOString(), audit: { decision: "ignore", changes: [] } });
    // Re-read before every write so a concurrent automation cannot be overwritten.
    feed = mergeTogashiFeed(JSON.parse(await readFile(feedPath, "utf8")), [incoming]);
    const temporary = `${feedPath}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(feed, null, 2)}\n`);
    await rename(temporary, feedPath);
    imported++;
    console.log(JSON.stringify({ imported, id: post.id, date: post.created_at, mediaWarnings: result.mediaErrors.length }));
  } catch (error) {
    failures.push(post.id);
    console.error(`Import failed for ${post.id}: ${error.message}`);
    // Do not burn through an entire archive once the provider quota is spent.
    if (/\(429\)/.test(error.message)) {
      console.error("Translation quota exhausted. Re-run with --originals-only to retain the remaining source posts, then resume translations after the quota resets.");
      break;
    }
  }
}
console.log(JSON.stringify({ imported, retained: feed.posts.length, newest: feed.posts[0]?.createdAt, failures }));
if (failures.length) process.exitCode = 1;
