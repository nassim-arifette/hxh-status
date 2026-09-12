import type { HiatusRecord } from "./hiatus-stats";

export const FORECAST_VERSION = "historical-hiatus-v1";
export const FORECAST_START_YEAR = 2014;
export const DAYS_PER_JUMP_ISSUE = 365.2425 / 48;
const DAY = 86_400_000;

export function japanDate(now = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function quantile(values: readonly number[], probability: number): number {
  if (!values.length || probability < 0 || probability > 1 || !Number.isFinite(probability) || values.some(value => !Number.isFinite(value))) {
    throw new Error("Quantiles require finite observations and a probability in [0,1].");
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * probability;
  const lower = Math.floor(index);
  return sorted[lower] + (sorted[Math.ceil(index)] - sorted[lower]) * (index - lower);
}

// Issue counts are not calendar weeks. Use an explicit 48-issue annual rate,
// including one issue for the return itself. Dates are approximate months,
// never an editorial schedule or a calibrated probability guarantee.
function durationDays(record: HiatusRecord) {
  return (record.issues + 1) * DAYS_PER_JUMP_ISSUE;
}

export function forecastSamples(records: readonly HiatusRecord[], startYear = FORECAST_START_YEAR) {
  return records.filter(record =>
    record.startYear >= startYear && record.issues >= 10 &&
    Number.isFinite(record.issues) &&
    Number.isInteger(record.precededByChapter) &&
    record.resumedWithChapter === record.precededByChapter! + 1,
  ).sort((a, b) => a.endYear - b.endYear || a.endIssue - b.endIssue);
}

export function backtestForecast(records: readonly HiatusRecord[]) {
  const samples = forecastSamples(records);
  const trials = samples.slice(3).map((actual, offset) => {
    // Rolling origin: no future examples can enter a historical prediction.
    const training = samples.slice(0, offset + 3).filter(record =>
      record.endYear < actual.startYear ||
      (record.endYear === actual.startYear && record.endIssue < actual.startIssue),
    ).map(durationDays);
    if (training.length < 3) return null;
    const predicted = quantile(training, 0.5);
    const lower = quantile(training, 0.1);
    const upper = quantile(training, 0.9);
    const observed = durationDays(actual);
    return { chapter: actual.resumedWithChapter, trainingCount: training.length, predictedDays: predicted, observedDays: observed, absoluteErrorDays: Math.abs(observed - predicted), covered: observed >= lower && observed <= upper };
  }).filter(trial => trial !== null);
  return {
    trials,
    count: trials.length,
    meanAbsoluteErrorDays: trials.length ? Math.round(trials.reduce((sum, trial) => sum + trial.absoluteErrorDays, 0) / trials.length) : null,
    covered: trials.filter(trial => trial.covered).length,
  };
}

export function deriveReleaseForecast({ records, chapter, nextChapter, chapterStatus, publicationStatus, sinceDate, asOf = japanDate() }: {
  records: readonly HiatusRecord[];
  chapter: number;
  nextChapter: number;
  chapterStatus: string;
  publicationStatus: string;
  sinceDate: string;
  asOf?: string;
}) {
  if (chapter !== nextChapter || publicationStatus !== "hiatus" || ["scheduled", "published"].includes(chapterStatus)) return null;
  const start = Date.parse(sinceDate);
  const today = Date.parse(asOf);
  if (!Number.isFinite(start) || !Number.isFinite(today) || today < start) return null;
  const elapsedDays = (today - start) / DAY;
  const samples = forecastSamples(records);
  const remaining = samples.filter(record => durationDays(record) > elapsedDays);
  // No invented tail extrapolation after the observed support is exhausted.
  if (remaining.length < 3) return null;
  const days = remaining.map(durationDays);
  const toDate = (value: number) => new Date(start + Math.round(value) * DAY).toISOString().slice(0, 10);
  const allRemaining = forecastSamples(records, 1998).map(durationDays).filter(value => value > elapsedDays);
  return {
    version: FORECAST_VERSION,
    asOf, chapter, sinceDate, elapsedDays,
    sampleCount: samples.length,
    remainingCount: remaining.length,
    samples,
    lowerDate: toDate(quantile(days, 0.1)),
    medianDate: toDate(quantile(days, 0.5)),
    upperDate: toDate(quantile(days, 0.9)),
    allHistoryMedianDate: allRemaining.length >= 3 ? toDate(quantile(allRemaining, 0.5)) : null,
    backtest: backtestForecast(records),
  };
}
