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
    recentBatchSize: number;
    recentRunsCount: number;
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
  };
};

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
  const latestRun = pastRuns.at(-1);
  const recentBatchSize = latestRun?.length ?? 0;
  let recentRunsCount = 0;
  for (let index = pastRuns.length - 1; index >= 0; index--) {
    if (pastRuns[index].length !== recentBatchSize) break;
    recentRunsCount++;
  }

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

  return {
    currentHiatus: {
      elapsedIssues,
      elapsedDays,
      sinceDate,
      sinceChapter,
      sinceJumpIssue,
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
      recentBatchSize,
      recentRunsCount,
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
    },
  };
}
