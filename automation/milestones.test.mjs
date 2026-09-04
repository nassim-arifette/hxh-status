import assert from "node:assert/strict";
import test from "node:test";

import {
  chapterMilestones,
  hasMilestones,
  publicationState,
  trackerMilestones,
  trackerRevision,
  trackerSummary,
} from "./milestones.mjs";

function tracker(lastUpdated, chapters) {
  return { lastUpdated, chapters };
}

const publishing = tracker("2026-09-02", [
  { chapter: 419, status: "published", releaseAt: "2026-08-24T00:00:00+09:00" },
  { chapter: 420, status: "scheduled" },
  { chapter: 421, status: "delivered" },
  { chapter: 422, status: "unknown" },
]);

test("a new chapter tracked as unknown is never a milestone", () => {
  const next = tracker("2026-09-02", [
    ...publishing.chapters,
    { chapter: 423, status: "unknown" },
    { chapter: 424, status: "unknown" },
  ]);

  assert.deepEqual(chapterMilestones(publishing, next), []);
  assert.equal(hasMilestones(trackerMilestones(publishing, next)), false);
});

test("only a climb up the ladder counts, in chapter order", () => {
  const next = tracker("2026-09-02", [
    { chapter: 419, status: "published", releaseAt: "2026-08-24T00:00:00+09:00" },
    { chapter: 420, status: "published", releaseAt: "2026-08-31T00:00:00+09:00" },
    { chapter: 421, status: "delivered" },
    { chapter: 422, status: "inking" },
  ]);

  assert.deepEqual(chapterMilestones(publishing, next), [
    { chapter: 420, from: "scheduled", to: "published" },
    { chapter: 422, from: "unknown", to: "inking" },
  ]);
});

test("a correction that lowers or repeats a status stays silent", () => {
  const next = tracker("2026-09-02", [
    { chapter: 419, status: "published", releaseAt: "2026-08-24T00:00:00+09:00" },
    { chapter: 420, status: "delivered" },
    { chapter: 421, status: "delivered" },
    { chapter: 422, status: "unknown" },
  ]);

  assert.deepEqual(chapterMilestones(publishing, next), []);
});

test("a chapter dropped from the tracker is not a milestone", () => {
  const next = tracker("2026-09-02", publishing.chapters.slice(0, 2));

  assert.deepEqual(chapterMilestones(publishing, next), []);
});

test("publication state follows the last unbroken published chapter", () => {
  assert.equal(publicationState(publishing), "publishing");

  // Same data read five weeks later: the gap alone tips it into hiatus.
  const stale = tracker("2026-10-05", publishing.chapters);
  assert.equal(publicationState(stale), "hiatus");
});

test("a chapter jumping ahead of a gap does not restart publication", () => {
  const gapped = tracker("2026-10-05", [
    { chapter: 419, status: "delivered" },
    { chapter: 420, status: "published", releaseAt: "2026-10-04T00:00:00+09:00" },
  ]);

  assert.equal(publicationState(gapped), "hiatus");
});

test("the hiatus flip is reported once, alongside chapter milestones", () => {
  const next = tracker("2026-10-05", [
    { chapter: 419, status: "published", releaseAt: "2026-08-24T00:00:00+09:00" },
    { chapter: 420, status: "scheduled" },
    { chapter: 421, status: "delivered" },
    { chapter: 422, status: "inking" },
  ]);

  const result = trackerMilestones(publishing, next);

  assert.deepEqual(result.chapters, [
    { chapter: 422, from: "unknown", to: "inking" },
  ]);
  assert.deepEqual(result.publication, { from: "publishing", to: "hiatus" });
  assert.equal(hasMilestones(result), true);

  // Re-running against the already-notified state reports nothing new.
  assert.equal(hasMilestones(trackerMilestones(next, next)), false);
});

test("malformed tracker data is rejected rather than diffed", () => {
  assert.throws(() => chapterMilestones(publishing, tracker("2026-09-02", [])));
  assert.throws(() =>
    chapterMilestones(
      publishing,
      tracker("2026-09-02", [{ chapter: 419, status: "invented" }]),
    ),
  );
  assert.throws(() =>
    chapterMilestones(
      publishing,
      tracker("09-02", [{ chapter: 419, status: "published" }]),
    ),
  );
  assert.throws(() =>
    chapterMilestones(
      publishing,
      tracker("2026-09-02", [
        { chapter: 419, status: "published" },
        { chapter: 419, status: "delivered" },
      ]),
    ),
  );
});

test("the summary reports each milestone reached without a gap", () => {
  const summary = trackerSummary(
    tracker("2026-09-02", [
      { chapter: 418, status: "published", releaseAt: "2026-08-17T00:00:00+09:00" },
      { chapter: 419, status: "published", releaseAt: "2026-08-24T00:00:00+09:00" },
      { chapter: 420, status: "scheduled" },
      { chapter: 421, status: "delivered" },
      { chapter: 422, status: "inking" },
      { chapter: 423, status: "unknown" },
    ]),
  );

  assert.equal(summary.publicationStatus, "publishing");
  assert.equal(summary.latestPublished, 419);
  assert.equal(summary.manuscriptsComplete, 421);
  assert.equal(summary.workConfirmed, 422);
  assert.equal(summary.nextChapter, 420);
});

test("the revision tracks the newest Togashi post, not the newest chapter", () => {
  const data = tracker("2026-09-02", [
    { chapter: 419, status: "published", releaseAt: "2026-08-24T00:00:00+09:00" },
    {
      chapter: 421,
      status: "delivered",
      updatedAt: "2026-09-01",
      sourceType: "togashi-x",
      sourcePostId: "2094673907626414299",
    },
    {
      chapter: 425,
      status: "inking",
      updatedAt: "2026-08-11",
      sourceType: "togashi-x",
      sourcePostId: "2087170463839682713",
    },
  ]);

  assert.equal(trackerRevision(data), "2094673907626414299");

  // Same-day updates fall back to the larger snowflake, which does not fit in
  // a Number and must not be compared as one.
  const sameDay = tracker("2026-09-02", [
    { chapter: 419, status: "published", releaseAt: "2026-08-24T00:00:00+09:00" },
    {
      chapter: 421,
      status: "delivered",
      updatedAt: "2026-09-01",
      sourceType: "togashi-x",
      sourcePostId: "2094673907626414299",
    },
    {
      chapter: 422,
      status: "delivered",
      updatedAt: "2026-09-01",
      sourceType: "togashi-x",
      sourcePostId: "2094673907626414300",
    },
  ]);

  assert.equal(trackerRevision(sameDay), "2094673907626414300");
});

test("a tracker with no Togashi post falls back to the update date", () => {
  assert.equal(trackerRevision(publishing), "2026-09-02");
});
