import test from "node:test";
import assert from "node:assert/strict";

import {
  renderSvgBadge,
  generateBadges,
  measureText,
} from "./badges.mjs";

const mockStatusData = {
  lastUpdated: "2026-09-07",
  hiatusAfterChapter: 420,
  chapters: [
    {
      chapter: 420,
      status: "published",
      releaseAt: "2026-09-07T00:00:00+09:00",
      updatedAt: "2026-09-07",
      jumpIssue: "41",
    },
    {
      chapter: 421,
      status: "delivered",
      updatedAt: "2026-05-26",
    },
    {
      chapter: 422,
      status: "delivered",
      updatedAt: "2026-07-01",
    },
    {
      chapter: 423,
      status: "delivered",
      updatedAt: "2026-07-07",
    },
    {
      chapter: 424,
      status: "delivered",
      updatedAt: "2026-08-08",
    },
    {
      chapter: 425,
      status: "delivered",
      updatedAt: "2026-08-11",
    },
    {
      chapter: 426,
      status: "delivered",
      updatedAt: "2026-08-25",
    },
    {
      chapter: 427,
      status: "delivered",
      updatedAt: "2026-09-01",
      source: "https://x.com/Un4v5s8bgsVk9Xp/status/2094673907626414299",
      sourceType: "togashi-x",
    },
  ],
};

test("renderSvgBadge generates valid SVG with proper XML and role attributes", () => {
  const svg = renderSvgBadge({
    label: "HxH",
    message: "On hiatus · ch. 420",
    color: "#d97706",
  });

  assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
  assert.ok(svg.endsWith("</svg>"));
  assert.ok(svg.includes('role="img"'));
  assert.ok(svg.includes('aria-label="HxH: On hiatus · ch. 420"'));
  assert.ok(svg.includes('fill="#d97706"'));
  assert.ok(svg.includes("On hiatus · ch. 420"));
});

test("measureText assigns larger width to CJK characters than ASCII", () => {
  const asciiWidth = measureText("HxH");
  const cjkWidth = measureText("連載中");
  assert.ok(cjkWidth > asciiWidth * 1.5, "CJK characters must be measured wider than ASCII");
});

test("generateBadges generates status, latest, progress, and next badges in English", () => {
  const badges = generateBadges({ statusData: mockStatusData, locale: "en" });

  assert.ok(badges.status.includes("On hiatus"));
  assert.ok(badges.status.includes("ch. 420"));
  assert.ok(badges.status.includes("manuscript 427"));

  assert.ok(badges.latest.includes("latest"));
  assert.ok(badges.latest.includes("ch. 420"));

  assert.ok(badges.progress.includes("progress"));
  assert.ok(badges.progress.includes("ch. 427"));

  assert.ok(badges.next.includes("next"));
  assert.ok(badges.next.includes("ch. 421"));
});

test("generateBadges translates badges for French and Japanese", () => {
  const frBadges = generateBadges({ statusData: mockStatusData, locale: "fr" });
  assert.ok(frBadges.status.includes("En pause"));
  assert.ok(frBadges.status.includes("manuscrit 427"));
  assert.ok(frBadges.next.includes("suivant"));

  const jaBadges = generateBadges({ statusData: mockStatusData, locale: "ja" });
  assert.ok(jaBadges.status.includes("休載中"));
  assert.ok(jaBadges.status.includes("420話"));
  assert.ok(jaBadges.status.includes("原稿427話"));
  assert.ok(jaBadges.next.includes("次回"));
});
