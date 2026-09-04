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

test("one chapter reads as a sentence, not a status code", () => {
  const notification = buildNotification(milestone());

  assert.equal(notification.title, "Chapter 428 has been delivered to Jump!");
  assert.equal(notification.body, "The finished manuscript is now with Jump.");
  assert.equal(notification.tag, "tracker-2094673907626414299");
  assert.equal(notification.url, "/");
});

test("the reader's own language is used", () => {
  const notification = buildNotification(milestone({ locale: "fr" }));

  assert.equal(notification.title, "Le chapitre 428 a été livré au Jump !");
  assert.equal(notification.body, "Le manuscrit terminé est entre les mains du Jump.");
});

test("every milestone has its own sentence", () => {
  const titles = ["inking", "background", "delivered", "scheduled", "published"].map(
    (to) =>
      buildNotification(milestone({ locale: "fr", chapters: [{ chapter: 428, to }] }))
        .title,
  );

  assert.deepEqual(titles, [
    "Chapitre 428 : l’encrage est terminé !",
    "Chapitre 428 : les décors sont bouclés !",
    "Le chapitre 428 a été livré au Jump !",
    "Le chapitre 428 a une date de sortie !",
    "Le chapitre 428 est sorti !",
  ]);

  // Every sentence must be distinct, or a status is quietly reusing another's.
  assert.equal(new Set(titles).size, titles.length);
});

test("several chapters collapse into a headline and a short list", () => {
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

  assert.equal(notification.title, "3 chapitres ont avancé !");
  assert.equal(
    notification.body,
    "428 : chez le Jump · 429 : décors bouclés · 430 : encré",
  );
});

test("a hiatus flip outranks the chapters it travelled with", () => {
  const alone = buildNotification(
    milestone({ chapters: [], publication: "hiatus" }),
  );
  assert.equal(alone.title, "Hunter × Hunter is going on a break");
  assert.equal(alone.body, "No new chapter is scheduled for now.");

  const together = buildNotification(
    milestone({
      chapters: [{ chapter: 428, to: "published" }],
      publication: "hiatus",
    }),
  );
  assert.equal(together.title, "Hunter × Hunter is going on a break");
  assert.equal(together.body, "428: out now");

  const resumed = buildNotification(
    milestone({ chapters: [], publication: "publishing" }),
  );
  assert.equal(resumed.title, "Hunter × Hunter is back!");
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
