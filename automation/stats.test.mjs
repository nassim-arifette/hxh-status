import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  deriveHiatusStats,
  calculateMedian,
  LEAD_TIME_OBSERVATIONS,
} from "../app/data/hiatus-stats.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const historyData = JSON.parse(
  readFileSync(join(__dirname, "../app/data/publication-history.json"), "utf8"),
);
const statusData = JSON.parse(
  readFileSync(join(__dirname, "../app/data/status-data.json"), "utf8"),
);

test("calculateMedian computes correct median for odd, even, and empty arrays", () => {
  assert.equal(calculateMedian([]), 0);
  assert.equal(calculateMedian([5]), 5);
  assert.equal(calculateMedian([1, 10, 3]), 3);
  assert.equal(calculateMedian([1, 2, 3, 4]), 2.5);
  assert.equal(calculateMedian([10, 50, 20, 60]), 35);
});

test("deriveHiatusStats computes factual stats from full publication history", () => {
  const stats = deriveHiatusStats(historyData, statusData);

  // Historical hiatuses
  assert.equal(stats.historicalHiatuses.totalCount, 86);
  assert.equal(stats.historicalHiatuses.medianIssuesAll, 1);
  assert.equal(stats.historicalHiatuses.majorThreshold, 10);
  assert.equal(stats.historicalHiatuses.majorCount, 13);
  assert.equal(stats.historicalHiatuses.medianIssuesMajor, 56);
  assert.equal(stats.historicalHiatuses.medianDaysMajorApprox, 392);
  assert.equal(stats.historicalHiatuses.maxIssues, 184);
  assert.equal(stats.historicalHiatuses.maxHiatus.startYear, 2019);
  assert.equal(stats.historicalHiatuses.maxHiatus.startIssue, 1);
  assert.equal(stats.historicalHiatuses.maxHiatus.endYear, 2022);
  assert.equal(stats.historicalHiatuses.maxHiatus.endIssue, 46);
  assert.equal(stats.historicalHiatuses.maxHiatus.approxYears, 3.8);

  // Publication runs
  assert.equal(stats.publicationRuns.totalRunsCount, 87);
  assert.equal(stats.publicationRuns.medianRunLength, 3);
  assert.equal(stats.publicationRuns.modernBatchSize, 10);
  assert.equal(stats.publicationRuns.modernRunsCount, 6);
  assert.equal(stats.publicationRuns.modernBatchConsistencyPercent, 100);
  assert.equal(stats.publicationRuns.longestRun.length, 30);
  assert.equal(stats.publicationRuns.longestRun.startChapter, 311);
  assert.equal(stats.publicationRuns.longestRun.endChapter, 340);

  // Publication rate
  assert.equal(stats.publicationRate.totalJumpIssues, 1370);
  assert.equal(stats.publicationRate.totalChaptersPublished, 422);
  assert.equal(stats.publicationRate.publishedPercentage, 30.8);
  assert.equal(stats.publicationRate.hiatusPercentage, 69.2);

  // Current hiatus right after chapter 420
  assert.equal(stats.currentHiatus.sinceChapter, 420);
  assert.equal(stats.currentHiatus.sinceJumpIssue, "2026 #41");
  assert.equal(stats.currentHiatus.elapsedIssues, 0);
  assert.equal(stats.currentHiatus.isJustStarted, true);
  assert.equal(stats.currentHiatus.historicalRank, 87);

  // Production lead time
  assert.equal(stats.leadTime.observedBatchesCount, LEAD_TIME_OBSERVATIONS.length);
  assert.ok(stats.leadTime.medianLeadTimeDays > 0);
  assert.equal(stats.leadTime.currentDeliveredCount, 7);
  assert.equal(stats.leadTime.currentDeliveredTarget, 10);
});

test("LEAD_TIME_OBSERVATIONS have valid sources and dates", () => {
  assert.ok(LEAD_TIME_OBSERVATIONS.length >= 2);
  for (const obs of LEAD_TIME_OBSERVATIONS) {
    assert.ok(obs.batch.length > 0);
    assert.ok(obs.delayDays > 0);
    assert.ok(obs.deliveryDate.match(/^\d{4}-\d{2}-\d{2}$/));
    assert.ok(obs.releaseDate.match(/^\d{4}-\d{2}-\d{2}$/));
    assert.ok(obs.source.length > 0);
  }
});

test("deriveHiatusStats calculates rank correctly when hiatuses elapse", () => {
  // Mock history ending with an unreleased hiatus of 60 issues
  const mockIssues = [
    { year: 1998, number: 1, released: true, chapter: 1 },
    { year: 1998, number: 2, released: false }, // past hiatus 1 issue
    { year: 1998, number: 3, released: true, chapter: 2 },
    { year: 1998, number: 4, released: false },
    { year: 1998, number: 5, released: false }, // past hiatus 2 issues
    { year: 1998, number: 6, released: true, chapter: 3 },
    { year: 1998, number: 7, released: false }, // current ongoing hiatus: 2 issues
    { year: 1998, number: 8, released: false },
  ];

  const stats = deriveHiatusStats(mockIssues);
  assert.equal(stats.currentHiatus.elapsedIssues, 2);
  assert.equal(stats.currentHiatus.isJustStarted, false);
  // Past hiatuses were: 1 issue, 2 issues.
  // Current has 2 issues. Past hiatuses strictly longer than 2: 0. Rank: 1.
  assert.equal(stats.currentHiatus.historicalRank, 1);
});
