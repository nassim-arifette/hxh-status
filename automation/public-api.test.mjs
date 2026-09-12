import test from "node:test";
import assert from "node:assert/strict";
import { buildChapterDetails, buildEvents, contentRevision } from "./public-api.mjs";
import { completeOpenApi } from "./public-api-schema.mjs";

const post = { id: "123", createdAt: "2026-09-01T12:00:00Z", url: "https://x.com/a/status/123",
  tracker: { decision: "apply", changes: [{ chapter: 427, from: "inking", to: "delivered" }] } };

test("events retain proven transitions, deduplicate the current observation and exclude review decisions", () => {
  const data = { chapters: [
    { chapter: 427, status: "delivered", updatedAt: "2026-09-01", source: post.url },
    { chapter: 428, status: "scheduled", releaseAt: "2026-10-01T00:00:00+09:00" },
    { chapter: 429, status: "unknown" },
    { chapter: 420, status: "published", releaseAt: "2026-09-07T00:00:00+09:00", updatedAt: "2026-09-08" },
  ] };
  const events = buildEvents(data, [post, { ...post, id: "124", tracker: { ...post.tracker, decision: "review" } }]);
  assert.equal(events.length, 2);
  assert.equal(events[0].date, "2026-09-07T00:00:00+09:00");
  assert.equal(events[0].from, null);
  assert.equal(events[1].from, "inking");
  assert.deepEqual(buildEvents({ chapters: [...data.chapters].reverse() }, [post]), events);
  assert.deepEqual(buildEvents(data, [post, post]), events);
});

test("chapter details preserve unknown metadata and flag inferred arcs without projecting volumes", () => {
  const chapters = buildChapterDetails({ statusData: { chapters: [{ chapter: 427, status: "delivered" }, { chapter: 1, status: "published" }] },
    historyData: [{ chapter: 1, arc: "hunter-exam" }, { chapter: 420, arc: "succ-war" }],
    titles: { en: { 1: "Departure" }, fr: {} }, volumes: { volumes: [{ volume: 1, from: 1, to: 8 }] }, posts: [post] });
  assert.equal(chapters[0].volume, 1);
  assert.equal(chapters[0].arcInferred, false);
  assert.equal(chapters[1].volume, null);
  assert.equal(chapters[1].titles.en, null);
  assert.equal(chapters[1].releaseAt, null);
  assert.equal(chapters[1].arc, "succ-war");
  assert.equal(chapters[1].arcInferred, true);
  assert.deepEqual(chapters[1].relatedPostIds, ["123"]);
});

test("content revisions detect corrections without changing stable event identity", () => {
  const original = buildEvents({ chapters: [] }, [post]);
  const corrected = buildEvents({ chapters: [] }, [{ ...post, createdAt: "2026-09-02T12:00:00Z" }]);
  assert.equal(original[0].id, corrected[0].id);
  assert.notEqual(contentRevision(original), contentRevision(corrected));
  assert.equal(contentRevision(original), contentRevision(JSON.parse(JSON.stringify(original))));
  assert.deepEqual(buildEvents({ chapters: [] }, []), []);
});

test("every JSON operation has a resolved response schema, unique operation ID and conditional reads", () => {
  const doc = completeOpenApi({ info: {}, paths: {} });
  const ids = new Set();
  for (const { get } of Object.values(doc.paths)) {
    assert.ok(!ids.has(get.operationId));
    ids.add(get.operationId);
    const schema = get.responses[200].content["application/json"].schema.$ref.split("/").at(-1);
    assert.ok(doc.components.schemas[schema]);
    assert.ok(get.responses[304]);
  }
});
