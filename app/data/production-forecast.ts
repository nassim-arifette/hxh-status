// Production scenario: reported completion events, then editorial waiting time.
// This scenario assumes a ten-chapter batch; it is NOT an editorial requirement.
import type { HiatusRecord } from "./hiatus-stats";
import { fitPosterior, predictiveSurvival, japanDate, regularizedBeta, FORECAST_PRIOR } from "./release-forecast.ts";
const DAY = 86_400_000;
export type CompletionPost = { createdAt: string; originalText: string; url: string; author: { id: string } };
export function completionEvents(posts: readonly CompletionPost[], asOf: string) {
  const events = new Map<number, { chapter: number; date: string; url: string }>();
  for (const post of posts) {
    if (post.author.id !== "1528978792617611264" || !Number.isFinite(Date.parse(post.createdAt))) continue;
    const date = japanDate(new Date(post.createdAt));
    const match = post.originalText.match(/No\.(\d+)\s*(?:話)?\s*[、,]?\s*原稿完成[。.!]/u);
    if (!match || date > asOf) continue;
    const chapter = Number(match[1]);
    if (!events.has(chapter) || date < events.get(chapter)!.date) events.set(chapter, { chapter, date, url: post.url });
  }
  return events;
}
export function productionCdf(days: number, remaining: number, shape: number, rate: number) {
  if (days < 0) return 0;
  if (!remaining) return 1;
  return regularizedBeta(days / (rate + days), remaining, shape);
}
function invert(cdf: (days: number) => number, p: number) {
  let lo = 0, hi = 365;
  while (cdf(hi) < p && hi < 365_000) hi *= 2;
  for (let i = 0; i < 55; i++) {
    const mid = (lo + hi) / 2;
    if (cdf(mid) < p) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
export function deriveProductionForecast({ posts, records, chapter, asOf, integrationPoints = 256, lagPriorDays = 90 }: {
  posts: readonly CompletionPost[]; records: readonly HiatusRecord[]; chapter: number; asOf: string; integrationPoints?: number; lagPriorDays?: number;
}) {
  if (!Number.isFinite(Date.parse(asOf)) || chapter % 10 !== 1 || integrationPoints < 16 || !Number.isInteger(integrationPoints) || !(lagPriorDays > 0)) return null;
  const events = completionEvents(posts, asOf), first = events.get(chapter);
  if (!first) return null;
  const batch = Array.from({ length: 10 }, (_, i) => events.get(chapter + i)).filter(e => e !== undefined);
  // Gaps or out-of-order reports do not identify a consecutive completion rate.
  if (batch.length < 3 || batch.some((e, i) => e.chapter !== chapter + i || (i > 0 && e.date < batch[i - 1].date))) return null;
  const last = batch.at(-1)!;
  const exposure = (Date.parse(batch.length === 10 ? last.date : asOf) - Date.parse(first.date)) / DAY;
  if (!(exposure > 0)) return null;
  const shape = 1 + batch.length - 1, rate = 30 + exposure, remaining = 10 - batch.length;
  const lagSamples = records.flatMap(r => {
    if (!r.resumedWithChapter || r.resumedWithChapter >= chapter || r.resumedWithChapter % 10 !== 1 || !r.resumedOnDate || r.resumedOnDate > asOf) return [];
    const end = events.get(r.resumedWithChapter + 9);
    if (!end) return [];
    const days = (Date.parse(r.resumedOnDate) - Date.parse(end.date)) / DAY;
    return days > 0 ? [{ chapter: r.resumedWithChapter, days, completedOn: end.date, resumedOn: r.resumedOnDate, url: end.url }] : [];
  });
  if (!lagSamples.length) return null;
  const lag = fitPosterior(lagSamples.map(r => r.days), { ...FORECAST_PRIOR, mu: Math.log(lagPriorDays) });
  const elapsedLag = remaining ? 0 : (Date.parse(asOf) - Date.parse(last.date)) / DAY;
  const waits = remaining ? Array.from({ length: integrationPoints }, (_, i) => invert(t => productionCdf(t, remaining, shape, rate), (i + .5) / integrationPoints)) : [0];
  // Deterministic midpoint quadrature over production quantiles; independent lag.
  const cdf = (days: number) => days <= 0 ? 0 : waits.reduce((sum, wait) => sum + (days <= wait ? 0 : 1 - predictiveSurvival(elapsedLag + days - wait, lag) / predictiveSurvival(elapsedLag, lag)), 0) / waits.length;
  const date = (p: number) => new Date(Date.parse(asOf) + Math.ceil(invert(cdf, p)) * DAY).toISOString().slice(0, 10);
  return { asOf, batch, remaining, exposure, shape, rate, lag, lagSamples, lowerDate: date(.1), medianDate: date(.5), upperDate: date(.9),
    horizons: [90, 180, 365, 730].map(days => ({ days, probability: cdf(days) })),
    curve: Array.from({ length: 25 }, (_, i) => ({ days: i * 365.2425 / 12, probability: cdf(i * 365.2425 / 12) })),
  };
}
