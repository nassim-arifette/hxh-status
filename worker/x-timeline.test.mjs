import test from "node:test";
import assert from "node:assert/strict";

import { parseTimelineHtml, selectUnseenTweets } from "./x-timeline.mjs";

function entry(id, overrides = {}) {
  const tweet = {
    id_str: id,
    created_at: "Wed Sep 02 12:00:00 +0000 2026",
    full_text: `post ${id}`,
    user: {
      id_str: "1528978792617611264",
      screen_name: "Un4v5s8bgsVk9Xp",
    },
    extended_entities: {
      media: [
        {
          type: "photo",
          media_url_https: `https://pbs.twimg.com/media/${id}.jpg`,
        },
      ],
    },
    ...overrides,
  };

  return { type: "tweet", content: { tweet } };
}

function html(entries) {
  return [
    "<html><body>",
    '<script type="application/json" id="__NEXT_DATA__">',
    JSON.stringify({ props: { pageProps: { timeline: { entries } } } }),
    "</script></body></html>",
  ].join("");
}

test("timeline parser filters author, replies and reposts then sorts by ID", () => {
  const parsed = parseTimelineHtml(
    html([
      entry("2096000000000000003"),
      entry("2096000000000000001"),
      entry("2096000000000000002", {
        in_reply_to_status_id_str: "1",
      }),
      entry("2096000000000000004", {
        user: { id_str: "99", screen_name: "someone" },
      }),
      entry("2096000000000000005", {
        retweeted_status: { id_str: "1" },
      }),
    ]),
  );

  assert.deepEqual(
    parsed.map((tweet) => tweet.id),
    ["2096000000000000001", "2096000000000000003"],
  );
  assert.deepEqual(parsed[0].mediaUrls, [
    "https://pbs.twimg.com/media/2096000000000000001.jpg",
  ]);
});

test("unseen selection processes oldest posts first and rejects stale feeds", () => {
  const parsed = parseTimelineHtml(
    html([
      entry("2096000000000000003"),
      entry("2096000000000000001"),
      entry("2096000000000000002"),
    ]),
  );

  assert.deepEqual(
    selectUnseenTweets(parsed, "2096000000000000001").map(
      (tweet) => tweet.id,
    ),
    ["2096000000000000002", "2096000000000000003"],
  );

  assert.throws(
    () => selectUnseenTweets(parsed, "2097000000000000000"),
    /timeline regressed/,
  );
});
