import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { analyzeTweet, retryDelay } from "./gemini.mjs";
import { canonicalTweetUrl } from "./contracts.mjs";
import { signAutomationPayload } from "./payload-auth.mjs";

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

test("quota exhaustion immediately uses the configured fallback and records its model", async () => {
  const requestedModels = [];
  const result = await analyzeTweet({
    tweet: tweet(),
    currentChapters: [{ chapter: 434, status: "unknown" }],
    apiKey: "test-key",
    model: "gemini-3.7-flash",
    fallbackModels: ["gemini-3.5-flash"],
    fetchImpl: async (_url, options) => {
      const model = JSON.parse(options.body).model;
      requestedModels.push(model);
      return model === "gemini-3.7-flash"
        ? new Response("daily request quota exhausted", { status: 429, headers: { "retry-after": "0" } })
        : completedResponse(processedResult(confirmedAnalysis()));
    },
  });

  assert.deepEqual(requestedModels, ["gemini-3.7-flash", "gemini-3.5-flash"]);
  assert.equal(result.model, "gemini-3.5-flash");
  assert.deepEqual(result.analysis, confirmedAnalysis());
  assert.deepEqual(result.translations, translations());
});

test("exhausted server retries use the fallback without weakening validation", async () => {
  for (const status of [500, 502, 503, 504]) {
    const requestedModels = [];
    const result = await analyzeTweet({
      tweet: tweet(),
      currentChapters: [{ chapter: 434, status: "unknown" }],
      apiKey: "test-key",
      model: "gemini-3.7-flash",
      fallbackModels: ["gemini-3.5-flash"],
      fetchImpl: async (_url, options) => {
        const model = JSON.parse(options.body).model;
        requestedModels.push(model);
        return model === "gemini-3.7-flash"
          ? new Response("provider unavailable", { status, headers: { "retry-after": "0" } })
          : completedResponse(processedResult(confirmedAnalysis()));
      },
    });

    assert.deepEqual(requestedModels, ["gemini-3.7-flash", "gemini-3.7-flash", "gemini-3.7-flash", "gemini-3.5-flash"]);
    assert.equal(result.model, "gemini-3.5-flash");
  }
});

test("authentication, invalid requests and invalid model output never trigger a fallback", async () => {
  for (const status of [400, 401, 403, 404]) {
    const requestedModels = [];
    await assert.rejects(analyzeTweet({
      tweet: tweet(), currentChapters: [], apiKey: "test-key",
      model: "gemini-3.7-flash", fallbackModels: ["gemini-3.5-flash"],
      fetchImpl: async (_url, options) => {
        requestedModels.push(JSON.parse(options.body).model);
        return new Response("invalid request or credential", { status });
      },
    }), new RegExp(`Gemini request failed \\(${status}\\)`));
    assert.deepEqual(requestedModels, ["gemini-3.7-flash"]);
  }

  const requestedModels = [];
  await assert.rejects(analyzeTweet({
    tweet: tweet(), currentChapters: [], apiKey: "test-key",
    model: "gemini-3.7-flash", fallbackModels: ["gemini-3.5-flash"],
    fetchImpl: async (_url, options) => {
      requestedModels.push(JSON.parse(options.body).model);
      return completedResponse({
        ...processedResult(confirmedAnalysis()),
        translations: { ...translations(), ja: "invented source" },
      });
    },
  }), /translations.ja does not preserve/);
  assert.deepEqual(requestedModels, ["gemini-3.7-flash"]);
});

test("invalid fallback output stops before another model can bypass validation", async () => {
  const requestedModels = [];
  await assert.rejects(analyzeTweet({
    tweet: tweet(), currentChapters: [], apiKey: "test-key",
    model: "gemini-3.7-flash", fallbackModels: ["gemini-3.5-flash", "gemini-3.6-flash"],
    fetchImpl: async (_url, options) => {
      const model = JSON.parse(options.body).model;
      requestedModels.push(model);
      return model === "gemini-3.7-flash"
        ? new Response("quota exhausted", { status: 429 })
        : completedResponse({ ...processedResult(confirmedAnalysis()), imageTexts: [{ imageIndex: 1, originalText: tweet().fullText, translations: translations() }] });
    },
  }), /Image text references an unavailable or duplicate image/);
  assert.deepEqual(requestedModels, ["gemini-3.7-flash", "gemini-3.5-flash"]);
});

test("fallback is opt in and quota failures do not waste repeated requests", async () => {
  let requests = 0;
  await assert.rejects(analyzeTweet({
    tweet: tweet(), currentChapters: [], apiKey: "test-key", model: "gemini-test",
    fetchImpl: async () => {
      requests += 1;
      return new Response("quota exhausted", { status: 429, headers: { "retry-after": "0" } });
    },
  }), /Gemini request failed \(429\)/);
  assert.equal(requests, 1);
});

async function runnerFixture(t, fallbackAvailable) {
  const directory = await mkdtemp(join(tmpdir(), "hxh-gemini-"));
  t.after(async () => {
    assert.equal(dirname(directory), tmpdir());
    await rm(directory, { recursive: true, force: true });
  });
  await mkdir(join(directory, "app", "data"), { recursive: true });
  await mkdir(join(directory, "automation"));
  const status = { lastUpdated: "2026-09-01", chapters: [{ chapter: 434, status: "unknown" }] };
  const state = {
    schemaVersion: 1, listId: "2095219478636495163",
    lastProcessedTweetId: "2094673907626414299", lastProcessedAt: "2026-09-01T06:29:11.000Z",
    lastRunAt: null, recentEvents: [], pendingReviews: [],
  };
  const paths = [join(directory, "app", "data", "status-data.json"), join(directory, "automation", "state.json"), join(directory, "app", "data", "togashi-posts.json")];
  const originals = [status, state, { schemaVersion: 1, posts: [] }].map(value => `${JSON.stringify(value, null, 2)}\n`);
  await Promise.all(paths.map((path, index) => writeFile(path, originals[index])));
  const preloadPath = join(directory, "provider.mjs");
  const modelOutput = JSON.stringify(processedResult(confirmedAnalysis()));
  const illustration = tweet({ fullText: "https://t.co/illustration" });
  const milestone = tweet({ id: "2096000000000000002", url: canonicalTweetUrl("2096000000000000002") });
  const illustrationOutput = JSON.stringify({
    analysis: { schemaVersion: 1, postClassification: "not_production_related", chapterUpdates: [], requiresHumanReview: false, explanation: "No production claim is present." },
    translations: Object.fromEntries(Object.keys(translations()).map(locale => [locale, illustration.fullText])),
    imageTexts: [],
  });
  await writeFile(preloadPath, `globalThis.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    if (request.model === "gemini-3.7-flash" || ${!fallbackAvailable}) {
      return new Response("daily request quota exhausted", { status: 429, headers: { "retry-after": "0" } });
    }
    const output = request.input[0].content[0].text.includes("https://t.co/illustration") ? ${JSON.stringify(illustrationOutput)} : ${JSON.stringify(modelOutput)};
    return Response.json({ status: "completed", output_text: output, steps: [{ type: "model_output", content: [{ type: "text", text: output }] }] });
  };\n`);
  const payload = JSON.stringify({
    schemaVersion: 1, listId: state.listId, authorId: "1528978792617611264",
    requestedAt: new Date().toISOString(), tweets: [illustration, milestone],
  });
  const secret = "test-automation-payload-secret-32-chars";
  const env = {
    ...process.env, AUTOMATION_PAYLOAD: payload,
    AUTOMATION_PAYLOAD_SIGNATURE: await signAutomationPayload(payload, secret),
    AUTOMATION_PAYLOAD_SECRET: secret, GEMINI_API_KEY: "test-key",
  };
  for (const key of ["GEMINI_MODEL", "GEMINI_FALLBACK_MODELS", "GITHUB_OUTPUT", "AUTOMATION_VERDICT_FILE", "AUTOMATION_REVIEW_FILE"]) delete env[key];
  const run = () => promisify(execFile)(process.execPath, ["--import", pathToFileURL(preloadPath).href, fileURLToPath(new URL("../scripts/process-togashi-events.mjs", import.meta.url))], { cwd: directory, env });
  return { run, paths, originals, illustration, milestone, preloadPath, env, directory };
}

test("the event runner gets past an older illustration and commits the later fallback milestone", async (t) => {
  const fixture = await runnerFixture(t, true);
  await fixture.run();
  const [status, state, feed] = await Promise.all(fixture.paths.map(async path => JSON.parse(await readFile(path, "utf8"))));
  assert.equal(status.chapters[0].status, "inking");
  assert.equal(status.chapters[0].sourcePostId, fixture.milestone.id);
  assert.equal(state.lastProcessedTweetId, fixture.milestone.id);
  assert.equal(feed.posts.length, 2);
  assert.deepEqual(feed.posts.map(post => post.id), [fixture.milestone.id, fixture.illustration.id]);
  assert.equal(feed.posts[0].translation.model, "gemini-3.5-flash");
  assert.equal(feed.posts[1].translation.model, "gemini-3.5-flash");
  assert.equal(feed.posts[1].tracker.decision, "ignore");
});

test("both models unavailable publish original posts and queue enrichment without changing tracker", async (t) => {
  const fixture = await runnerFixture(t, false);
  fixture.env.AUTOMATION_VERDICT_FILE = join(fixture.directory, "verdict.json");
  await fixture.run();
  const [status, state, feed] = await Promise.all(fixture.paths.map(async path => JSON.parse(await readFile(path, "utf8"))));
  assert.deepEqual(status, JSON.parse(fixture.originals[0]));
  assert.equal(state.lastProcessedTweetId, fixture.milestone.id);
  assert.deepEqual(state.pendingAnalysis.map(post => post.id), [fixture.illustration.id, fixture.milestone.id]);
  assert.equal(state.pendingReviews.length, 0);
  assert.equal(feed.posts.length, 2);
  for (const post of feed.posts) {
    const source = [fixture.illustration, fixture.milestone].find(tweet => tweet.id === post.id);
    assert.equal(post.originalText, source.fullText);
    assert.deepEqual(post.mediaUrls, source.mediaUrls);
    assert.equal(post.translation.status, "unavailable");
    assert.equal(post.translation.texts, null);
    assert.deepEqual(post.tracker.changes, []);
  }
  const verdict = JSON.parse(await readFile(fixture.env.AUTOMATION_VERDICT_FILE, "utf8"));
  assert.ok(verdict.posts.every(post => post.notification === "raw" && post.translations === null));
  assert.deepEqual(verdict.milestones.chapters, []);
});

test("queued original posts gain validated translations and milestones after the provider recovers", async (t) => {
  const fixture = await runnerFixture(t, false);
  await fixture.run();
  const recovered = await runnerFixture(t, true);
  await writeFile(fixture.preloadPath, await readFile(recovered.preloadPath, "utf8"));
  await fixture.run();
  const [status, state, feed] = await Promise.all(fixture.paths.map(async path => JSON.parse(await readFile(path, "utf8"))));
  assert.equal(status.chapters[0].status, "inking");
  assert.equal(state.lastProcessedTweetId, fixture.milestone.id);
  assert.deepEqual(state.pendingAnalysis, []);
  assert.equal(feed.posts.length, 2);
  assert.ok(feed.posts.every(post => post.translation.status === "available"));
  assert.equal(feed.posts[0].tracker.decision, "apply");
});

test("media outages retain enrichment retries, safe translations and earlier milestone history", async (t) => {
  const fixture = await runnerFixture(t, true);
  const payload = JSON.parse(fixture.env.AUTOMATION_PAYLOAD);
  payload.tweets = payload.tweets.map(post => ({ ...post, mediaUrls: ["https://pbs.twimg.com/media/test.jpg"] }));
  fixture.env.AUTOMATION_PAYLOAD = JSON.stringify(payload);
  fixture.env.AUTOMATION_PAYLOAD_SIGNATURE = await signAutomationPayload(fixture.env.AUTOMATION_PAYLOAD, fixture.env.AUTOMATION_PAYLOAD_SECRET);
  const providerSource = await readFile(fixture.preloadPath, "utf8");
  const failingMediaSource = providerSource.replace("const request = JSON.parse(options.body);",
    'if (_url.startsWith("https://pbs.twimg.com/")) return new Response("media unavailable", { status: 503 }); const request = JSON.parse(options.body);');
  await writeFile(fixture.preloadPath, failingMediaSource);
  const before = JSON.parse(await readFile(fixture.paths[0], "utf8"));
  Object.assign(before.chapters[0], { releaseAt: "2026-10-01T00:00:00+09:00", preReleaseAt: "2026-09-30", jumpIssue: "44" });
  await writeFile(fixture.paths[0], JSON.stringify(before));

  await fixture.run();
  const [status, state, feed] = await Promise.all(fixture.paths.map(async path => JSON.parse(await readFile(path, "utf8"))));
  assert.equal(status.chapters[0].status, "inking");
  for (const field of ["releaseAt", "preReleaseAt", "jumpIssue"]) assert.equal(status.chapters[0][field], before.chapters[0][field]);
  assert.deepEqual(state.pendingAnalysis.map(post => post.id), payload.tweets.map(post => post.id));
  assert.deepEqual(state.pendingReviews, []);
  assert.ok(feed.posts.every(post => post.translation.status === "available"));
  const applied = feed.posts.find(post => post.id === fixture.milestone.id).tracker;
  assert.deepEqual(applied.changes, [{ chapter: 434, from: "unknown", to: "inking" }]);

  await fixture.run();
  const retryState = JSON.parse(await readFile(fixture.paths[1], "utf8"));
  const retryFeed = JSON.parse(await readFile(fixture.paths[2], "utf8"));
  assert.equal(retryState.pendingAnalysis.length, 2);
  assert.deepEqual(retryState.pendingReviews, []);
  assert.deepEqual(retryFeed.posts.find(post => post.id === fixture.milestone.id).tracker, applied);

  await writeFile(fixture.preloadPath, providerSource.replace("const request = JSON.parse(options.body);",
    'if (_url.startsWith("https://pbs.twimg.com/")) return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/jpeg" } }); const request = JSON.parse(options.body);'));
  await fixture.run();
  const recoveredState = JSON.parse(await readFile(fixture.paths[1], "utf8"));
  const recoveredFeed = JSON.parse(await readFile(fixture.paths[2], "utf8"));
  assert.deepEqual(recoveredState.pendingAnalysis, []);
  assert.deepEqual(recoveredState.pendingReviews, []);
  assert.equal(recoveredFeed.posts.find(post => post.id === fixture.illustration.id).tracker.decision, "ignore");
  assert.deepEqual(recoveredFeed.posts.find(post => post.id === fixture.milestone.id).tracker, applied);
});

test("invalid structured output still publishes originals while later valid posts are processed", async (t) => {
  const fixture = await runnerFixture(t, true);
  const source = await readFile(fixture.preloadPath, "utf8");
  await writeFile(fixture.preloadPath, source.replace('const request = JSON.parse(options.body);', 'const request = JSON.parse(options.body); if (request.input[0].content[0].text.includes("https://t.co/illustration")) return Response.json({ status: "completed", steps: [] });'));
  await fixture.run();
  const [status, state, feed] = await Promise.all(fixture.paths.map(async path => JSON.parse(await readFile(path, "utf8"))));
  assert.equal(status.chapters[0].status, "inking");
  assert.deepEqual(state.pendingAnalysis.map(post => post.id), [fixture.illustration.id]);
  assert.equal(feed.posts[1].translation.status, "unavailable");
  assert.equal(feed.posts[0].translation.status, "available");
});

test("missing Gemini configuration still publishes original tweets", async (t) => {
  const fixture = await runnerFixture(t, true);
  delete fixture.env.GEMINI_API_KEY;
  await fixture.run();
  const feed = JSON.parse(await readFile(fixture.paths[2], "utf8"));
  assert.equal(feed.posts.length, 2);
  assert.ok(feed.posts.every(post => post.translation.status === "unavailable"));
});

test("a failed retry preserves an existing manual translation", async (t) => {
  const fixture = await runnerFixture(t, true);
  await fixture.run();
  const feed = JSON.parse(await readFile(fixture.paths[2], "utf8"));
  for (const post of feed.posts) Object.assign(post.translation, { provider: "manual", model: null });
  await writeFile(fixture.paths[2], JSON.stringify(feed));
  const state = JSON.parse(await readFile(fixture.paths[1], "utf8"));
  state.pendingAnalysis = [fixture.illustration, fixture.milestone];
  await writeFile(fixture.paths[1], JSON.stringify(state));
  const failed = await runnerFixture(t, false);
  await writeFile(fixture.preloadPath, await readFile(failed.preloadPath, "utf8"));
  await fixture.run();
  assert.deepEqual(JSON.parse(await readFile(fixture.paths[2], "utf8")), feed);
});

test("a raw verdict replay preserves its queued originals without calling Gemini", async (t) => {
  const fixture = await runnerFixture(t, false);
  fixture.env.AUTOMATION_VERDICT_FILE = join(fixture.directory, "verdict.json");
  await fixture.run();
  const originals = await Promise.all(fixture.paths.map(path => readFile(path, "utf8")));
  const verdict = await readFile(fixture.env.AUTOMATION_VERDICT_FILE, "utf8");
  await writeFile(fixture.preloadPath, 'globalThis.fetch = async () => { throw new Error("Gemini must not run while a verdict is pending"); };');
  const result = await fixture.run();
  assert.match(result.stdout, /"analyzed":0/);
  assert.deepEqual(await Promise.all(fixture.paths.map(path => readFile(path, "utf8"))), originals);
  assert.equal(await readFile(fixture.env.AUTOMATION_VERDICT_FILE, "utf8"), verdict);
});

test("fresh originals publish while an older notification verdict is pending", async (t) => {
  const fixture = await runnerFixture(t, false);
  fixture.env.AUTOMATION_VERDICT_FILE = join(fixture.directory, "verdict.json");
  await fixture.run();
  const stateBefore = JSON.parse(await readFile(fixture.paths[1], "utf8"));
  const next = { ...fixture.milestone, id: "2096000000000000003", url: canonicalTweetUrl("2096000000000000003") };
  const payload = JSON.parse(fixture.env.AUTOMATION_PAYLOAD);
  payload.tweets = [next];
  fixture.env.AUTOMATION_PAYLOAD = JSON.stringify(payload);
  fixture.env.AUTOMATION_PAYLOAD_SIGNATURE = await signAutomationPayload(fixture.env.AUTOMATION_PAYLOAD, fixture.env.AUTOMATION_PAYLOAD_SECRET);
  await writeFile(fixture.preloadPath, 'globalThis.fetch = async () => { throw new Error("Gemini must not run while a verdict is pending"); };');
  await fixture.run();
  const [status, state, feed] = await Promise.all(fixture.paths.map(async path => JSON.parse(await readFile(path, "utf8"))));
  assert.deepEqual(status, JSON.parse(fixture.originals[0]));
  assert.equal(state.lastProcessedTweetId, next.id);
  assert.deepEqual(state.pendingVerdict, stateBefore.pendingVerdict);
  assert.equal(state.pendingAnalysis.length, 3);
  assert.equal(feed.posts.length, 3);
  assert.equal(feed.posts[0].originalText, next.fullText);
  assert.equal(feed.posts[0].translation.status, "unavailable");
});

test("an invalid dispatch signature cannot publish source posts", async (t) => {
  const fixture = await runnerFixture(t, false);
  fixture.env.AUTOMATION_PAYLOAD_SIGNATURE = "invalid-signature";
  await assert.rejects(fixture.run(), /Automation payload signature is invalid/);
  assert.deepEqual(await Promise.all(fixture.paths.map(path => readFile(path, "utf8"))), fixture.originals);
});

test("retry backlog is bounded by actual state file bytes while new originals remain archived", async (t) => {
  const fixture = await runnerFixture(t, false);
  const state = JSON.parse(fixture.originals[1]);
  state.pendingAnalysis = Array.from({ length: 50 }, (_, i) => {
    const id = (2095000000000000000n + BigInt(i)).toString();
    return { ...fixture.illustration, id, url: canonicalTweetUrl(id), fullText: "source ".repeat(180) };
  });
  await writeFile(fixture.paths[1], JSON.stringify(state, null, 2));
  assert.ok(Buffer.byteLength(await readFile(fixture.paths[1], "utf8")) < 100_000);
  const payload = JSON.parse(fixture.env.AUTOMATION_PAYLOAD);
  payload.tweets = payload.tweets.map(post => ({ ...post, fullText: "原文".repeat(1500) }));
  fixture.env.AUTOMATION_PAYLOAD = JSON.stringify(payload);
  fixture.env.AUTOMATION_PAYLOAD_SIGNATURE = await signAutomationPayload(fixture.env.AUTOMATION_PAYLOAD, fixture.env.AUTOMATION_PAYLOAD_SECRET);
  fixture.env.AUTOMATION_VERDICT_FILE = join(fixture.directory, "verdict.json");
  await fixture.run();
  const bytes = await readFile(fixture.paths[1]);
  assert.ok(bytes.length <= 100_000);
  const nextState = JSON.parse(bytes);
  assert.ok(nextState.pendingAnalysis.length <= 50);
  assert.ok(nextState.pendingAnalysis.some(post => post.id === fixture.milestone.id));
  const feed = JSON.parse(await readFile(fixture.paths[2], "utf8"));
  assert.equal(feed.posts.length, 2);
  assert.equal(feed.posts[0].originalText, payload.tweets[1].fullText);
});
