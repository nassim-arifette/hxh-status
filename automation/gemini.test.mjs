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

function completedResponse(value) {
  const output = JSON.stringify(value);
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

function translations(source = tweet().fullText) {
  return {
    ar: "اكتمل تحبير الشخصيات للفصل 434.",
    en: "No. 434, character inking complete.",
    es: "N.º 434: entintado de personajes terminado.",
    fr: "N° 434 : encrage des personnages terminé.",
    ja: source,
    pt: "Nº 434: arte-final dos personagens concluída.",
    zh: "第434话，人物勾线完成。",
  };
}

function processedResult(analysis, source = tweet().fullText) {
  return { analysis, translations: translations(source), imageTexts: [] };
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
      assert.match(body.system_instruction, /faithful translator/);
      assert.match(body.system_instruction, /Yoshihiro Togashi/);
      assert.match(body.system_instruction, /HUNTER x HUNTER \(HxH\)/);
      assert.match(body.system_instruction, /standalone illustrations/);
      assert.match(body.system_instruction, /requiresHumanReview: false/);
      assert.match(
        body.system_instruction,
        /\u4EBA\u7269\u30DA\u30F3\u5165\u308C\u5B8C\u4E86/u,
      );
      assert.equal(body.input[0].type, "user_input");
      assert.doesNotMatch(body.input[0].content[0].text, /You are a conservative/);
      assert.deepEqual(body.response_format.schema.required, [
        "analysis",
        "translations",
        "imageTexts",
      ]);
      return completedResponse(processedResult(analysis));
    },
  });

  assert.equal(requests, 1);
  assert.deepEqual(result.analysis, analysis);
  assert.deepEqual(result.translations, translations());
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

test("a tweet image and its text are sent as content in one v1 user input step", async () => {
  const mediaUrl = "https://pbs.twimg.com/media/example.jpg";
  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  const result = await analyzeTweet({
    tweet: tweet({ mediaUrls: [mediaUrl] }),
    currentChapters: [{ chapter: 434, status: "unknown" }],
    apiKey: "test-key",
    model: "gemini-test",
    fetchImpl: async (url, options) => {
      if (url === mediaUrl) {
        return new Response(bytes, { headers: { "content-type": "image/jpeg" } });
      }

      const body = JSON.parse(options.body);
      assert.equal(body.input.length, 1);
      assert.equal(body.input[0].type, "user_input");
      const [text, label, image] = body.input[0].content;
      assert.equal(label.text, "IMAGE_INDEX: 1");
      assert.equal(text.type, "text");
      assert.ok(text.text.includes(tweet().fullText));
      assert.deepEqual(image, {
        type: "image",
        data: bytes.toString("base64"),
        mime_type: "image/jpeg",
      });
      return completedResponse({
        ...processedResult(confirmedAnalysis()),
        imageTexts: [{ imageIndex: 1, originalText: tweet().fullText, translations: translations() }],
      });
    },
  });

  assert.deepEqual(result.mediaErrors, []);
  assert.equal(result.imageTexts[0].translations.fr, translations().fr);
  assert.equal(result.translations.fr, translations().fr);
});

test("missing media without deterministic text is forced to human review", async () => {
  let requests = 0;
  const source = "https://t.co/example";
  const result = await analyzeTweet({
    tweet: tweet({
      fullText: source,
      mediaUrls: ["https://pbs.twimg.com/media/example.jpg"],
    }),
    currentChapters: [{ chapter: 434, status: "unknown" }],
    apiKey: "test-key",
    model: "gemini-test",
    fetchImpl: async (url) => {
      requests += 1;
      if (url === "https://pbs.twimg.com/media/example.jpg") {
        throw new Error("temporary network failure");
      }

      return completedResponse({
        imageTexts: [],
        analysis: {
          schemaVersion: 1,
          postClassification: "not_production_related",
          chapterUpdates: [],
          requiresHumanReview: false,
          explanation: "No production statement is present in the text.",
        },
        translations: Object.fromEntries(
          Object.keys(translations()).map((locale) => [locale, source]),
        ),
      });
    },
  });

  assert.equal(requests, 2);
  assert.equal(result.analysis.postClassification, "ambiguous");
  assert.equal(result.analysis.requiresHumanReview, true);
  assert.equal(result.translations.fr, source);
  assert.equal(result.mediaErrors.length, 1);
});

test("Retry-After falls back when absent and accepts seconds", () => {
  assert.equal(retryDelay(null, 0), 1_000);
  assert.equal(retryDelay(null, 2), 4_000);
  assert.equal(retryDelay("2", 0), 2_000);
});
