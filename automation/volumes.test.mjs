import test from "node:test";
import assert from "node:assert/strict";

import {
  deriveVolumeProgress,
  formatVolumeName,
  getVolumeNumber,
} from "../app/data/chapter-titles.ts";

const mockChapters = [
  // Volume 40 (411 - 420) all published
  { chapter: 411, status: "published" },
  { chapter: 412, status: "published" },
  { chapter: 413, status: "published" },
  { chapter: 414, status: "published" },
  { chapter: 415, status: "published" },
  { chapter: 416, status: "published" },
  { chapter: 417, status: "published" },
  { chapter: 418, status: "published" },
  { chapter: 419, status: "published" },
  { chapter: 420, status: "published" },
  // Volume 41 (421 - 430) 7 delivered, 3 background
  { chapter: 421, status: "delivered" },
  { chapter: 422, status: "delivered" },
  { chapter: 423, status: "delivered" },
  { chapter: 424, status: "delivered" },
  { chapter: 425, status: "delivered" },
  { chapter: 426, status: "delivered" },
  { chapter: 427, status: "delivered" },
  { chapter: 428, status: "background" },
  { chapter: 429, status: "background" },
  { chapter: 430, status: "background" },
  // Volume 42 (431 - 440) 3 inking, 7 unknown
  { chapter: 431, status: "inking" },
  { chapter: 432, status: "inking" },
  { chapter: 433, status: "inking" },
  { chapter: 434, status: "unknown" },
  { chapter: 435, status: "unknown" },
  { chapter: 436, status: "unknown" },
  { chapter: 437, status: "unknown" },
  { chapter: 438, status: "unknown" },
  { chapter: 439, status: "unknown" },
  { chapter: 440, status: "unknown" },
];

test("getVolumeNumber maps chapters to correct volume", () => {
  assert.equal(getVolumeNumber(411), 40);
  assert.equal(getVolumeNumber(420), 40);
  assert.equal(getVolumeNumber(421), 41);
  assert.equal(getVolumeNumber(430), 41);
  assert.equal(getVolumeNumber(431), 42);
  assert.equal(getVolumeNumber(440), 42);
});

test("formatVolumeName respects locale conventions", () => {
  assert.equal(formatVolumeName(41, "en"), "Volume 41");
  assert.equal(formatVolumeName(41, "fr"), "Tome 41");
  assert.equal(formatVolumeName(41, "ja"), "41巻");
  assert.equal(formatVolumeName(41, "zh"), "第41卷");
  assert.equal(formatVolumeName(41, "es"), "Volumen 41");
  assert.equal(formatVolumeName(41, "pt"), "Volume 41");
  assert.equal(formatVolumeName(41, "ar"), "المجلد 41");
});

test("deriveVolumeProgress groups chapters into derived volumes and computes progress", () => {
  const summary = deriveVolumeProgress(mockChapters, "en");

  assert.equal(summary.volumes.length, 3);

  // Volume 40
  const vol40 = summary.volumes[0];
  assert.equal(vol40.volume, 40);
  assert.equal(vol40.startChapter, 411);
  assert.equal(vol40.endChapter, 420);
  assert.equal(vol40.publishedCount, 10);
  assert.equal(vol40.missingCount, 0);
  assert.equal(vol40.isReady, true);

  // Volume 41
  const vol41 = summary.volumes[1];
  assert.equal(vol41.volume, 41);
  assert.equal(vol41.startChapter, 421);
  assert.equal(vol41.endChapter, 430);
  assert.equal(vol41.publishedCount, 0);
  assert.equal(vol41.inProductionCount, 10);
  assert.equal(vol41.missingCount, 10);
  assert.equal(vol41.isReady, false);

  // Volume 42
  const vol42 = summary.volumes[2];
  assert.equal(vol42.volume, 42);
  assert.equal(vol42.startChapter, 431);
  assert.equal(vol42.endChapter, 440);
  assert.equal(vol42.publishedCount, 0);
  assert.equal(vol42.inProductionCount, 3);
  assert.equal(vol42.missingCount, 10);

  // Current volume is Volume 41 (first volume with publishedCount < 10 and active production)
  assert.equal(summary.currentVolume.volume, 41);
});
