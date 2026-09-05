import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import data from "../app/data/status-data.json" with { type: "json" };
import schedule from "./publication-schedule.json" with { type: "json" };
import { applyScheduledPublications, duePublications } from "./publication.mjs";
import { trackerRevision, trackerSummary, publicationState } from "./milestones.mjs";
import { deploymentContainsVerdict } from "./deployment-verification.mjs";
import { seedFromMilestones, seedNotificationState, selectUnnotified, hasAnnouncements } from "./milestone-dedupe.mjs";

const before = structuredClone(data);
Object.assign(before.chapters.find((row) => row.chapter === 420), { status: "scheduled" });
const at = Date.parse("2026-09-06T16:57:00+02:00");

test("the frontend and public API agree before and after publication", () => {
  const compiled = ts.transpileModule(readFileSync(new URL("../app/data/status.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  for (const status of [before, applyScheduledPublications(before, schedule, [], at).statusData]) {
    const exports = {};
    vm.runInNewContext(compiled, { exports, require: (path) => {
      assert.equal(path, "./status-data.json");
      return status;
    } });
    const summary = trackerSummary(status);
    assert.equal(exports.publicationStatus, summary.publicationStatus);
    assert.equal(exports.statusDataRevision, summary.revision);
    assert.equal(exports.latestPublished.chapter, summary.latestPublished);
  }
});

test("French publication time and pre-trigger do not publish early", () => {
  assert.equal(Date.parse(schedule.releases[0].releaseAt), Date.parse("2026-09-06T15:00:00Z"));
  const early = applyScheduledPublications(before, schedule, [], at - 1);
  assert.equal(early.changed, false);
  assert.deepEqual(early.releases, []);
  assert.equal(publicationState(early.statusData), "publishing");
});

test("16:57 publishes 420, switches to hiatus and invalidates image caches without changing production", () => {
  const result = applyScheduledPublications(before, schedule, [], at);
  assert.equal(result.changed, true);
  assert.equal(result.statusData.chapters.find((row) => row.chapter === 420).status, "published");
  assert.equal(publicationState(result.statusData), "hiatus");
  assert.notEqual(trackerRevision(before), result.verdict.revision);
  assert.match(result.verdict.revision, /^[0-9A-Za-z-]{1,40}$/);
  assert.deepEqual(result.verdict.milestones, {
    chapters: [{ chapter: 420, from: "scheduled", to: "published" }],
    publication: { from: "publishing", to: "hiatus" },
  });
  assert.deepEqual(result.statusData.chapters.filter((row) => row.chapter !== 420), before.chapters.filter((row) => row.chapter !== 420));
  const announced = selectUnnotified(seedFromMilestones(result.verdict.milestones), result.verdict.milestones);
  assert.equal(hasAnnouncements(announced), true);
  const existingLedger = selectUnnotified(seedNotificationState(before), result.verdict.milestones);
  assert.equal(existingLedger.publication, "hiatus");
  assert.deepEqual(existingLedger.chapters, [{ chapter: 420, to: "published" }]);
  const retry = applyScheduledPublications(result.statusData, schedule, [], at + 600_000);
  assert.equal(retry.changed, false);
  assert.equal(hasAnnouncements(selectUnnotified(announced.state, retry.verdict.milestones)), false);
  assert.deepEqual(applyScheduledPublications(result.statusData, schedule, [420], at + 600_000).releases, []);
});

test("an announced future return overrides the completed hiatus and stays publishing after its release", () => {
  const next = applyScheduledPublications(before, schedule, [], at).statusData;
  const record = next.chapters.find((row) => row.chapter === 421);
  Object.assign(record, { status: "scheduled", releaseAt: "2026-09-14T00:00:00+09:00" });
  assert.equal(publicationState(next), "publishing");
  record.status = "published";
  assert.equal(publicationState(next), "publishing");
});

test("a cancelled, rescheduled, or untrusted publication refuses the automatic mutation", () => {
  for (const patch of [{ status: "delivered" }, { releaseAt: "2026-09-14T00:00:00+09:00" }, { sourceType: "togashi-x" }]) {
    const changed = structuredClone(before);
    Object.assign(changed.chapters.find((row) => row.chapter === 420), patch);
    assert.throws(() => applyScheduledPublications(changed, schedule, [], at), /no longer matches/);
  }
  assert.throws(() => duePublications({ releases: [{ ...schedule.releases[0], prepareAt: "2026-09-05T16:57:00+02:00" }] }, at), /Invalid/);
});

test("notification verification refuses stale state, missing chapters and unavailable translations", () => {
  const result = applyScheduledPublications(before, schedule, [], at);
  const live = { ...trackerSummary(result.statusData), chapters: result.statusData.chapters };
  assert.equal(deploymentContainsVerdict(live, null, result.verdict), true);
  assert.equal(deploymentContainsVerdict({ ...live, revision: "old" }, null, result.verdict), false);
  assert.equal(deploymentContainsVerdict({ ...live, publicationStatus: "publishing" }, null, result.verdict), false);
  assert.equal(deploymentContainsVerdict({ ...live, chapters: before.chapters }, null, result.verdict), false);
  const postVerdict = { ...result.verdict, posts: [{ id: "2094673907626414299" }] };
  assert.equal(deploymentContainsVerdict(live, { posts: [] }, postVerdict), false);
  assert.equal(deploymentContainsVerdict(live, { posts: postVerdict.posts }, postVerdict), true);
});
