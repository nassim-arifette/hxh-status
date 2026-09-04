import { STATUS_RANK } from "./contracts.mjs";

export const NOTIFICATION_STATE_VERSION = 1;

// The tracker is the source of truth for what happened; this record is the
// source of truth for what was *announced*. They are deliberately separate:
// re-running the pipeline over the same posts recomputes the same milestones,
// and only this record stops a subscriber hearing about 428 twice.
export function seedNotificationState(statusData) {
  const chapters = {};

  for (const record of statusData.chapters) {
    chapters[record.chapter] = STATUS_RANK[record.status];
  }

  return {
    version: NOTIFICATION_STATE_VERSION,
    chapters,
    publication: null,
  };
}

// A first verdict arrives with no stored record. Seeding from the milestones'
// own starting points announces that batch — which is correct, it is a real
// change — while still refusing a replay of it. Seeding from the whole tracker
// here would instead announce nothing, losing the first real milestone.
export function seedFromMilestones(milestones) {
  const chapters = {};

  for (const milestone of milestones.chapters) {
    chapters[milestone.chapter] = STATUS_RANK[milestone.from];
  }

  return {
    version: NOTIFICATION_STATE_VERSION,
    chapters,
    publication: milestones.publication ? milestones.publication.from : null,
  };
}

export function isNotificationState(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    value.version === NOTIFICATION_STATE_VERSION &&
    typeof value.chapters === "object" &&
    value.chapters !== null &&
    !Array.isArray(value.chapters) &&
    Object.values(value.chapters).every(
      (rank) => Number.isInteger(rank) && rank >= 0 && rank <= 5,
    ) &&
    (value.publication === null ||
      value.publication === "publishing" ||
      value.publication === "hiatus")
  );
}

// Returns only what has never been announced, plus the record to store once
// delivery succeeds. The caller must not persist `state` before the push is
// actually sent, or a failed send silently swallows the milestone.
export function selectUnnotified(state, milestones) {
  if (!isNotificationState(state)) {
    throw new TypeError("Invalid push notification state.");
  }

  const chapters = [];
  const nextChapters = { ...state.chapters };

  for (const milestone of milestones.chapters) {
    const announced = nextChapters[milestone.chapter];
    const rank = STATUS_RANK[milestone.to];

    if (Number.isInteger(announced) && rank <= announced) continue;

    chapters.push({ chapter: milestone.chapter, to: milestone.to });
    nextChapters[milestone.chapter] = rank;
  }

  // A first run has no announced publication state, so record it silently
  // rather than telling everyone the series is publishing.
  const publication =
    milestones.publication && state.publication !== null &&
    state.publication !== milestones.publication.to
      ? milestones.publication.to
      : null;

  return {
    chapters,
    publication,
    state: {
      version: NOTIFICATION_STATE_VERSION,
      chapters: nextChapters,
      publication: milestones.publication
        ? milestones.publication.to
        : state.publication,
    },
  };
}

export function hasAnnouncements(selection) {
  return selection.chapters.length > 0 || selection.publication !== null;
}
