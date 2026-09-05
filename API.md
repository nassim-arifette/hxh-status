# HxHStatus public API

HxHStatus exposes a read-only JSON API for the chapter tracker and Yoshihiro
Togashi's latest validated posts. No API key is required. All responses allow
cross-origin reads.

The API is generated as static files during the site build and served from
Cloudflare's asset cache. A request never calls X, Gemini, GitHub, KV, or the
dynamic Worker. Gemini runs once when the automation ingests a new post; the
validated translations are then stored by post ID and reused by notifications
and every API representation.

## Endpoints

| Endpoint | Description |
| --- | --- |
| `GET /api/v1/index.json` | Endpoint index and supported locales |
| `GET /api/v1/status.json` | Current tracker state, chapter rows, and chart URLs |
| `GET /api/v1/togashi/latest.json` | Latest post with every cached translation |
| `GET /api/v1/togashi/posts.json` | Newest-first archive, currently capped at 50 posts |
| `GET /api/v1/togashi/latest/{locale}.json` | Latest post in one requested locale |
| `GET /api/v1/togashi/posts/{locale}.json` | Archive in one requested locale |
| `GET /api/v1/openapi.json` | OpenAPI 3.1 description |

Supported locale values are `ar`, `en`, `es`, `fr`, `ja`, `pt`, and `zh`.
The existing `/status.json` remains available for compatibility.

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
