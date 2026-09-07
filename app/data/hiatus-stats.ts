export type HiatusRecord = {
  startYear: number;
  startIssue: number;
  endYear: number;
  endIssue: number;
  issues: number;
};

export type PublicationRunRecord = {
  startYear: number;
  startIssue: number;
  startChapter?: number | string;
  endYear: number;
  endIssue: number;
  endChapter?: number | string;
  length: number;
};

export type LeadTimeObservation = {
  batch: string;
  startChapter: number;
  endChapter: number;
  deliveryDate: string;
  releaseDate: string;
  delayDays: number;
  source: string;
};

export type PublicationIssueInput = {
  year: number;
  number: number;
  released?: boolean;
  chapter?: number | string;
  date?: string;
  arc?: string;
};

export type StatusDataInput = {
  lastUpdated?: string;
  hiatusAfterChapter?: number;
  chapters?: readonly {
    chapter: number;
    status: string;
    releaseAt?: string;
    updatedAt?: string;
    jumpIssue?: string;
  }[];
};

export type HiatusStatsSummary = {
  currentHiatus: {
    elapsedIssues: number;
    elapsedDays: number;
    sinceDate: string;
    sinceChapter: number;
    sinceJumpIssue: string;
    historicalRank: number;
    totalHistoricalHiatuses: number;
    isJustStarted: boolean;
  };
  historicalHiatuses: {
    totalCount: number;
    medianIssuesAll: number;
    majorThreshold: number;
    majorCount: number;
    medianIssuesMajor: number;
    medianDaysMajorApprox: number;
    maxIssues: number;
    maxHiatus: {
      startYear: number;
      startIssue: number;
      endYear: number;
      endIssue: number;
      issues: number;
      approxYears: number;
    };
  };
  publicationRuns: {
    totalRunsCount: number;
    medianRunLength: number;
    modernBatchSize: number;
    modernRunsCount: number;
    modernBatchConsistencyPercent: number;
    longestRun: {
      startYear: number;
      startIssue: number;
      endYear: number;
      endIssue: number;
      startChapter?: number | string;
      endChapter?: number | string;
      length: number;
    };
  };
  publicationRate: {
    totalJumpIssues: number;
    totalChaptersPublished: number;
    publishedPercentage: number;
    hiatusPercentage: number;
  };
  leadTime: {
    observedBatchesCount: number;
    medianLeadTimeDays: number;
    currentDeliveredCount: number;
    currentDeliveredTarget: number;
    observations: readonly LeadTimeObservation[];
  };
};

export const LEAD_TIME_OBSERVATIONS: readonly LeadTimeObservation[] = [
  {
    batch: "Ch. 391–400",
    startChapter: 391,
    endChapter: 400,
    deliveryDate: "2022-07-25",
    releaseDate: "2022-10-24",
    delayDays: 91,
    source: "Yoshihiro Togashi on X (@Un4v5s8bgsVk9Xp) & WSJ 2022 #47",
  },
  {
    batch: "Ch. 401–410",
    startChapter: 401,
    endChapter: 410,
    deliveryDate: "2024-07-25",
    releaseDate: "2024-10-07",
    delayDays: 74,
    source: "Yoshihiro Togashi on X (@Un4v5s8bgsVk9Xp) & WSJ 2024 #45",
  },
];

export function calculateMedian(numbers: readonly number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1));
}

export function deriveHiatusStats(
  issues: readonly PublicationIssueInput[],
  statusData?: StatusDataInput,
  currentDateStr = "2026-09-07",
): HiatusStatsSummary {
  // Chronological order (oldest first: 1998 #14 -> 2026 #41)
  const chronological = [...issues].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.number - b.number,
  );

  const pastHiatuses: HiatusRecord[] = [];
  let curHiatus: HiatusRecord | null = null;

  const pastRuns: PublicationRunRecord[] = [];
  let curRun: PublicationRunRecord | null = null;

  for (const issue of chronological) {
    if (!issue.released) {
      if (curRun) {
        pastRuns.push(curRun);
        curRun = null;
      }
      if (!curHiatus) {
        curHiatus = {
          startYear: issue.year,
          startIssue: issue.number,
          endYear: issue.year,
          endIssue: issue.number,
          issues: 1,
        };
      } else {
        curHiatus.endYear = issue.year;
        curHiatus.endIssue = issue.number;
        curHiatus.issues++;
      }
    } else {
      if (curHiatus) {
        pastHiatuses.push(curHiatus);
        curHiatus = null;
      }
      if (!curRun) {
        curRun = {
          startYear: issue.year,
          startIssue: issue.number,
          startChapter: issue.chapter,
          endYear: issue.year,
          endIssue: issue.number,
          endChapter: issue.chapter,
          length: 1,
        };
      } else {
        curRun.endYear = issue.year;
        curRun.endIssue = issue.number;
        curRun.endChapter = issue.chapter;
        curRun.length++;
      }
    }
  }

  if (curRun) {
    pastRuns.push(curRun);
    curRun = null;
  }

  // If the dataset ends with an ongoing hiatus, curHiatus is the current ongoing hiatus
  // If the dataset ends with a release, but statusData indicates a hiatus after the latest chapter,
  // the current hiatus has 0 issues elapsed in the recorded issues so far.
  const elapsedIssues = curHiatus ? curHiatus.issues : 0;

  // Find latest published chapter
  const latestPublishedIssue = [...chronological]
    .reverse()
    .find((issue) => issue.released);

  const sinceChapter = Number(
    statusData?.hiatusAfterChapter ?? latestPublishedIssue?.chapter ?? 420,
  );
  const sinceDate =
    latestPublishedIssue?.date ?? statusData?.lastUpdated ?? "2026-09-07";
  const sinceJumpIssue = latestPublishedIssue
    ? `${latestPublishedIssue.year} #${String(latestPublishedIssue.number).padStart(2, "0")}`
    : "2026 #41";

  // Days elapsed
  const msPerDay = 1000 * 60 * 60 * 24;
  const elapsedDays = Math.max(
    0,
    Math.floor(
      (new Date(currentDateStr).getTime() - new Date(sinceDate).getTime()) /
        msPerDay,
    ),
  );

  // Hiatus rankings: 1 is longest
  // Count past hiatuses with strictly more issues
  const strictlyLonger = pastHiatuses.filter(
    (h) => h.issues > elapsedIssues,
  ).length;
  const historicalRank = strictlyLonger + 1;

  // All hiatus statistics
  const allHiatusLengths = pastHiatuses.map((h) => h.issues);
  const majorThreshold = 10;
  const majorHiatuses = pastHiatuses.filter(
    (h) => h.issues >= majorThreshold,
  );
  const majorHiatusLengths = majorHiatuses.map((h) => h.issues);

  const maxHiatusRecord = [...pastHiatuses].sort(
    (a, b) => b.issues - a.issues,
  )[0] ?? {
    startYear: 2019,
    startIssue: 1,
    endYear: 2022,
    endIssue: 46,
    issues: 184,
  };

  // Run statistics
  const runLengths = pastRuns.map((r) => r.length);
  const modernRuns = pastRuns.filter((r) => r.startYear >= 2017);
  const modernBatch10Runs = modernRuns.filter((r) => r.length === 10);
  const modernBatchConsistencyPercent =
    modernRuns.length > 0
      ? Math.round((modernBatch10Runs.length / modernRuns.length) * 100)
      : 100;

  const longestRunRecord = [...pastRuns].sort(
    (a, b) => b.length - a.length,
  )[0] ?? {
    startYear: 2011,
    startIssue: 35,
    endYear: 2012,
    endIssue: 16,
    startChapter: 311,
    endChapter: 340,
    length: 30,
  };

  // Publication rate
  const totalJumpIssues = chronological.length;
  const totalChaptersPublished = chronological.filter(
    (i) => i.released,
  ).length;
  const publishedPercentage = Number(
    ((totalChaptersPublished / (totalJumpIssues || 1)) * 100).toFixed(1),
  );
  const hiatusPercentage = Number((100 - publishedPercentage).toFixed(1));

  // Lead time stats
  const leadTimeDelays = LEAD_TIME_OBSERVATIONS.map((o) => o.delayDays);
  const medianLeadTimeDays = calculateMedian(leadTimeDelays);

  const currentDeliveredCount = (statusData?.chapters ?? []).filter(
    (c) => c.status === "delivered",
  ).length;

  return {
    currentHiatus: {
      elapsedIssues,
      elapsedDays,
      sinceDate,
      sinceChapter,
      sinceJumpIssue,
      historicalRank,
      totalHistoricalHiatuses: pastHiatuses.length,
      isJustStarted: elapsedIssues === 0,
    },
    historicalHiatuses: {
      totalCount: pastHiatuses.length,
      medianIssuesAll: calculateMedian(allHiatusLengths),
      majorThreshold,
      majorCount: majorHiatuses.length,
      medianIssuesMajor: calculateMedian(majorHiatusLengths),
      medianDaysMajorApprox: Math.round(
        calculateMedian(majorHiatusLengths) * 7,
      ),
      maxIssues: maxHiatusRecord.issues,
      maxHiatus: {
        startYear: maxHiatusRecord.startYear,
        startIssue: maxHiatusRecord.startIssue,
        endYear: maxHiatusRecord.endYear,
        endIssue: maxHiatusRecord.endIssue,
        issues: maxHiatusRecord.issues,
        approxYears: Number((maxHiatusRecord.issues / 48).toFixed(1)),
      },
    },
    publicationRuns: {
      totalRunsCount: pastRuns.length,
      medianRunLength: calculateMedian(runLengths),
      modernBatchSize: 10,
      modernRunsCount: modernRuns.length,
      modernBatchConsistencyPercent,
      longestRun: {
        startYear: longestRunRecord.startYear,
        startIssue: longestRunRecord.startIssue,
        endYear: longestRunRecord.endYear,
        endIssue: longestRunRecord.endIssue,
        startChapter: longestRunRecord.startChapter,
        endChapter: longestRunRecord.endChapter,
        length: longestRunRecord.length,
      },
    },
    publicationRate: {
      totalJumpIssues,
      totalChaptersPublished,
      publishedPercentage,
      hiatusPercentage,
    },
    leadTime: {
      observedBatchesCount: LEAD_TIME_OBSERVATIONS.length,
      medianLeadTimeDays,
      currentDeliveredCount,
      currentDeliveredTarget: 10,
      observations: LEAD_TIME_OBSERVATIONS,
    },
  };
}
