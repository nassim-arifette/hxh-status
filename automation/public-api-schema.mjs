import { PUBLIC_TRANSLATION_LOCALES, TRACKER_STATUSES } from "./contracts.mjs";

const string = { type: "string" };
const number = { type: "number" };
const integer = { type: "integer" };
const boolean = { type: "boolean" };
const nullable = (schema) => ({ anyOf: [schema, { type: "null" }] });
const array = (items) => ({ type: "array", items });
const object = (properties, required = Object.keys(properties)) => ({ type: "object", properties, required });
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const date = { type: "string", format: "date" };
const timestamp = { type: "string", format: "date-time" };
const uri = { type: "string", format: "uri" };
const locale = { type: "string", enum: PUBLIC_TRANSLATION_LOCALES };
const status = { type: "string", enum: TRACKER_STATUSES };
const translations = object(Object.fromEntries(PUBLIC_TRANSLATION_LOCALES.map((key) => [key, string])));
const envelope = (properties) => object({ schemaVersion: { type: "integer", const: 1 }, self: uri,
  pollAfterSeconds: { type: "integer", minimum: 1 }, ...properties });
const change = object({ chapter: integer, from: status, to: status });
const tracker = object({ decision: { enum: ["apply", "ignore", "review"] }, changes: array(change) });
const translationProperties = { status: { enum: ["available", "unavailable"] },
  provider: { enum: ["gemini", "manual", null] }, model: nullable(string), generatedAt: nullable(timestamp) };
const chapterProperties = { chapter: integer, status, releaseAt: timestamp, updatedAt: date,
  jumpIssue: string, source: uri, sourceLabel: string, sourceType: string, sourcePostId: string };
const charts = object({ production: object(Object.fromEntries(PUBLIC_TRANSLATION_LOCALES.map((key) => [key, uri]))),
  publicationHistory: object(Object.fromEntries(PUBLIC_TRANSLATION_LOCALES.map((key) => [key, uri]))) });
const span = { startYear: integer, startIssue: integer, endYear: integer, endIssue: integer };
const hiatus = object({ ...span, issues: integer, approxYears: number,
  precededByChapter: integer, precededByDate: date, precededByArc: string,
  resumedWithChapter: integer, resumedOnDate: date, resumedWithArc: string },
  [...Object.keys(span), "issues", "approxYears"]);
const run = object({ ...span, startChapter: { type: ["integer", "string"] },
  endChapter: { type: ["integer", "string"] }, length: integer }, [...Object.keys(span), "length"]);
const postProperties = { id: string, author: object({ id: string, name: string, screenName: string }),
  createdAt: timestamp, url: uri, mediaUrls: array(uri), tracker };

export const schemas = {
  ChapterRecord: object(chapterProperties, ["chapter", "status"]),
  Chapter: object({ ...chapterProperties, titles: object(Object.fromEntries(PUBLIC_TRANSLATION_LOCALES.map((key) => [key, nullable(string)]))),
    volume: nullable(integer), arc: nullable(string), arcInferred: boolean,
    releaseAt: nullable(timestamp), updatedAt: nullable(date), source: nullable(uri), relatedPostIds: array(string) },
  ["chapter", "status", "titles", "volume", "arc", "arcInferred", "releaseAt", "updatedAt", "source", "relatedPostIds"]),
  Event: object({ id: string, kind: { enum: ["transition", "observation"] },
    date: { anyOf: [date, timestamp] }, chapter: integer, from: nullable(status), to: status,
    source: nullable(uri), postId: nullable(string) }),
  Post: object({ ...postProperties, originalText: string,
    translation: object({ ...translationProperties, texts: nullable(translations) }),
    imageTexts: array(object({ imageIndex: { type: "integer", minimum: 1 }, originalText: string, translations })) },
  [...Object.keys(postProperties), "originalText", "translation"]),
  LocalizedPost: object({ ...postProperties,
    text: object({ value: string, language: locale, translated: boolean, originalLanguage: { const: "ja" }, originalValue: string }),
    translation: object(translationProperties),
    imageTexts: array(object({ imageIndex: { type: "integer", minimum: 1 }, originalText: string, text: string, language: locale })) }),
  Status: object({ schemaVersion: { const: 1 }, lastUpdated: date, revision: string,
    publicationStatus: { enum: ["publishing", "hiatus"] }, latestPublished: integer,
    manuscriptsComplete: integer, workConfirmed: integer, nextChapter: integer,
    charts, chapters: array(ref("ChapterRecord")) }),
  Stats: envelope({ stats: object({
    currentHiatus: object({ elapsedIssues: integer, elapsedDays: integer, sinceDate: date,
      sinceChapter: integer, sinceJumpIssue: string, isJustStarted: boolean }),
    historicalHiatuses: object({ totalCount: integer, medianIssuesAll: number, majorThreshold: integer,
      majorCount: integer, medianIssuesMajor: number, medianDaysMajorApprox: number,
      maxIssues: integer, major: array(hiatus), maxHiatus: object({ ...span, issues: integer, approxYears: number }) }),
    publicationRuns: object({ totalRunsCount: integer, medianRunLength: number, recentBatchSize: integer,
      recentRunsCount: integer, recent: array(run), longestRun: run }),
    publicationRate: object({ totalJumpIssues: integer, totalChaptersPublished: integer, publishedPercentage: number }),
  }) }),
  Index: envelope({ documentation: uri, endpoints: { type: "object", additionalProperties: {
    type: "string", description: "Absolute URL or URI template with a locale or chapter placeholder." } }, locales: array(locale), charts }),
  ChapterResponse: envelope({ revision: string, chapter: ref("Chapter") }),
  Chapters: envelope({ revision: string, count: integer, chapters: array(object({ chapter: integer, status, url: uri })) }),
  Events: envelope({ revision: string, coverage: { const: "retained-posts-and-current-tracker" },
    complete: { const: false }, count: integer, events: array(ref("Event")) }),
  LatestPost: envelope({ post: nullable(ref("Post")) }),
  Posts: envelope({ count: integer, posts: array(ref("Post")) }),
  LocalizedLatestPost: envelope({ locale, post: nullable(ref("LocalizedPost")) }),
  LocalizedPosts: envelope({ locale, count: integer, posts: array(ref("LocalizedPost")) }),
};

export function completeOpenApi(document) {
  document.info.version = "1.2.0";
  document.components = { schemas };
  const badge = document.paths["/badge/{locale}/status.svg"];
  if (badge) {
    for (const name of ["latest", "progress", "next"]) {
      for (const localized of [false, true]) {
        const operation = structuredClone(badge.get);
        operation.operationId = `get${localized ? "Localized" : ""}${name[0].toUpperCase() + name.slice(1)}Badge`;
        operation.summary = `Embeddable ${name} SVG badge${localized ? " in the requested language" : " in English"}`;
        if (!localized) delete operation.parameters;
        document.paths[`/badge/${localized ? "{locale}/" : ""}${name}.svg`] = { get: operation };
      }
    }
  }
  const endpoints = [
    ["index.json", "Index", "getApiIndex"], ["status.json", "Status", "getStatus"],
    ["stats.json", "Stats", "getStats"], ["togashi/latest.json", "LatestPost", "getLatestPost"],
    ["togashi/posts.json", "Posts", "getPosts"],
    ["togashi/latest/{locale}.json", "LocalizedLatestPost", "getLocalizedLatestPost"],
    ["togashi/posts/{locale}.json", "LocalizedPosts", "getLocalizedPosts"],
    ["chapters.json", "Chapters", "getChapters"], ["chapters/{chapter}.json", "ChapterResponse", "getChapter"],
    ["events.json", "Events", "getEvents"],
  ];
  for (const [path, schema, operationId] of endpoints) {
    const entry = document.paths[`/api/v1/${path}`] ??= { get: { summary: operationId, responses: {} } };
    entry.get.operationId = operationId;
    entry.get.parameters ??= [];
    entry.get.parameters.push({ name: "If-None-Match", in: "header", schema: string });
    if (path.includes("{chapter}")) entry.get.parameters.push({ name: "chapter", in: "path", required: true,
      description: "A tracked chapter number listed by chapters.json.", schema: { type: "integer", minimum: 1 } });
    entry.get.responses[200] = { description: `${schema} JSON document.`,
      headers: { ETag: { schema: string }, "Cache-Control": { schema: string } },
      content: { "application/json": { schema: ref(schema) } } };
    entry.get.responses[304] = { description: "Unchanged; reuse the cached response." };
    if (path.includes("{")) entry.get.responses[404] = { description: "Unknown resource. The static host may return a non-JSON error body." };
  }
  return document;
}
