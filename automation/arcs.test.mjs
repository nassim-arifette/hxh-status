import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  ARCS,
  deriveArcStats,
  formatArcYears,
  formatArcDuration,
  getArcName,
  PRESENT_LABEL,
} from "../app/data/arcs.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const historyData = JSON.parse(
  readFileSync(join(__dirname, "../app/data/publication-history.json"), "utf8"),
);

test("deriveArcStats computes factual stats for all arcs", () => {
  const summary = deriveArcStats(historyData);

  assert.equal(summary.arcs.length, ARCS.length);
  assert.equal(summary.currentArc.id, "succ-war");
  assert.equal(summary.currentArc.isCurrent, true);

  // Succession War stats
  const succWar = summary.currentArc;
  assert.equal(succWar.chapterCount, 72);
  assert.equal(succWar.startYear, 2014);
  assert.equal(succWar.startChapter, 349);
  assert.equal(succWar.endChapter, 420);
  assert.equal(succWar.chapterRank, 2); // 2nd after Chimera Ant
  assert.equal(succWar.durationRank, 1); // 1st in calendar duration (12+ yrs)

  // Chimera Ant stats
  const chimera = summary.arcs.find((a) => a.id === "chimera-ant");
  assert.ok(chimera);
  assert.equal(chimera.chapterCount, 133);
  assert.equal(chimera.startChapter, 186);
  assert.equal(chimera.endChapter, 318);
  assert.equal(chimera.chapterRank, 1);
  assert.equal(chimera.durationRank, 2);

  // Hunter Exam stats
  const exam = summary.arcs.find((a) => a.id === "hunter-exam");
  assert.ok(exam);
  assert.equal(exam.chapterCount, 38);
  assert.equal(exam.startChapter, 1);
  assert.equal(exam.endChapter, 38);

  // Max chapters and max span issues
  assert.equal(summary.maxChapters, 133);
  assert.equal(summary.maxSpanIssues, succWar.spanIssues);
});

test("formatArcYears respects locale for current arc and spans", () => {
  const summary = deriveArcStats(historyData);
  const succWar = summary.currentArc;
  const exam = summary.arcs.find((a) => a.id === "hunter-exam");
  const zoldyck = summary.arcs.find((a) => a.id === "zoldyck");

  assert.equal(formatArcYears(succWar, "en"), "2014–Present");
  assert.equal(formatArcYears(succWar, "fr"), "2014–Présent");
  assert.equal(formatArcYears(succWar, "ja"), "2014–現在");
  assert.equal(formatArcYears(succWar, "zh"), "2014–至今");
  assert.equal(formatArcYears(succWar, "ar"), "2014–الآن");

  assert.equal(formatArcYears(exam, "en"), "1998–1999");
  assert.equal(formatArcYears(zoldyck, "en"), "1999");
});

test("formatArcDuration formats years and months properly", () => {
  const summary = deriveArcStats(historyData);
  const succWar = summary.currentArc;
  const zoldyck = summary.arcs.find((a) => a.id === "zoldyck");

  const enMessages = { durationYears: "{years} yrs", durationMonths: "{months} mos" };
  const frMessages = { durationYears: "{years} ans", durationMonths: "{months} mois" };

  assert.equal(formatArcDuration(succWar, enMessages), "12.1 yrs");
  assert.equal(formatArcDuration(succWar, frMessages), "12.1 ans");

  assert.equal(formatArcDuration(zoldyck, enMessages), "1 mos");
  assert.equal(formatArcDuration(zoldyck, frMessages), "1 mois");
});

test("getArcName supports all 7 locales", () => {
  const locales = ["en", "fr", "ja", "es", "pt", "zh", "ar"];
  for (const locale of locales) {
    const name = getArcName("succ-war", locale);
    assert.ok(name && name.length > 0);
    assert.ok(PRESENT_LABEL[locale]);
  }
});
