import statusData from "./status-data.json";

export type ChapterStatus =
  | "published"
  | "scheduled"
  | "delivered"
  | "background"
  | "inking"
  | "unknown";

export type ChapterRecord = {
  chapter: number;
  status: ChapterStatus;
  updatedAt?: string;
  releaseAt?: string;
  preReleaseAt?: string;
  jumpIssue?: string;
  source?: string;
  sourceLabel?: string;
  sourceType?: "official-reader" | "togashi-x";
  sourcePostId?: string;
  sourcePublishedAt?: string;
  note?: string;
};

type StatusData = {
  lastUpdated: string;
  chapters: ChapterRecord[];
};

const togashiLabel = "Yoshihiro Togashi on X";
const allowedStatuses = new Set<ChapterStatus>([
  "published",
  "scheduled",
  "delivered",
  "background",
  "inking",
  "unknown",
]);
const allowedSourceTypes = new Set(["official-reader", "togashi-x"]);

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function assertStatusData(value: unknown): asserts value is StatusData {
  if (typeof value !== "object" || value === null) {
    throw new Error("Status data must be an object.");
  }

  const candidate = value as {
    lastUpdated?: unknown;
    chapters?: unknown;
  };

  if (
    typeof candidate.lastUpdated !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(candidate.lastUpdated) ||
    !Array.isArray(candidate.chapters) ||
    candidate.chapters.length === 0
  ) {
    throw new Error("Status data has invalid top-level fields.");
  }

  const chapterNumbers = new Set<number>();

  for (const value of candidate.chapters) {
    if (typeof value !== "object" || value === null) {
      throw new Error("Every chapter status must be an object.");
    }

    const chapter = value as Record<string, unknown>;
    if (
      !Number.isInteger(chapter.chapter) ||
      typeof chapter.status !== "string" ||
      !allowedStatuses.has(chapter.status as ChapterStatus) ||
      chapterNumbers.has(chapter.chapter as number)
    ) {
      throw new Error(
        "Chapter status data contains an invalid or duplicate chapter.",
      );
    }

    chapterNumbers.add(chapter.chapter as number);

    if (
      chapter.updatedAt !== undefined &&
      (typeof chapter.updatedAt !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(chapter.updatedAt))
    ) {
      throw new Error(`Chapter ${chapter.chapter} has an invalid updatedAt date.`);
    }

    for (const field of ["releaseAt", "preReleaseAt"] as const) {
      if (chapter[field] !== undefined && !isTimestamp(chapter[field])) {
        throw new Error(`Chapter ${chapter.chapter} has an invalid ${field}.`);
      }
    }

    if (
      (chapter.status === "published" || chapter.status === "scheduled") &&
      !isTimestamp(chapter.releaseAt)
    ) {
      throw new Error(
        `Chapter ${chapter.chapter} requires a timezone-aware releaseAt.`,
      );
    }

    if (
      chapter.sourceType !== undefined &&
      (typeof chapter.sourceType !== "string" ||
        !allowedSourceTypes.has(chapter.sourceType))
    ) {
      throw new Error(`Chapter ${chapter.chapter} has an invalid sourceType.`);
    }
  }

  const ordered = [...chapterNumbers].sort((left, right) => left - right);
  if (
    ordered.some(
      (chapter, index) => index > 0 && chapter !== ordered[index - 1] + 1,
    )
  ) {
    throw new Error("Tracked chapter numbers must be continuous.");
  }
}

assertStatusData(statusData);
const currentStatusData: StatusData = statusData;

export const chapters = [...currentStatusData.chapters].sort(
  (a, b) => a.chapter - b.chapter,
);

export const lastUpdated = currentStatusData.lastUpdated;

// Production order, earliest milestone first. Every chapter at or above a rank
// has cleared the milestones below it, so a single walk finds "complete through
// chapter N" for any stage.
const statusRank: Record<ChapterStatus, number> = {
  unknown: 0,
  inking: 1,
  background: 2,
  delivered: 3,
  scheduled: 4,
  published: 5,
};

function completeThrough(rank: number): ChapterRecord {
  let reached: ChapterRecord | undefined;

  for (const chapter of chapters) {
    if (statusRank[chapter.status] < rank) break;
    reached = chapter;
  }

  // Nothing has reached this milestone yet, so the oldest tracked chapter is
  // the only honest thing left to point at.
  return reached ?? chapters[0];
}

export const latestPublished = completeThrough(statusRank.published);
export const manuscriptsComplete = completeThrough(statusRank.delivered);
export const workConfirmed = completeThrough(statusRank.inking);

export const nextChapter =
  chapters.find((chapter) => chapter.status !== "published") ?? latestPublished;

// The panel is titled "Latest Togashi update", so only his own posts qualify.
const togashiUpdates = chapters.filter(
  (chapter) =>
    (chapter.sourceType === "togashi-x" ||
      chapter.sourceLabel === togashiLabel) &&
    chapter.updatedAt,
);

function sourcePostId(chapter: ChapterRecord) {
  return chapter.sourcePostId ?? chapter.source?.match(/\/status\/(\d+)/)?.[1];
}

function compareNumericStrings(left = "", right = "") {
  const normalizedLeft = left.replace(/^0+/, "") || "0";
  const normalizedRight = right.replace(/^0+/, "") || "0";

  if (normalizedLeft.length !== normalizedRight.length) {
    return normalizedLeft.length - normalizedRight.length;
  }

  return normalizedLeft.localeCompare(normalizedRight);
}

// Prefer the actual X post ID for same-day updates. Snowflake IDs do not fit
// safely in a JavaScript number, so compare their decimal strings instead.
export const latestUpdate = togashiUpdates.reduce(
  (latest, chapter) => {
    const dateComparison = (chapter.updatedAt ?? "").localeCompare(
      latest.updatedAt ?? "",
    );

    if (dateComparison !== 0) return dateComparison > 0 ? chapter : latest;

    const postComparison = compareNumericStrings(
      sourcePostId(chapter),
      sourcePostId(latest),
    );

    if (postComparison !== 0) return postComparison > 0 ? chapter : latest;
    return chapter.chapter > latest.chapter ? chapter : latest;
  },
  togashiUpdates[0] ?? chapters[0],
);

export const statusDataRevision = sourcePostId(latestUpdate) ?? lastUpdated;

const dayMs = 24 * 60 * 60 * 1000;

function daysBetween(releaseAt: string, throughDate: string) {
  return Math.round(
    (Date.parse(`${throughDate}T00:00:00+09:00`) - Date.parse(releaseAt)) /
      dayMs,
  );
}

// Jump scheduling a chapter *is* the announcement that the series is running
// again: it carries a release date and lands before anything is published.
const hasScheduledChapter = chapters.some(
  (chapter) => chapter.status === "scheduled",
);

// Weekly Jump skips issues routinely; a gap past roughly five weeks is a break
// rather than the normal schedule. Measured against `lastUpdated`, never the
// clock, so the server and client always render the same thing. The gap can
// only observe a break after it has opened, which is why a scheduled chapter
// wins outright. Mirrored by `publicationState` in
// `automation/milestones.mjs`; change both together.
export const publicationStatus: "publishing" | "hiatus" =
  hasScheduledChapter ||
  (latestPublished.releaseAt &&
    daysBetween(latestPublished.releaseAt, lastUpdated) <= 35)
    ? "publishing"
    : "hiatus";
