import assert from "node:assert/strict";
import test from "node:test";

import {
  hasAnnouncements,
  isNotificationState,
  seedNotificationState,
  selectUnnotified,
} from "./milestone-dedupe.mjs";

const tracked = {
  lastUpdated: "2026-09-02",
  chapters: [
    { chapter: 427, status: "delivered" },
    { chapter: 428, status: "background" },
    { chapter: 429, status: "unknown" },
  ],
};

function milestones(chapters, publication = null) {
  return { chapters, publication };
}

test("seeding records the current tracker without announcing it", () => {
  const state = seedNotificationState(tracked);

  assert.equal(isNotificationState(state), true);
  assert.deepEqual(state.chapters, { 427: 3, 428: 2, 429: 0 });
  assert.equal(state.publication, null);
});

test("a milestone is announced once and never again", () => {
  const state = seedNotificationState(tracked);
  const climb = milestones([
    { chapter: 428, from: "background", to: "delivered" },
  ]);

  const first = selectUnnotified(state, climb);
  assert.deepEqual(first.chapters, [{ chapter: 428, to: "delivered" }]);
  assert.equal(hasAnnouncements(first), true);

  // The pipeline replays the same post after a failed commit.
  const second = selectUnnotified(first.state, climb);
  assert.deepEqual(second.chapters, []);
  assert.equal(hasAnnouncements(second), false);
});

test("each step of a climb is announced in turn", () => {
  let state = seedNotificationState(tracked);

  state = selectUnnotified(
    state,
    milestones([{ chapter: 428, from: "background", to: "delivered" }]),
  ).state;

  const next = selectUnnotified(
    state,
    milestones([{ chapter: 428, from: "delivered", to: "scheduled" }]),
  );

  assert.deepEqual(next.chapters, [{ chapter: 428, to: "scheduled" }]);
});

test("a chapter first seen already past unknown is announced", () => {
  const state = seedNotificationState(tracked);
  const selection = selectUnnotified(
    state,
    milestones([{ chapter: 441, from: "unknown", to: "inking" }]),
  );

  assert.deepEqual(selection.chapters, [{ chapter: 441, to: "inking" }]);
  assert.equal(selection.state.chapters[441], 1);
});

test("a new chapter tracked as unknown never reaches the announcer", () => {
  // `chapterMilestones` filters it out upstream; if one slips through, its rank
  // still cannot beat the seeded rank.
  const state = seedNotificationState(tracked);
  const selection = selectUnnotified(
    state,
    milestones([{ chapter: 429, from: "unknown", to: "unknown" }]),
  );

  assert.deepEqual(selection.chapters, []);
});

test("the first explicit publication transition is announced even with an unset ledger", () => {
  const state = seedNotificationState(tracked);

  const cold = selectUnnotified(
    state,
    milestones([], { from: "publishing", to: "hiatus" }),
  );
  assert.equal(cold.publication, "hiatus");
  assert.equal(cold.state.publication, "hiatus");

  const flip = selectUnnotified(
    cold.state,
    milestones([], { from: "hiatus", to: "publishing" }),
  );
  assert.equal(flip.publication, "publishing");
  assert.equal(hasAnnouncements(flip), true);

  // Re-reporting the same state announces nothing.
  const repeat = selectUnnotified(
    flip.state,
    milestones([], { from: "hiatus", to: "publishing" }),
  );
  assert.equal(repeat.publication, null);
});

test("a corrupt state is rejected instead of announcing everything", () => {
  assert.throws(() => selectUnnotified(null, milestones([])));
  assert.throws(() => selectUnnotified({ version: 9 }, milestones([])));
  assert.throws(() =>
    selectUnnotified(
      { version: 1, chapters: { 428: "delivered" }, publication: null },
      milestones([]),
    ),
  );
  assert.throws(() =>
    selectUnnotified(
      { version: 1, chapters: {}, publication: "resting" },
      milestones([]),
    ),
  );
});
