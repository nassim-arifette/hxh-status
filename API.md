# HxHStatus public API

HxHStatus exposes a read-only API for the chapter tracker, localized chart
PNGs, and Yoshihiro Togashi's latest validated posts. No API key is required.
All responses allow cross-origin reads.

The API is generated as static files during the site build and served from
Cloudflare's asset cache. A request never calls X, Gemini, GitHub, KV, or the
dynamic Worker. Gemini processes each new post during ingestion (with bounded retries on transient failures); the
validated translations are then stored by post ID and reused by notifications
and every API representation.

## Endpoints

| Endpoint | Description |
| --- | --- |
| `GET /api/v1/index.json` | Endpoint index, supported locales, and revisioned chart URLs |
| `GET /api/v1/status.json` | Current tracker state, chapter rows, and chart URLs |
| `GET /api/v1/stats.json` | Descriptive hiatus, publication pace, and lead-time statistics |
| `GET /api/v1/chapters.json` | Tracked chapter index with individual JSON URLs |
| `GET /api/v1/chapters/{chapter}.json` | Chapter metadata, localized titles, and related post IDs |
| `GET /api/v1/events.json` | Available sourced transitions and current status observations |
| `GET /share/{locale}/production.png` | Chart 1: production tracker, returned directly as a PNG |
| `GET /share/{locale}/publication-history.png` | Chart 2: publication history, returned directly as a PNG |
| `GET /api/v1/togashi/latest.json` | Latest post with every cached translation |
| `GET /api/v1/togashi/posts.json` | Newest-first archive, currently capped at 50 posts |
| `GET /api/v1/togashi/latest/{locale}.json` | Latest post in one requested locale |
| `GET /api/v1/togashi/posts/{locale}.json` | Archive in one requested locale |
| `GET /api/v1/openapi.json` | OpenAPI 3.1 description |
| `GET /feed.xml` | Atom 1.0 syndication feed (English / default) |
| `GET /{locale}/feed.xml` | Localized Atom 1.0 syndication feed |
| `GET /releases.ics` | iCalendar (.ics) subscription for chapter releases |
| `GET /badge/status.svg` | Embeddable status SVG badge (English / default) |
| `GET /badge/{locale}/status.svg` | Localized status overview SVG badge |
| `GET /badge/{locale}/latest.svg` | Last published chapter SVG badge |
| `GET /badge/{locale}/progress.svg` | Confirmed progress stage SVG badge |
| `GET /badge/{locale}/next.svg` | Next chapter and stage SVG badge |

Supported locale values are `ar`, `en`, `es`, `fr`, `ja`, `pt`, and `zh`.
The existing `/status.json` remains available for compatibility.

## Chapter details and events

`GET /api/v1/chapters.json` lists all chapters in the current tracker, including
rows whose status is `unknown`. It is not a catalogue of every historical chapter.
Follow an entry's `url`, for example `/api/v1/chapters/427.json`, to get its
`chapter` object: status, titles keyed by locale, volume, arc, known dates,
source URL, and `relatedPostIds` from the retained post archive.

Missing titles, confirmed volumes, dates and source URLs are `null`. Volume
numbers are never projected. `arcInferred: true` means the chapter is beyond
the publication history and uses the latest known arc; it is not an official
confirmation. Other optional tracker fields, such as `jumpIssue`, may be absent.
Unknown chapter numbers return HTTP 404; the error body may not be JSON.

`GET /api/v1/events.json` returns newest-first `events`, with stable `id`,
`chapter`, `from`, `to`, `date`, `source` and `postId` fields. A `transition`
comes from an applied post's recorded tracker changes. An `observation` comes
from the current tracker and has `from: null`: the previous state is unknown.
Review and ignored posts do not create transitions. Dates preserve their source
precision (date-only or timestamp); a scheduled release date is not used as the
date on which scheduling was announced.

The event feed explicitly returns `complete: false` and
`coverage: "retained-posts-and-current-tracker"`. It is not a durable audit log:
older observations may disappear as the tracker advances, and post-derived
events depend on the retained archive. Corrections can update an existing event
without changing its ID. Consumers should persist IDs to avoid duplicate alerts
and compare event content if they need correction notifications.

Both chapter endpoints and the event feed expose a SHA-256 content `revision`.
It changes with the relevant data, including corrections, without adding a
build timestamp that would invalidate caches on every deployment. The chapter
index revision covers the complete chapter details, not just its compact rows.
Existing status and chart revision semantics are unchanged.

```js
const response = await fetch("https://hxhstatus.com/api/v1/chapters/427.json");
if (!response.ok) throw new Error(`HxHStatus API: ${response.status}`);
const { chapter, revision } = await response.json();
console.log(chapter.titles.fr, chapter.status, revision);
```

The OpenAPI document defines reusable response schemas, required fields,
nullable values, status enums, and conditional GET responses for all JSON data
endpoints. Additive fields remain allowed under v1.

## Get the charts

Each chart has a direct GET endpoint in every supported language. For French:

```http
GET https://hxhstatus.com/share/fr/production.png
GET https://hxhstatus.com/share/fr/publication-history.png
```

Replace `fr` with `ar`, `en`, `es`, `ja`, `pt`, or `zh`. Both endpoints return
`200 OK` with `Content-Type: image/png`; there is no JSON wrapper, login, or
browser rendering step for the caller. An unknown locale returns `404`.
The older `/share/production.png` and `/share/publication-history.png` URLs
remain English aliases.

The OpenAPI operations are `getProductionChart` and
`getPublicationHistoryChart`. `/api/v1/index.json` advertises both URL patterns
and includes ready-to-use, revisioned URLs under `charts.production[locale]`
and `charts.publicationHistory[locale]`. The same `charts` map is available in
`/api/v1/status.json` for bots that also need chapter data.

For a bot, prefer those revisioned URLs so an image cache notices tracker
updates:

```js
const response = await fetch("https://hxhstatus.com/api/v1/index.json");
if (!response.ok) throw new Error(`HxHStatus API: ${response.status}`);
const { charts } = await response.json();

const productionPng = charts.production.fr;
const publicationHistoryPng = charts.publicationHistory.fr;
// Use either URL as a bot embed image, or fetch it to attach the PNG bytes.
```

PNGs are regenerated with tracker updates and served as static assets. They
are cached for five minutes and support `ETag` / `If-None-Match` revalidation.
The `?r=...` query is a cache refresh token, not a historical snapshot selector:
the endpoint always serves the current deployed image. Localized PNGs also
work with `npm run dev`; the JSON API is generated by `npm run build` and can
be previewed with `npm run cf:dev`.

## Get Togashi posts

For example:

```text
https://hxhstatus.com/api/v1/togashi/latest/fr.json
```

returns a document shaped like this:

```json
{
  "schemaVersion": 1,
  "self": "https://hxhstatus.com/api/v1/togashi/latest/fr.json",
  "pollAfterSeconds": 300,
  "locale": "fr",
  "post": {
    "id": "2094673907626414299",
    "author": {
      "id": "1528978792617611264",
      "name": "Yoshihiro Togashi",
      "screenName": "Un4v5s8bgsVk9Xp"
    },
    "createdAt": "2026-09-01T06:29:11.000Z",
    "url": "https://x.com/Un4v5s8bgsVk9Xp/status/2094673907626414299",
    "text": {
      "value": "N° 427 : manuscrit terminé. https://t.co/MohufGEVuG",
      "language": "fr",
      "translated": true,
      "originalLanguage": "ja",
      "originalValue": "No.427、原稿完成。 https://t.co/MohufGEVuG"
    },
    "translation": {
      "status": "available",
      "provider": "manual",
      "model": null,
      "generatedAt": "2026-09-05T16:24:31.932Z"
    },
    "mediaUrls": [
      "https://pbs.twimg.com/media/HRHGz-LaUAASmgj.jpg"
    ],
    "tracker": {
      "decision": "apply",
      "changes": [
        {
          "chapter": 427,
          "from": "unknown",
          "to": "delivered"
        }
      ]
    }
  }
}
```

`translation.status` can be `unavailable` if processing could not produce a
valid translation. A localized endpoint then returns the original Japanese in
`text.value`, sets `text.language` to `ja`, and sets `text.translated` to
`false`. Consumers should always retain the source URL and treat translations
as machine-generated unless `translation.provider` says `manual`.

Posts also expose `imageTexts` for readable text extracted from attached images.
Each item has a one-based `imageIndex` pointing into `mediaUrls`, `originalText`,
and `translations` for all seven locales. Localized endpoints instead provide
`text` and `language` alongside the index and original text. An empty array (or
an absent field in older cached posts) means no image transcription is available.
Image text is kept separate from the tweet and never added to `text.value`.

## Hiatus and publication pace statistics

`GET /api/v1/stats.json` returns build-time derived descriptive statistics from 28 years of Weekly Shōnen Jump publication history (1998–2026) and current manuscript status:

```json
{
  "schemaVersion": 1,
  "self": "https://hxhstatus.com/api/v1/stats.json",
  "pollAfterSeconds": 300,
  "stats": {
    "currentHiatus": {
      "elapsedIssues": 0,
      "elapsedDays": 0,
      "sinceDate": "2026-09-07",
      "sinceChapter": 420,
      "sinceJumpIssue": "2026 #41",
      "historicalRank": 87,
      "totalHistoricalHiatuses": 86,
      "isJustStarted": true
    },
    "historicalHiatuses": {
      "totalCount": 86,
      "medianIssuesAll": 1,
      "majorThreshold": 10,
      "majorCount": 13,
      "medianIssuesMajor": 56,
      "medianDaysMajorApprox": 392,
      "maxIssues": 184,
      "maxHiatus": {
        "startYear": 2019,
        "startIssue": 1,
        "endYear": 2022,
        "endIssue": 46,
        "issues": 184,
        "approxYears": 3.8
      }
    },
    "publicationRuns": {
      "totalRunsCount": 87,
      "medianRunLength": 3,
      "modernBatchSize": 10,
      "modernRunsCount": 6,
      "modernBatchConsistencyPercent": 100,
      "longestRun": {
        "startYear": 2011,
        "startIssue": 35,
        "endYear": 2012,
        "endIssue": 16,
        "startChapter": 311,
        "endChapter": 340,
        "length": 30
      }
    },
    "publicationRate": {
      "totalJumpIssues": 1370,
      "totalChaptersPublished": 422,
      "publishedPercentage": 30.8,
      "hiatusPercentage": 69.2
    },
    "leadTime": {
      "observedBatchesCount": 2,
      "medianLeadTimeDays": 82.5,
      "currentDeliveredCount": 7,
      "currentDeliveredTarget": 10,
      "observations": [
        {
          "batch": "Ch. 391–400",
          "startChapter": 391,
          "endChapter": 400,
          "deliveryDate": "2022-07-25",
          "releaseDate": "2022-10-24",
          "delayDays": 91,
          "source": "Yoshihiro Togashi on X (@Un4v5s8bgsVk9Xp) & WSJ 2022 #47"
        },
        {
          "batch": "Ch. 401–410",
          "startChapter": 401,
          "endChapter": 410,
          "deliveryDate": "2024-07-25",
          "releaseDate": "2024-10-07",
          "delayDays": 74,
          "source": "Yoshihiro Togashi on X (@Un4v5s8bgsVk9Xp) & WSJ 2024 #45"
        }
      ]
    }
  }
}
```

The data is strictly descriptive. No estimated return dates or countdowns are calculated or returned.

## Atom feeds and calendar subscription

For feed readers, aggregators, bot integrations (Discord, Slack, IFTTT), and calendar apps:

### Atom Feeds

Atom 1.0 feeds emit an item for every confirmed chapter status milestone and every Yoshihiro Togashi post, with translated titles, confirmation dates, stable identifiers across builds (`tag:hxhstatus.com,2026:...`), and links to official sources.

- Default feed (English): `GET https://hxhstatus.com/feed.xml`
- Localized feeds: `GET https://hxhstatus.com/{locale}/feed.xml` (`ar`, `en`, `es`, `fr`, `ja`, `pt`, `zh`)

HTML pages include `<link rel="alternate" type="application/atom+xml" ...>` in the `<head>` for automated feed discovery. Feeds are served with the standard 5-minute cache policy.

### iCalendar (.ics) Release Calendar

- `GET https://hxhstatus.com/releases.ics`

One-click calendar subscription for HUNTER×HUNTER chapter release dates, driven by `releaseAt` timestamps in `status-data.json`. Imports cleanly into Google Calendar, Apple Calendar, and Outlook.

## Embeddable SVG badges

Embeddable shields.io-style SVG badges are generated statically at build time and served with the standard 5-minute cache with `must-revalidate`. They render with high contrast across light and dark backgrounds.

### Endpoints

| Endpoint | Example |
| --- | --- |
| `GET /badge/status.svg` | Overall publication state and latest progress |
| `GET /badge/{locale}/status.svg` | Localized overview badge (`ar`, `en`, `es`, `fr`, `ja`, `pt`, `zh`) |
| `GET /badge/{locale}/latest.svg` | Latest officially published chapter |
| `GET /badge/{locale}/progress.svg` | Confirmed production progress |
| `GET /badge/{locale}/next.svg` | Next chapter number and its production stage |

### Markdown embed example

```markdown
[![HxH Status](https://hxhstatus.com/badge/status.svg)](https://hxhstatus.com)
```

## Polling and cache use

Poll no more often than `pollAfterSeconds`, currently five minutes. Store the
response `ETag` and send it in the next request as `If-None-Match`; Cloudflare
can then answer with `304 Not Modified` without transferring the JSON again.
The API sends a five-minute shared-cache policy with one hour of stale serving
during revalidation.

A Discord bot usually needs only one localized endpoint. It can remember the
last `post.id` and publish only when that ID changes:

```js
const response = await fetch(
  "https://hxhstatus.com/api/v1/togashi/latest/fr.json",
  {
    headers: {
      Accept: "application/json",
      "User-Agent": "example-discord-bot/1.0 (contact@example.com)"
    }
  }
);

if (!response.ok) throw new Error(`HxHStatus API: ${response.status}`);
const { post, pollAfterSeconds } = await response.json();
```

The `v1` URL and `schemaVersion` remain stable for compatible additions. A
breaking response change will use a new versioned path.
