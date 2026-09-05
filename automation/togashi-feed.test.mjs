import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  createTogashiPost,
  mergeTogashiFeed,
  validateTogashiFeed,
} from "./togashi-feed.mjs";
import { canonicalTweetUrl } from "./contracts.mjs";

const source = "No.434、人物ペン入れ完了。";

function translations() {
  return {
    ar: "الفصل 434، اكتمل تحبير الشخصيات.",
    en: "No. 434, character inking complete.",
    es: "N.º 434: entintado de personajes terminado.",
    fr: "N° 434 : encrage des personnages terminé.",
    ja: source,
    pt: "Nº 434: arte-final dos personagens concluída.",
    zh: "第434话，人物勾线完成。",
  };
}

test("the committed Togashi archive satisfies the public feed contract", async () => {
  const raw = JSON.parse(
    await readFile(new URL("../app/data/togashi-posts.json", import.meta.url)),
  );

  assert.equal(validateTogashiFeed(raw), raw);
  assert.equal(raw.posts[0].translation.texts.fr.includes("427"), true);
});

test("new posts are localized once, deduplicated, and sorted newest first", () => {
  const id = "2096000000000000001";
  const post = createTogashiPost({
    tweet: {
      id,
      authorId: "1528978792617611264",
      screenName: "Un4v5s8bgsVk9Xp",
      createdAt: "2026-09-03T03:00:00.000Z",
      url: canonicalTweetUrl(id),
      fullText: source,
      mediaUrls: ["https://pbs.twimg.com/media/example.jpg"],
    },
    translations: translations(),
    imageTexts: [{ imageIndex: 1, originalText: source, translations: translations() }],
    translationModel: "gemini-test",
    translatedAt: "2026-09-03T03:01:00.000Z",
    audit: {
      decision: "apply",
      changes: [{ chapter: 434, from: "unknown", to: "inking" }],
    },
  });

  const merged = mergeTogashiFeed(
    { schemaVersion: 1, posts: [] },
    [post, post],
  );

  assert.equal(merged.posts.length, 1);
  assert.equal(merged.posts[0].imageTexts[0].translations.fr, translations().fr);
  assert.equal(merged.posts[0].id, id);
  assert.equal(merged.posts[0].translation.provider, "gemini");
  assert.equal(merged.posts[0].translation.texts.fr, translations().fr);
});

test("a post can be archived safely when translation is unavailable", () => {
  const id = "2096000000000000002";
  const post = createTogashiPost({
    tweet: {
      id,
      createdAt: "2026-09-03T03:00:01.000Z",
      fullText: "投稿テキスト",
      mediaUrls: [],
    },
    translations: null,
    translationModel: "gemini-test",
    translatedAt: "2026-09-03T03:01:00.000Z",
    audit: { decision: "ignore", changes: [] },
  });

  assert.deepEqual(post.translation, {
    status: "unavailable",
    provider: null,
    model: null,
    generatedAt: null,
    texts: null,
  });
});
