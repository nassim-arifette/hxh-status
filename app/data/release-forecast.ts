import type { HiatusRecord } from "./hiatus-stats";

export const FORECAST_VERSION = "bayesian-lognormal-nig-v2";
export const FORECAST_START_YEAR = 2014;
export const DAYS_PER_JUMP_ISSUE = 365.2425 / 48;
const DAY = 86_400_000;
export type Prior = { mu: number; kappa: number; alpha: number; beta: number };
// Normal-inverse-gamma, beta is the inverse-gamma SCALE (not rate).
export const FORECAST_PRIOR: Readonly<Prior> = Object.freeze({ mu: Math.log(365.2425), kappa: 0.25, alpha: 2, beta: 1 });

export function japanDate(now = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function logGamma(z: number): number {
  const c = [676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406, 12.507343278686905, -0.13857109526572012, 9.984369578019572e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  let x = 0.9999999999998099;
  c.forEach((value, i) => { x += value / (z + i + 1); });
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

// Regularized incomplete beta; modified Lentz continued fraction.
function betaFraction(a: number, b: number, x: number): number {
  const tiny = 1e-300;
  const safe = (v: number) => Math.abs(v) < tiny ? tiny : v;
  let c = 1, d = 1 / safe(1 - (a + b) * x / (a + 1)), h = d;
  for (let m = 1; m <= 300; m++) {
    const even = 2 * m;
    for (const aa of [m * (b - m) * x / ((a + even - 1) * (a + even)), -(a + m) * (a + b + m) * x / ((a + even) * (a + even + 1))]) {
      d = 1 / safe(1 + aa * d);
      c = safe(1 + aa / c);
      const delta = c * d;
      h *= delta;
      if (aa < 0 && Math.abs(delta - 1) < 3e-14) return h;
    }
  }
  throw new Error("Incomplete beta did not converge");
}
export function regularizedBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const factor = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log1p(-x));
  return x < (a + 1) / (a + b + 2) ? factor * betaFraction(a, b, x) / a : 1 - factor * betaFraction(b, a, 1 - x) / b;
}
export function studentSurvival(z: number, df: number): number {
  if (!(df > 0) || Number.isNaN(z)) throw new Error("Invalid Student-t parameters");
  // Avoid loss of z² when the incomplete-beta argument rounds to one.
  if (Math.abs(z) < 1e-5) {
    const densityAtZero = Math.exp(logGamma((df + 1) / 2) - logGamma(df / 2)) / Math.sqrt(df * Math.PI);
    return .5 - densityAtZero * (z - (df + 1) * z ** 3 / (6 * df));
  }
  const tail = 0.5 * regularizedBeta(df / (df + z * z), df / 2, 0.5);
  return z >= 0 ? tail : 1 - tail;
}

export function fitPosterior(days: readonly number[], prior: Readonly<Prior> = FORECAST_PRIOR) {
  if (!Number.isFinite(prior.mu) || ![prior.kappa, prior.alpha, prior.beta].every(v => Number.isFinite(v) && v > 0) || days.some(v => !Number.isFinite(v) || v <= 0)) throw new Error("Invalid Bayesian observations or prior");
  const y = days.map(Math.log), n = y.length;
  const mean = n ? y.reduce((s, v) => s + v, 0) / n : 0;
  const kappa = prior.kappa + n;
  const mu = (prior.kappa * prior.mu + n * mean) / kappa;
  const alpha = prior.alpha + n / 2;
  const beta = prior.beta + y.reduce((s, v) => s + (v - mean) ** 2, 0) / 2 + prior.kappa * n * (mean - prior.mu) ** 2 / (2 * kappa);
  return { n, mu, kappa, alpha, beta, df: 2 * alpha, scale: Math.sqrt(beta * (kappa + 1) / (alpha * kappa)) };
}
export type Posterior = ReturnType<typeof fitPosterior>;
export function predictiveSurvival(days: number, posterior: Posterior): number {
  return days <= 0 ? 1 : studentSurvival((Math.log(days) - posterior.mu) / posterior.scale, posterior.df);
}
export function conditionalProbability(days: number, elapsed: number, posterior: Posterior): number {
  if (days <= elapsed) return 0;
  return Math.max(0, Math.min(1, 1 - predictiveSurvival(days, posterior) / predictiveSurvival(elapsed, posterior)));
}
export function predictiveQuantile(p: number, elapsed: number, posterior: Posterior): number {
  if (!(p > 0 && p < 1) || !Number.isFinite(elapsed) || elapsed < 0) throw new Error("Invalid predictive quantile");
  const target = (1 - p) * predictiveSurvival(elapsed, posterior);
  let lo = Math.min(-32, posterior.mu - 32 * posterior.scale), hi = Math.max(32, posterior.mu + 32 * posterior.scale);
  while (studentSurvival((hi - posterior.mu) / posterior.scale, posterior.df) > target && hi < 700) hi *= 2;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (studentSurvival((mid - posterior.mu) / posterior.scale, posterior.df) > target) lo = mid;
    else hi = mid;
  }
  return Math.exp((lo + hi) / 2);
}
export function predictiveLogDensity(days: number, posterior: Posterior): number {
  const z = (Math.log(days) - posterior.mu) / posterior.scale, v = posterior.df;
  return logGamma((v + 1) / 2) - logGamma(v / 2) - Math.log(Math.PI * v) / 2 - Math.log(posterior.scale) - (v + 1) / 2 * Math.log1p(z * z / v) - Math.log(days);
}

export function durationDays(record: HiatusRecord): number {
  const exact = (Date.parse(record.resumedOnDate ?? "") - Date.parse(record.precededByDate ?? "")) / DAY;
  return Number.isFinite(exact) && exact > 0 ? exact : (record.issues + 1) * DAYS_PER_JUMP_ISSUE;
}
export function forecastSamples(records: readonly HiatusRecord[], startYear = FORECAST_START_YEAR) {
  // Selection uses era and chapter continuity, never the length of the outcome.
  return records.filter(r => r.startYear >= startYear && Number.isInteger(r.issues) && r.issues > 0 && Number.isInteger(r.precededByChapter) && r.resumedWithChapter === r.precededByChapter! + 1)
    .sort((a, b) => a.endYear - b.endYear || a.endIssue - b.endIssue);
}
export function backtestForecast(records: readonly HiatusRecord[]) {
  const samples = forecastSamples(records);
  const trials = samples.slice(3).flatMap(actual => {
    const training = samples.filter(r => r.endYear < actual.startYear || (r.endYear === actual.startYear && r.endIssue < actual.startIssue)).map(durationDays);
    if (training.length < 3) return [];
    const posterior = fitPosterior(training), observed = durationDays(actual);
    const predicted = predictiveQuantile(.5, 0, posterior), lower = predictiveQuantile(.1, 0, posterior), upper = predictiveQuantile(.9, 0, posterior);
    const logs = training.map(Math.log), mean = logs.reduce((s, v) => s + v, 0) / logs.length;
    const variance = Math.max(1e-8, logs.reduce((s, v) => s + (v - mean) ** 2, 0) / logs.length);
    const baselineLogScore = -.5 * Math.log(2 * Math.PI * variance) - (Math.log(observed) - mean) ** 2 / (2 * variance) - Math.log(observed);
    return [{ chapter: actual.resumedWithChapter, trainingCount: training.length, predictedDays: predicted, observedDays: observed,
      absoluteErrorDays: Math.abs(observed - predicted), baselineErrorDays: Math.abs(observed - Math.exp(mean)),
      covered: observed >= lower && observed <= upper, logScore: predictiveLogDensity(observed, posterior), baselineLogScore,
      // Proper central 80% interval score: rewards sharpness, penalizes misses.
      intervalScore: upper - lower + 10 * Math.max(0, lower - observed) + 10 * Math.max(0, observed - upper),
    }];
  });
  const average = (key: "absoluteErrorDays" | "baselineErrorDays" | "logScore" | "baselineLogScore" | "intervalScore") => trials.length ? trials.reduce((s, t) => s + t[key], 0) / trials.length : null;
  return { trials, count: trials.length, meanAbsoluteErrorDays: average("absoluteErrorDays"), baselineErrorDays: average("baselineErrorDays"), logScore: average("logScore"), baselineLogScore: average("baselineLogScore"), intervalScore: average("intervalScore"), covered: trials.filter(t => t.covered).length };
}
export function deriveReleaseForecast({ records, chapter, nextChapter, chapterStatus, publicationStatus, sinceDate, asOf = japanDate() }: {
  records: readonly HiatusRecord[]; chapter: number; nextChapter: number; chapterStatus: string; publicationStatus: string; sinceDate: string; asOf?: string;
}) {
  if (chapter !== nextChapter || publicationStatus !== "hiatus" || ["scheduled", "published"].includes(chapterStatus)) return null;
  const start = Date.parse(sinceDate), today = Date.parse(asOf);
  if (!Number.isFinite(start) || !Number.isFinite(today) || today < start) return null;
  const elapsedDays = (today - start) / DAY;
  // Prevent future observations entering a historical snapshot.
  const available = records.filter(r => r.resumedOnDate ? Date.parse(r.resumedOnDate) <= today : r.endYear < Number(asOf.slice(0, 4)));
  const samples = forecastSamples(available);
  if (samples.length < 3) return null;
  const days = samples.map(durationDays), posterior = fitPosterior(days);
  const toDate = (value: number) => {
    const time = start + Math.ceil(value) * DAY;
    return Number.isFinite(time) && time < 8.64e15 ? new Date(time).toISOString().slice(0, 10) : null;
  };
  const lowerDate = toDate(predictiveQuantile(.1, elapsedDays, posterior));
  const medianDate = toDate(predictiveQuantile(.5, elapsedDays, posterior));
  const upperDate = toDate(predictiveQuantile(.9, elapsedDays, posterior));
  if (!lowerDate || !medianDate || !upperDate) return null;
  return { version: FORECAST_VERSION, asOf, chapter, sinceDate, elapsedDays, sampleCount: samples.length, samples, posterior,
    exactDateCount: samples.filter(r => r.precededByDate && r.resumedOnDate).length,
    lowerDate, medianDate, upperDate,
    allHistoryMedianDate: toDate(predictiveQuantile(.5, elapsedDays, fitPosterior(forecastSamples(available, 1998).map(durationDays)))),
    priorSensitivity: [180, 730].map(center => ({ center, date: toDate(predictiveQuantile(.5, elapsedDays, fitPosterior(days, { ...FORECAST_PRIOR, mu: Math.log(center) }))) })),
    horizons: [90, 180, 365, 730].map(horizon => ({ days: horizon, probability: conditionalProbability(elapsedDays + horizon, elapsedDays, posterior) })),
    curve: Array.from({ length: 25 }, (_, i) => ({ days: i * 365.2425 / 12, probability: conditionalProbability(elapsedDays + i * 365.2425 / 12, elapsedDays, posterior) })),
    backtest: backtestForecast(available),
  };
}
