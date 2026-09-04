import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

// The service worker is a plain script that runs in the browser, so it cannot
// be imported. Evaluate it against a stub `self` and reach in for the pure
// notification builder, which is the part with branching worth pinning.
const source = await readFile(
  join(dirname(fileURLToPath(import.meta.url)), "..", "public", "sw.js"),
  "utf8",
);

const context = vm.createContext({
  self: {
    addEventListener() {},
    location: { origin: "https://hxhstatus.com" },
  },
});
vm.runInContext(
  `${source}\nglobalThis.__build = buildNotification;`,
  context,
);
const buildNotification = context.__build;

function milestone(overrides = {}) {
  return {
    v: 1,
    kind: "tracker-milestone",
    locale: "en",
    revision: "2094673907626414299",
    chapters: [{ chapter: 428, to: "delivered" }],
    publication: null,
    ...overrides,
  };
}

test("one chapter names the chapter and its milestone", () => {
  const notification = buildNotification(milestone());

  assert.equal(notification.title, "Chapter 428");
  assert.equal(notification.body, "Delivered to Jump");
  assert.equal(notification.tag, "tracker-2094673907626414299");
  assert.equal(notification.url, "/");
});

test("the reader's own language is used", () => {
  const notification = buildNotification(milestone({ locale: "fr" }));

  assert.equal(notification.title, "Chapitre 428");
  assert.equal(notification.body, "Remis au Jump");
});

test("several chapters collapse into a count and a list", () => {
  const notification = buildNotification(
    milestone({
      locale: "fr",
      chapters: [
        { chapter: 428, to: "delivered" },
        { chapter: 429, to: "background" },
        { chapter: 430, to: "inking" },
      ],
    }),
  );

  assert.equal(notification.title, "3 chapitres mis à jour");
  assert.equal(
    notification.body,
    "428 : Remis au Jump · 429 : Spécifications des arrière-plans terminées · 430 : Encrage des personnages terminé",
  );
});

test("a hiatus flip outranks the chapters it travelled with", () => {
  const alone = buildNotification(
    milestone({ chapters: [], publication: "hiatus" }),
  );
  assert.equal(alone.title, "Hunter × Hunter is on hiatus");
  assert.equal(alone.body, "No new chapter is scheduled.");

  const together = buildNotification(
    milestone({
      chapters: [{ chapter: 428, to: "published" }],
      publication: "hiatus",
    }),
  );
  assert.equal(together.title, "Hunter × Hunter is on hiatus");
  assert.equal(together.body, "428: Published");

  const resumed = buildNotification(
    milestone({ chapters: [], publication: "publishing" }),
  );
  assert.equal(resumed.title, "Hunter × Hunter is publishing again");
});

test("a milestone payload that fails validation falls back, never throws", () => {
  const rejected = [
    milestone({ chapters: [] }),
    milestone({ chapters: [{ chapter: 428, to: "unknown" }] }),
    milestone({ chapters: [{ chapter: 428, to: "invented" }] }),
    milestone({ chapters: [{ chapter: 0, to: "delivered" }] }),
    milestone({ chapters: [{ chapter: 4.5, to: "delivered" }] }),
    milestone({ publication: "resting" }),
    milestone({ revision: "not a revision!" }),
    milestone({ v: 2 }),
    milestone({ chapters: Array.from({ length: 11 }, (_, index) => ({
      chapter: 400 + index,
      to: "delivered",
    })) }),
  ];

  for (const payload of rejected) {
    const notification = buildNotification(payload);
    assert.equal(notification.title, "HxH Status");
    assert.equal(notification.tag, "hxhstatus-update");
  }
});

test("the existing post and test notifications are unchanged", () => {
  const post = buildNotification({
    v: 1,
    kind: "togashi-post",
    locale: "fr",
    tweetId: "2094673907626414299",
    count: 1,
    text: "Un message",
  });
  assert.equal(post.title, "Nouveau post de Togashi");
  assert.equal(post.body, "Un message");
  assert.equal(
    post.url,
    "https://x.com/Un4v5s8bgsVk9Xp/status/2094673907626414299",
  );

  const enabled = buildNotification({ v: 1, kind: "test", locale: "en" });
  assert.equal(enabled.title, "Togashi post alerts are on");
});
