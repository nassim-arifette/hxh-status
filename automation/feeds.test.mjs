import test from "node:test";
import assert from "node:assert/strict";

import {
  generateAtomFeed,
  generateReleasesIcs,
} from "./feeds.mjs";

const mockStatusData = {
  lastUpdated: "2026-09-07",
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
      status: "scheduled",
      releaseAt: "2026-09-14T00:00:00+09:00",
      updatedAt: "2026-09-07",
      jumpIssue: "42",
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

const mockTogashiPosts = [
  {
    id: "2094673907626414299",
    createdAt: "2026-09-01T06:29:11.000Z",
    url: "https://x.com/Un4v5s8bgsVk9Xp/status/2094673907626414299",
    originalText: "No.427、原稿完成。 https://t.co/MohufGEVuG",
    author: {
      name: "Yoshihiro Togashi",
      screenName: "Un4v5s8bgsVk9Xp",
    },
    translation: {
      status: "available",
      texts: {
        en: "No.427, manuscript complete. https://t.co/MohufGEVuG",
        fr: "No.427, manuscrit terminé. https://t.co/MohufGEVuG",
      },
    },
  },
];

const mockMessagesEn = {
  metadata: {
    title: "HxH Status - HUNTER×HUNTER Tracker",
    description: "Tracker description",
  },
  push: {
    onePost: "New Togashi post",
    milestoneTitle: {
      published: "Ch. {chapter}: out now",
      scheduled: "Ch. {chapter}: release date confirmed",
      delivered: "Ch. {chapter}: manuscript sent to Jump",
    },
    milestoneBody: {
      published: "The chapter is now officially available.",
      scheduled: "Jump has confirmed the chapter's release date.",
      delivered: "The finished manuscript has been delivered to Jump.",
    },
  },
  statuses: {
    published: { description: "Officially released." },
    scheduled: { description: "Scheduled for release." },
    delivered: { description: "Delivered to Jump." },
  },
};

const mockMessagesFr = {
  metadata: {
    title: "HxH Status - Suivi de HUNTER×HUNTER",
    description: "Description en français",
  },
  push: {
    onePost: "Nouveau post de Togashi",
    milestoneTitle: {
      published: "Ch. {chapter} : disponible",
      scheduled: "Ch. {chapter} : date confirmée",
      delivered: "Ch. {chapter} : manuscrit envoyé au Jump",
    },
    milestoneBody: {
      published: "Le chapitre est officiellement disponible.",
      scheduled: "Le Jump a confirmé la date.",
      delivered: "Le manuscrit a été envoyé au Jump.",
    },
  },
  statuses: {
    published: { description: "Publié officiellement." },
    scheduled: { description: "Prévu pour parution." },
    delivered: { description: "Livré au Jump." },
  },
};

test("generateAtomFeed generates valid Atom 1.0 XML with stable identifiers", () => {
  const xml = generateAtomFeed({
    locale: "en",
    messages: mockMessagesEn,
    statusData: mockStatusData,
    togashiPosts: mockTogashiPosts,
  });

  assert.ok(xml.startsWith('<?xml version="1.0" encoding="utf-8"?>'));
  assert.ok(xml.includes('<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en">'));
  assert.ok(xml.includes("<id>https://hxhstatus.com/feed.xml</id>"));
  assert.ok(xml.includes("<title type=\"text\">HxH Status - HUNTER×HUNTER Tracker</title>"));
  assert.ok(xml.includes('<link rel="self" href="https://hxhstatus.com/feed.xml" type="application/atom+xml" />'));

  // Stable IDs
  assert.ok(xml.includes("<id>tag:hxhstatus.com,2026:chapter-427-delivered</id>"));
  assert.ok(xml.includes("<id>tag:hxhstatus.com,2026:chapter-421-scheduled</id>"));
  assert.ok(xml.includes("<id>tag:hxhstatus.com,2026:chapter-420-published</id>"));
  assert.ok(xml.includes("<id>tag:hxhstatus.com,2026:post-2094673907626414299</id>"));

  // Check titles
  assert.ok(xml.includes("<title type=\"text\">Ch. 427: manuscript sent to Jump</title>"));
  assert.ok(xml.includes("<title type=\"text\">New Togashi post: No.427, manuscript complete.</title>"));

  // Check sorting (newest first: 2026-09-07 chapters come before 2026-09-01)
  const pos420 = xml.indexOf("chapter-420-published");
  const posPost = xml.indexOf("post-2094673907626414299");
  assert.ok(pos420 < posPost, "Newer items must appear before older items");
});

test("generateAtomFeed localizes titles and feed content", () => {
  const xml = generateAtomFeed({
    locale: "fr",
    messages: mockMessagesFr,
    statusData: mockStatusData,
    togashiPosts: mockTogashiPosts,
  });

  assert.ok(xml.includes('<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="fr">'));
  assert.ok(xml.includes("<id>https://hxhstatus.com/fr/feed.xml</id>"));
  assert.ok(xml.includes("<title type=\"text\">HxH Status - Suivi de HUNTER×HUNTER</title>"));
  assert.ok(xml.includes("<title type=\"text\">Ch. 427 : manuscrit envoyé au Jump</title>"));
  assert.ok(xml.includes("<title type=\"text\">Nouveau post de Togashi: No.427, manuscrit terminé.</title>"));
});

test("generateReleasesIcs outputs RFC 5545 compliant calendar with CRLF endings", () => {
  const ics = generateReleasesIcs({
    statusData: mockStatusData,
  });

  assert.ok(ics.includes("\r\n"), "Must use CRLF line endings");
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.ok(ics.includes("VERSION:2.0\r\n"));
  assert.ok(ics.includes("PRODID:-//HxH Status//HUNTERxHUNTER Releases//EN\r\n"));

  // Scheduled chapter 421 and published chapter 420 should be events
  assert.ok(ics.includes("UID:chapter-421-release@hxhstatus.com\r\n"));
  assert.ok(ics.includes("SUMMARY:HUNTER×HUNTER Chapter 421\r\n"));
  assert.ok(ics.includes("UID:chapter-420-release@hxhstatus.com\r\n"));
  assert.ok(ics.includes("SUMMARY:HUNTER×HUNTER Chapter 420\r\n"));

  // Delivered chapter 427 without releaseAt should NOT be in calendar
  assert.ok(!ics.includes("chapter-427-release"));
});
