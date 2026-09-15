import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

import { createTrackerRevision } from "../lib/tracker-revision.ts";
import { deploymentContainsVerdict } from "./deployment-verification.mjs";
import { hasAnnouncements, seedNotificationState, selectUnnotified } from "./milestone-dedupe.mjs";
import { trackerMilestones, trackerRevision, trackerSummary } from "./milestones.mjs";

const siteModule = ts.transpileModule(readFileSync(new URL("../app/data/status.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;

function siteRevision(statusData) {
  const exports = {};
  vm.runInNewContext(siteModule, { exports, require: (path) => {
    if (path === "./status-data.json") return statusData;
    if (path === "../../lib/tracker-revision") return { createTrackerRevision };
    assert.fail(`Unexpected site import ${path}.`);
  } });
  return exports.statusDataRevision;
}

function tracker() {
  return {
    lastUpdated: "2026-09-15",
    hiatusAfterChapter: 419,
    chapters: [
      { chapter: 419, status: "published", releaseAt: "2026-08-24T00:00:00+09:00" },
      { chapter: 420, status: "background", updatedAt: "2026-09-01", sourceType: "togashi-x", sourcePostId: "2094673907626414299" },
      { chapter: 421, status: "delivered", updatedAt: "2026-09-15", sourceType: "togashi-x", sourcePostId: "2099837550617903464" },
    ],
  };
}

test("recovering an older queued milestone changes the revision while keeping the latest post", () => {
  const before = tracker();
  const next = structuredClone(before);
  Object.assign(next.chapters[1], {
    status: "delivered", updatedAt: "2026-09-07", sourcePostId: "2096333907626414299",
  });

  const previousRevision = trackerRevision(before);
  const nextRevision = trackerRevision(next);
  assert.match(previousRevision, /^2099837550617903464-/);
  assert.match(nextRevision, /^2099837550617903464-/);
  assert.notEqual(nextRevision, previousRevision);
  assert.equal(siteRevision(before), previousRevision);
  assert.equal(siteRevision(next), nextRevision);

  const verdict = { revision: nextRevision, posts: [], milestones: trackerMilestones(before, next) };
  const deployed = { ...trackerSummary(next), chapters: next.chapters };
  assert.equal(deploymentContainsVerdict(deployed, null, verdict), true);
  assert.equal(deploymentContainsVerdict({ ...deployed, revision: previousRevision }, null, verdict), false);
});

test("tracker revisions are stable across row, field and JSON formatting order", () => {
  const data = tracker();
  const reordered = structuredClone(data);
  reordered.chapters = reordered.chapters.reverse().map((chapter) =>
    Object.fromEntries(Object.entries(chapter).reverse()));
  assert.equal(trackerRevision(reordered), trackerRevision(data));
  assert.equal(siteRevision(reordered), trackerRevision(data));
  assert.equal(trackerRevision(JSON.parse(JSON.stringify(data, null, 2))), trackerRevision(data));
});

test("a cache revision change with unchanged statuses does not announce milestones", () => {
  const before = tracker();
  const legacyRevision = "2099837550617903464-p419-h";
  assert.notEqual(trackerRevision(before), legacyRevision);
  assert.equal(hasAnnouncements(selectUnnotified(seedNotificationState(before), trackerMilestones(before, before))), false);

  const corrected = structuredClone(before);
  corrected.chapters[1].note = "Corrected source note";
  assert.notEqual(trackerRevision(corrected), trackerRevision(before));
  assert.equal(hasAnnouncements(selectUnnotified(seedNotificationState(before), trackerMilestones(before, corrected))), false);
});

test("tracker revisions fit the verdict contract for maximum-length tweet IDs", () => {
  const data = tracker();
  data.chapters[2].sourcePostId = "99999999999999999999";
  const revision = trackerRevision(data);
  assert.match(revision, /^[0-9A-Za-z-]{1,40}$/);
  assert.equal(revision.length, 37);
  assert.equal(siteRevision(data), revision);
});
