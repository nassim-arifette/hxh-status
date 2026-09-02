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
  note?: string;
};

const togashiLabel = "Yoshihiro Togashi on X";

const vizSeries =
  "https://www.viz.com/shonenjump/chapters/hunter-x-hunter";

const publishedBase: ChapterRecord[] = [
  { chapter: 411, status: "published", releaseAt: "2026-06-29T00:00:00+09:00", jumpIssue: "31" },
  { chapter: 412, status: "published", releaseAt: "2026-07-06T00:00:00+09:00", jumpIssue: "32" },
  { chapter: 413, status: "published", releaseAt: "2026-07-13T00:00:00+09:00", jumpIssue: "33" },
  { chapter: 414, status: "published", releaseAt: "2026-07-20T00:00:00+09:00", jumpIssue: "34" },
  { chapter: 415, status: "published", releaseAt: "2026-07-27T00:00:00+09:00", jumpIssue: "35" },
  { chapter: 416, status: "published", releaseAt: "2026-08-03T00:00:00+09:00", jumpIssue: "36" },
  { chapter: 417, status: "published", releaseAt: "2026-08-10T00:00:00+09:00", jumpIssue: "37/38" },
  { chapter: 418, status: "published", releaseAt: "2026-08-24T00:00:00+09:00", jumpIssue: "39" },
  { chapter: 419, status: "published", releaseAt: "2026-08-31T00:00:00+09:00", jumpIssue: "40" },
];

const published: ChapterRecord[] = publishedBase.map((chapter) => ({
  ...chapter,
  source: vizSeries,
  sourceLabel: "VIZ Shonen Jump",
}));

const progress: ChapterRecord[] = [
  {
    chapter: 420,
    status: "scheduled",
    releaseAt: "2026-09-07T00:00:00+09:00",
    preReleaseAt: "2026-09-03T12:00:00+09:00",
    updatedAt: "2026-09-01",
    source: vizSeries,
    sourceLabel: "VIZ Shonen Jump",
  },
  {
    chapter: 421,
    status: "delivered",
    updatedAt: "2026-05-26",
    source: "https://x.com/Un4v5s8bgsVk9Xp/status/2059299316800569524",
    sourceLabel: togashiLabel,
  },
  {
    chapter: 422,
    status: "delivered",
    updatedAt: "2026-07-01",
    source: "https://x.com/Un4v5s8bgsVk9Xp/status/2072287279197126773",
    sourceLabel: togashiLabel,
  },
  {
    chapter: 423,
    status: "delivered",
    updatedAt: "2026-07-07",
    source: "https://x.com/Un4v5s8bgsVk9Xp/status/2074538142506549407",
    sourceLabel: togashiLabel,
  },
  {
    chapter: 424,
    status: "delivered",
    updatedAt: "2026-08-08",
    source: "https://x.com/Un4v5s8bgsVk9Xp/status/2086132321166794760",
    sourceLabel: togashiLabel,
  },
  {
    chapter: 425,
    status: "delivered",
    updatedAt: "2026-08-11",
    source: "https://x.com/Un4v5s8bgsVk9Xp/status/2087170463839682713",
    sourceLabel: togashiLabel,
  },
  {
    chapter: 426,
    status: "delivered",
    updatedAt: "2026-08-25",
    source: "https://x.com/Un4v5s8bgsVk9Xp/status/2092132894814998720",
    sourceLabel: togashiLabel,
  },
  {
    chapter: 427,
    status: "delivered",
    updatedAt: "2026-09-01",
    source: "https://x.com/Un4v5s8bgsVk9Xp/status/2094673907626414299",
    sourceLabel: togashiLabel,
  },
  {
    chapter: 428,
    status: "background",
    updatedAt: "2026-07-03",
    source: "https://x.com/Un4v5s8bgsVk9Xp/status/2073109649608630730",
    sourceLabel: togashiLabel,
  },
  {
    chapter: 429,
    status: "background",
    updatedAt: "2026-08-27",
    source: "https://x.com/Un4v5s8bgsVk9Xp/status/2092902182790341023",
    sourceLabel: togashiLabel,
  },
  {
    chapter: 430,
    status: "background",
    updatedAt: "2026-08-30",
    source: "https://x.com/Un4v5s8bgsVk9Xp/status/2093900520406855763",
    sourceLabel: togashiLabel,
  },
  {
    chapter: 431,
    status: "inking",
    updatedAt: "2026-06-14",
    source: "https://x.com/Un4v5s8bgsVk9Xp/status/2066167513214505229",
    sourceLabel: togashiLabel,
  },
  {
    chapter: 432,
    status: "inking",
    updatedAt: "2026-07-11",
    source: "https://x.com/Un4v5s8bgsVk9Xp/status/2075732291931009110",
    sourceLabel: togashiLabel,
  },
  {
    chapter: 433,
    status: "inking",
    updatedAt: "2026-08-03",
    source: "https://x.com/Un4v5s8bgsVk9Xp/status/2084155567363539307",
    sourceLabel: togashiLabel,
  },
];

const unknown: ChapterRecord[] = Array.from({ length: 7 }, (_, index) => ({
  chapter: 434 + index,
  status: "unknown",
}));

export const chapters = [...published, ...progress, ...unknown].sort(
  (a, b) => a.chapter - b.chapter,
);

export const lastUpdated = "2026-09-02";

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
  (chapter) => chapter.sourceLabel === togashiLabel && chapter.updatedAt,
);

// ISO dates compare lexicographically, and chapters are already in ascending
// order, so >= lets the higher chapter win a same-day tie.
export const latestUpdate = togashiUpdates.reduce(
  (latest, chapter) =>
    (chapter.updatedAt ?? "") >= (latest.updatedAt ?? "") ? chapter : latest,
  togashiUpdates[0] ?? chapters[0],
);

const dayMs = 24 * 60 * 60 * 1000;

function daysBetween(releaseAt: string, throughDate: string) {
  return Math.round(
    (Date.parse(`${throughDate}T00:00:00+09:00`) - Date.parse(releaseAt)) /
      dayMs,
  );
}

// Weekly Jump skips issues routinely; a gap past roughly five weeks is a break
// rather than the normal schedule. Measured against `lastUpdated`, never the
// clock, so the server and client always render the same thing.
export const serialization: "publishing" | "hiatus" =
  latestPublished.releaseAt &&
  daysBetween(latestPublished.releaseAt, lastUpdated) <= 35
    ? "publishing"
    : "hiatus";
