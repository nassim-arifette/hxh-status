import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { PUBLIC_TRANSLATION_LOCALES } from "../automation/contracts.mjs";
import { buildBadges } from "../automation/badges.mjs";
import { buildFeedsAndCalendar } from "../automation/feeds.mjs";
import { validateTogashiFeed } from "../automation/togashi-feed.mjs";

const ORIGIN = "https://hxhstatus.com";
const API_VERSION = 1;
const POLL_AFTER_SECONDS = 300;
const root = process.cwd();
const outDirectory = join(root, "out");
const apiDirectory = join(outDirectory, "api", "v1");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function apiEnvelope(self, data) {
  return {
    schemaVersion: API_VERSION,
    self: `${ORIGIN}${self}`,
    pollAfterSeconds: POLL_AFTER_SECONDS,
    ...data,
  };
}

function localizedPost(post, locale) {
  const available = post.translation.status === "available";
  const translated = available && locale !== "ja";

  return {
    id: post.id,
    author: post.author,
    createdAt: post.createdAt,
    url: post.url,
    text: {
      value: available ? post.translation.texts[locale] : post.originalText,
      language: available ? locale : "ja",
      translated,
      originalLanguage: "ja",
      originalValue: post.originalText,
    },
    translation: {
      status: post.translation.status,
      provider: post.translation.provider,
      model: post.translation.model,
      generatedAt: post.translation.generatedAt,
    },
    mediaUrls: post.mediaUrls,
    imageTexts: (post.imageTexts ?? []).map((image) => ({
      imageIndex: image.imageIndex,
      originalText: image.originalText,
      text: image.translations[locale],
      language: locale,
    })),
    tracker: post.tracker,
  };
}

function openApiDocument() {
  const localeParameter = {
    name: "locale",
    in: "path",
    required: true,
    schema: { type: "string", enum: PUBLIC_TRANSLATION_LOCALES },
  };
  const jsonResponse = (description, schema) => ({
    description,
    headers: {
      "Cache-Control": {
        description: "Client and shared-cache policy.",
        schema: { type: "string" },
      },
      ETag: {
        description: "Validator for conditional requests.",
        schema: { type: "string" },
      },
    },
    content: { "application/json": { schema } },
  });
  const chartOperation = (operationId, summary) => ({
    operationId,
    summary,
    description:
      "Returns the current chart directly as a PNG, without authentication. " +
      "Use the revisioned URL from index.json charts to refresh bot image caches. " +
      "Images are generated with tracker updates, never on request.",
    parameters: [
      localeParameter,
      {
        name: "r",
        in: "query",
        required: false,
        description:
          "Cache revision from the API chart URL; not a historical snapshot selector.",
        schema: { type: "string" },
      },
      {
        name: "If-None-Match",
        in: "header",
        required: false,
        description: "ETag returned by a previous request.",
        schema: { type: "string" },
      },
    ],
    responses: {
      200: {
        description: "Localized chart PNG.",
        headers: {
          "Cache-Control": {
            schema: { type: "string" },
            description: "Cached for five minutes, then revalidated.",
          },
          ETag: {
            schema: { type: "string" },
            description: "Validator for conditional requests.",
          },
        },
        content: {
          "image/png": { schema: { type: "string", format: "binary" } },
        },
      },
      304: { description: "The chart has not changed; reuse the cached image." },
      404: { description: "The requested locale or chart does not exist." },
    },
  });

  return {
    openapi: "3.1.0",
    info: {
      title: "HxHStatus public API",
      version: "1.1.0",
      description:
        "Read-only tracker, localized chart PNGs, and cached Yoshihiro Togashi post translations.",
    },
    servers: [{ url: ORIGIN }],
    security: [],
    paths: {
      "/api/v1/index.json": {
        get: {
          operationId: "getApiIndex",
          summary: "Endpoint index, supported locales, and revisioned chart URLs",
          responses: {
            200: jsonResponse("API discovery document.", { type: "object" }),
          },
        },
      },
      "/share/{locale}/production.png": {
        get: chartOperation("getProductionChart", "Chart 1: production tracker PNG"),
      },
      "/share/{locale}/publication-history.png": {
        get: chartOperation(
          "getPublicationHistoryChart",
          "Chart 2: publication history PNG",
        ),
      },
      "/api/v1/status.json": {
        get: {
          summary: "Current HUNTER x HUNTER tracker state",
          responses: {
            200: jsonResponse("Current tracker state.", {
              type: "object",
            }),
          },
        },
      },
      "/api/v1/togashi/latest.json": {
        get: {
          summary: "Latest Togashi post with every cached translation",
          responses: {
            200: jsonResponse("Latest post, or null when the feed is empty.", {
              type: "object",
            }),
          },
        },
      },
      "/api/v1/togashi/posts.json": {
        get: {
          summary: "Bounded Togashi post archive with every cached translation",
          responses: {
            200: jsonResponse("Newest-first post archive.", {
              type: "object",
            }),
          },
        },
      },
      "/api/v1/togashi/latest/{locale}.json": {
        get: {
          summary: "Latest Togashi post localized for one language",
          parameters: [localeParameter],
          responses: {
            200: jsonResponse("Localized latest post.", { type: "object" }),
          },
        },
      },
      "/api/v1/togashi/posts/{locale}.json": {
        get: {
          summary: "Bounded Togashi post archive localized for one language",
          parameters: [localeParameter],
          responses: {
            200: jsonResponse("Localized newest-first post archive.", {
              type: "object",
            }),
          },
        },
      },
      "/feed.xml": {
        get: {
          operationId: "getAtomFeed",
          summary: "Atom 1.0 syndication feed for HUNTER x HUNTER updates (English / default)",
          responses: {
            200: {
              description: "Atom 1.0 XML feed.",
              content: { "application/atom+xml": { schema: { type: "string" } } },
            },
          },
        },
      },
      "/{locale}/feed.xml": {
        get: {
          operationId: "getLocalizedAtomFeed",
          summary: "Localized Atom 1.0 syndication feed for HUNTER x HUNTER updates",
          parameters: [localeParameter],
          responses: {
            200: {
              description: "Localized Atom 1.0 XML feed.",
              content: { "application/atom+xml": { schema: { type: "string" } } },
            },
          },
        },
      },
      "/releases.ics": {
        get: {
          operationId: "getReleasesCalendar",
          summary: "iCalendar (.ics) calendar subscription of chapter release dates",
          responses: {
            200: {
              description: "iCalendar VCALENDAR document.",
              content: { "text/calendar": { schema: { type: "string" } } },
            },
          },
        },
      },
      "/badge/{locale}/status.svg": {
        get: {
          operationId: "getLocalizedStatusBadge",
          summary: "Embeddable SVG status badge (shields.io style)",
          parameters: [localeParameter],
          responses: {
            200: {
              description: "SVG status badge.",
              content: { "image/svg+xml": { schema: { type: "string" } } },
            },
          },
        },
      },
      "/badge/status.svg": {
        get: {
          operationId: "getStatusBadge",
          summary: "Embeddable SVG status badge in English (default)",
          responses: {
            200: {
              description: "SVG status badge.",
              content: { "image/svg+xml": { schema: { type: "string" } } },
            },
          },
        },
      },
    },
  };
}

try {
  await access(outDirectory);
} catch {
  throw new Error(
    "out/ does not exist. Run this after `next build`, not on its own.",
  );
}

const [feed, status, localeRegistry, statusData] = await Promise.all([
  readJson(join(root, "app", "data", "togashi-posts.json")).then(
    validateTogashiFeed,
  ),
  readJson(join(outDirectory, "status.json")),
  readJson(join(root, "lib", "locales.json")),
  readJson(join(root, "app", "data", "status-data.json")),
]);

const messagesByLocale = Object.fromEntries(
  await Promise.all(
    PUBLIC_TRANSLATION_LOCALES.map(async (locale) => [
      locale,
      await readJson(join(root, "messages", `${locale}.json`)),
    ]),
  ),
);

const publishedLocales = Object.keys(localeRegistry.locales)
  .filter((locale) => localeRegistry.locales[locale].published)
  .sort();
const expectedLocales = [...PUBLIC_TRANSLATION_LOCALES].sort();
if (JSON.stringify(publishedLocales) !== JSON.stringify(expectedLocales)) {
  throw new Error(
    "Published site locales and cached tweet translation locales differ.",
  );
}

const latestPost = feed.posts[0] ?? null;
const index = apiEnvelope("/api/v1/index.json", {
  documentation: `${ORIGIN}/api/v1/openapi.json`,
  endpoints: {
    status: `${ORIGIN}/api/v1/status.json`,
    latestTogashiPost: `${ORIGIN}/api/v1/togashi/latest.json`,
    togashiPosts: `${ORIGIN}/api/v1/togashi/posts.json`,
    localizedLatestPattern: `${ORIGIN}/api/v1/togashi/latest/{locale}.json`,
    localizedPostsPattern: `${ORIGIN}/api/v1/togashi/posts/{locale}.json`,
    productionChartPattern: `${ORIGIN}/share/{locale}/production.png`,
    publicationHistoryChartPattern: `${ORIGIN}/share/{locale}/publication-history.png`,
    feed: `${ORIGIN}/feed.xml`,
    localizedFeedPattern: `${ORIGIN}/{locale}/feed.xml`,
    releasesCalendar: `${ORIGIN}/releases.ics`,
    badgeStatus: `${ORIGIN}/badge/status.svg`,
    badgeLocalizedStatusPattern: `${ORIGIN}/badge/{locale}/status.svg`,
    badgeLatest: `${ORIGIN}/badge/latest.svg`,
    badgeProgress: `${ORIGIN}/badge/progress.svg`,
    badgeNext: `${ORIGIN}/badge/next.svg`,
  },
  locales: PUBLIC_TRANSLATION_LOCALES,
  charts: status.charts,
});

await Promise.all([
  writeJson(join(apiDirectory, "index.json"), index),
  writeJson(join(apiDirectory, "openapi.json"), openApiDocument()),
  writeJson(join(apiDirectory, "status.json"), status),
  writeJson(
    join(apiDirectory, "togashi", "latest.json"),
    apiEnvelope("/api/v1/togashi/latest.json", { post: latestPost }),
  ),
  writeJson(
    join(apiDirectory, "togashi", "posts.json"),
    apiEnvelope("/api/v1/togashi/posts.json", {
      count: feed.posts.length,
      posts: feed.posts,
    }),
  ),
  buildFeedsAndCalendar({
    outDir: outDirectory,
    publicDir: join(root, "public"),
    statusData,
    togashiPosts: feed.posts,
    messagesByLocale,
    locales: PUBLIC_TRANSLATION_LOCALES,
    origin: ORIGIN,
  }),
  buildBadges({
    outDir: outDirectory,
    publicDir: join(root, "public"),
    statusData,
    locales: PUBLIC_TRANSLATION_LOCALES,
  }),
  ...PUBLIC_TRANSLATION_LOCALES.flatMap((locale) => [
    writeJson(
      join(apiDirectory, "togashi", "latest", `${locale}.json`),
      apiEnvelope(`/api/v1/togashi/latest/${locale}.json`, {
        locale,
        post: latestPost === null ? null : localizedPost(latestPost, locale),
      }),
    ),
    writeJson(
      join(apiDirectory, "togashi", "posts", `${locale}.json`),
      apiEnvelope(`/api/v1/togashi/posts/${locale}.json`, {
        locale,
        count: feed.posts.length,
        posts: feed.posts.map((post) => localizedPost(post, locale)),
      }),
    ),
  ]),
]);

console.log(
  JSON.stringify({
    message: "Wrote the public HxHStatus API, Atom feeds, and releases calendar.",
    posts: feed.posts.length,
    locales: PUBLIC_TRANSLATION_LOCALES.join(","),
  }),
);
