import test from "node:test";
import assert from "node:assert/strict";
import { forecastMonths } from "../app/data/forecast-months.ts";

test("calendar months use CDF differences, including leap days and a partial month", () => {
  const asOf = "2024-02-15";
  const cdf = days => 1 - Math.exp(-days / 100);
  const buckets = forecastMonths(asOf, cdf);
  const feb = buckets.find(m => m.month === "2024-02-01");
  const march = buckets.find(m => m.month === "2024-03-01");
  assert.ok(Math.abs(feb.probability - cdf(14)) < 1e-12);
  assert.ok(Math.abs(march.probability - (cdf(45) - cdf(14))) < 1e-12);
  assert.equal(buckets.length, 6);
  assert.ok(Math.abs(buckets.reduce((s, b) => s + b.probability, 0) - 1) < 1e-12);
  assert.equal(buckets.reduce((s, b) => s + Math.round(b.displayProbability * 1000), 0), 1000);
});

test("ranks delayed peaks beyond two years and preserves the unbounded tail", () => {
  const cdf = days => days <= 900 ? 0 : 1 - Math.exp(-(days - 900) / 80);
  const buckets = forecastMonths("2026-12-31", cdf);
  assert.ok(buckets.slice(0, 5).every(m => m.month >= "2029-01-01"));
  assert.ok(buckets.at(-1).probability > 0);
  for (let i = 1; i < 5; i++) assert.ok(buckets[i - 1].probability >= buckets[i].probability);
});

test("invalid CDFs fail rather than publishing fabricated percentages", () => {
  assert.throws(() => forecastMonths("2026-09-12", () => NaN));
  assert.throws(() => forecastMonths("invalid", () => 0));
});
