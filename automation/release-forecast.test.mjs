import test from "node:test";
import assert from "node:assert/strict";
import history from "../app/data/publication-history.json" with { type: "json" };
import status from "../app/data/status-data.json" with { type: "json" };
import { deriveHiatusStats } from "../app/data/hiatus-stats.ts";
import { deriveReleaseForecast, forecastSamples, backtestForecast, quantile, japanDate } from "../app/data/release-forecast.ts";

const records = deriveHiatusStats(history, status, "2026-09-12").historicalHiatuses.major;
const input = { records, chapter: 421, nextChapter: 421, chapterStatus: "delivered", publicationStatus: "hiatus", sinceDate: "2026-09-07", asOf: "2026-09-12" };

test("quantiles interpolate unordered samples without modifying them", () => {
  const samples = [40, 10, 30, 20];
  assert.equal(quantile(samples, 0.5), 25);
  assert.equal(quantile(samples, 0.1), 13);
  assert.deepEqual(samples, [40, 10, 30, 20]);
  assert.throws(() => quantile([], .5));
  assert.throws(() => quantile([NaN], .5));
  assert.throws(() => quantile([1], 2));
});

test("forecast uses completed, consecutive numbered returns and excludes ongoing breaks", () => {
  const result = deriveReleaseForecast(input);
  assert.equal(result.sampleCount, 7);
  assert.equal(result.elapsedDays, 5);
  assert.equal(result.medianDate, "2028-03-23");
  assert.ok(result.lowerDate < result.medianDate && result.medianDate < result.upperDate);
  assert.equal(result.samples.some(sample => sample.resumedWithChapter === 421), false);
  const invalid = [{ ...records[0], resumedWithChapter: undefined }, { ...records[0], resumedWithChapter: 999 }];
  assert.equal(forecastSamples(invalid).length, 0);
});

test("forecast is withheld after an official schedule or for other chapters", () => {
  for (const override of [{chapterStatus:"scheduled"}, {chapterStatus:"published"}, {chapter:422}, {publicationStatus:"publishing"}, {sinceDate:"invalid"}, {asOf:"2026-09-01"}, {records:[]}]) {
    assert.equal(deriveReleaseForecast({...input,...override}), null);
  }
});

test("conditioning never predicts a past date and does not extrapolate an empty tail", () => {
  const later = deriveReleaseForecast({...input, asOf:"2027-09-12"});
  assert.ok(later.remainingCount < later.sampleCount);
  assert.ok(later.lowerDate > later.asOf);
  assert.equal(deriveReleaseForecast({...input,asOf:"2040-01-01"}), null);
});

test("backtest predictions are unchanged by later observations", () => {
  const full = backtestForecast(records);
  const chronological = forecastSamples(records);
  const first = backtestForecast(chronological.slice(0, 4));
  assert.deepEqual(first.trials[0], full.trials[0]);
  assert.equal(full.count, 4);
  assert.equal(full.covered, 2);
  assert.equal(full.meanAbsoluteErrorDays, 422);
});

test("calendar date uses Japan midnight, including UTC year boundaries", () => {
  assert.equal(japanDate(new Date("2026-12-31T16:00:00Z")), "2027-01-01");
  assert.equal(japanDate(new Date("2026-09-11T15:00:00Z")), "2026-09-12");
  assert.equal(deriveHiatusStats(history,status,"2026-09-12").currentHiatus.elapsedDays, 5);
});
