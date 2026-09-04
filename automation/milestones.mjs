import {
  STATUS_RANK,
  TOGASHI_SOURCE_LABEL,
  TRACKER_STATUSES,
} from "./contracts.mjs";

// Weekly Jump skips issues routinely; a gap past roughly five weeks is a break
// rather than the normal schedule. This mirrors `publicationStatus` in
// `app/data/status.ts` exactly, including measuring against `lastUpdated`
// instead of the clock. Change both together or the site and the notification
// will disagree about whether the series is on hiatus.
const HIATUS_GAP_DAYS = 35;
const DAY_MS = 24 * 60 * 60 * 1000;

function assertStatusData(value, label) {
  if (
    typeof value !== "object" ||
    value === null ||
    typeof value.lastUpdated !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.lastUpdated) ||
    !Array.isArray(value.chapters) ||
    value.chapters.length === 0
  ) {
    throw new TypeError(`Invalid ${label} tracker data.`);
  }

  const seen = new Set();

  for (const record of value.chapters) {
    if (
      typeof record !== "object" ||
      record === null ||
      !Number.isInteger(record.chapter) ||
      !TRACKER_STATUSES.includes(record.status) ||
      seen.has(record.chapter)
    ) {
      throw new TypeError(`Invalid ${label} tracker chapter.`);
    }

    seen.add(record.chapter);
  }

  return value;
}

function orderedChapters(statusData) {
  return [...statusData.chapters].sort((left, right) => left.chapter - right.chapter);
}

function daysBetween(releaseAt, throughDate) {
  return Math.round(
    (Date.parse(`${throughDate}T00:00:00+09:00`) - Date.parse(releaseAt)) /
      DAY_MS,
  );
}

// The highest chapter reached without a gap, matching `completeThrough` in
// `app/data/status.ts`: a later chapter that jumped ahead does not count while
// an earlier one is still behind.
function completeThrough(chapters, rank) {
  let reached;

  for (const chapter of chapters) {
    if (STATUS_RANK[chapter.status] < rank) break;
    reached = chapter;
  }

  return reached ?? chapters[0];
}

export function publicationState(statusData) {
  assertStatusData(statusData, "publication");
  const chapters = orderedChapters(statusData);
  const latestPublished = completeThrough(chapters, STATUS_RANK.published);

  return latestPublished.releaseAt &&
    daysBetween(latestPublished.releaseAt, statusData.lastUpdated) <=
      HIATUS_GAP_DAYS
    ? "publishing"
    : "hiatus";
}

// A milestone is a chapter climbing the ladder, never a chapter appearing. A
// newly tracked chapter starts at `unknown`, the lowest rank, so adding rows
// for future chapters is silent by construction rather than by special case.
export function chapterMilestones(previous, next) {
  assertStatusData(previous, "previous");
  assertStatusData(next, "next");

  const before = new Map(
    previous.chapters.map((record) => [record.chapter, record.status]),
  );
  const milestones = [];

  for (const record of orderedChapters(next)) {
    const from = before.get(record.chapter) ?? "unknown";
    if (STATUS_RANK[record.status] <= STATUS_RANK[from]) continue;

    milestones.push({ chapter: record.chapter, from, to: record.status });
  }

  return milestones;
}

export function trackerMilestones(previous, next) {
  const chapters = chapterMilestones(previous, next);
  const from = publicationState(previous);
  const to = publicationState(next);

  return {
    chapters,
    publication: from === to ? null : { from, to },
  };
}

export function hasMilestones(result) {
  return result.chapters.length > 0 || result.publication !== null;
}

function sourcePostId(chapter) {
  return chapter.sourcePostId ?? chapter.source?.match(/\/status\/(\d+)/)?.[1];
}

// Snowflake IDs do not fit safely in a JavaScript number, so compare their
// decimal strings by length first.
function compareNumericStrings(left = "", right = "") {
  const normalizedLeft = left.replace(/^0+/, "") || "0";
  const normalizedRight = right.replace(/^0+/, "") || "0";

  if (normalizedLeft.length !== normalizedRight.length) {
    return normalizedLeft.length - normalizedRight.length;
  }

  return normalizedLeft.localeCompare(normalizedRight);
}

// The revision changes only when the tracker does, so a consumer can poll it
// cheaply and use it to bust the cache on the chart images.
export function trackerRevision(statusData) {
  assertStatusData(statusData, "revision");
  const updates = statusData.chapters.filter(
    (chapter) =>
      (chapter.sourceType === "togashi-x" ||
        chapter.sourceLabel === TOGASHI_SOURCE_LABEL) &&
      chapter.updatedAt,
  );

  const latest = updates.reduce((best, chapter) => {
    if (!best) return chapter;

    const byDate = (chapter.updatedAt ?? "").localeCompare(best.updatedAt ?? "");
    if (byDate !== 0) return byDate > 0 ? chapter : best;

    const byPost = compareNumericStrings(
      sourcePostId(chapter),
      sourcePostId(best),
    );
    if (byPost !== 0) return byPost > 0 ? chapter : best;

    return chapter.chapter > best.chapter ? chapter : best;
  }, undefined);

  return (latest && sourcePostId(latest)) || statusData.lastUpdated;
}

// Everything a third party would otherwise have to re-derive from the raw
// chapter list, including the hiatus rule. Mirrors the exports of
// `app/data/status.ts` so the site and any consumer agree.
export function trackerSummary(statusData) {
  assertStatusData(statusData, "summary");
  const chapters = orderedChapters(statusData);

  return {
    lastUpdated: statusData.lastUpdated,
    revision: trackerRevision(statusData),
    publicationStatus: publicationState(statusData),
    latestPublished: completeThrough(chapters, STATUS_RANK.published).chapter,
    manuscriptsComplete: completeThrough(chapters, STATUS_RANK.delivered)
      .chapter,
    workConfirmed: completeThrough(chapters, STATUS_RANK.inking).chapter,
    nextChapter: (
      chapters.find((chapter) => chapter.status !== "published") ??
      completeThrough(chapters, STATUS_RANK.published)
    ).chapter,
  };
}
