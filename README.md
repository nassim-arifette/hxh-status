# HxH Status

**[hxhstatus.com](https://hxhstatus.com)**

A minimal, sourced HUNTER×HUNTER publication and production tracker.

The tracker keeps these milestones separate:

- officially published;
- scheduled for publication;
- delivered to Weekly Shonen Jump;
- background specifications complete;
- character inking complete;
- no confirmed production update.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Update the tracker

Current production data is in `app/data/status-data.json`. The adjacent
`app/data/status.ts` module validates it and derives the dashboard values.
Each chapter can include a
status, confirmation date, source URL, Jump issue, note, and a `releaseAt`
timestamp for its official Japanese digital release (for example
`"2026-09-07T00:00:00+09:00"`).

Everything on the page is derived from that file: the four headline numbers, the
"currently publishing / on hiatus" state, and the latest-update panel. Adding a
chapter or moving one to `published` is enough — nothing needs to be changed in
the components.

Publication-history data is in `app/data/publication-history.json`. Add a
Weekly Shonen Jump issue only after its official release. Double-numbered
physical issues count as one issue.

After editing data, update `lastUpdated` in `app/data/status-data.json` and run:

```bash
npm run share:build
```

This command first builds the site, then renders the two tracker sections with
the same React components and CSS used by the site, replaces the interactive
actions with `hxhstatus.com`, and captures them as
`out/share/production.png` and
`out/share/publication-history.png`. The same files are kept in
`public/share/` so Share and Copy also work during local development. These
PNGs are generated once, committed with the data update, and then served as
static assets cached for five minutes and revalidated; site traffic never launches a browser or regenerates
them. The regular `npm run build` deliberately reuses the committed PNGs so
Cloudflare does not need Playwright or Chromium system libraries.

## Togashi update automation

The separate togashi-events Cloudflare Worker watches Togashi through signed X events and a scheduled fallback
and dispatch a serialized GitHub Action. Gemini is treated only as a
conservative extractor: a production status changes automatically only when
Gemini and deterministic Japanese text rules agree. Dates, Jump issues,
publication state, and publication history remain protected.

Automation is enabled in the checked-in configuration; its secrets and repository
permissions must be configured before deployment. See [AUTOMATION.md](AUTOMATION.md) for the
architecture, safety rules, setup, tests, and the parts that still require an
official source.

## Translate the site

English interface text lives in `messages/en.json`. English, French, Japanese,
Spanish, Brazilian Portuguese, Simplified Chinese, and Arabic are published.
Their routes, selector entries, metadata, service-worker copy, and text
direction all come from `lib/locales.json`.

See [TRANSLATING.md](TRANSLATING.md) for the contributor workflow and run
`npm run translations:check` before opening a pull request. A maintainer does
the one-time locale registration; translators then edit only their assigned
`messages/{locale}.json` values. Publishing a reviewed locale automatically
adds it to language detection, the selector, the sitemap, and hreflang metadata.

## Public API

The build publishes versioned, CORS-enabled JSON for the tracker and Togashi's
validated posts. Each new post is translated once during ingestion and stored
by post ID; API reads are static Cloudflare asset requests and never invoke
Gemini or X. Localized endpoints cover all seven published languages.

See [API.md](API.md) for endpoints, response examples, translation fallbacks,
and the five-minute polling contract for bots. `/status.json` remains available
for existing integrations, while new consumers should use `/api/v1/status.json`.

## Deploy

`next.config.ts` sets `output: "export"`, so `npm run build` emits the site
to `out/`. Cloudflare serves matching files directly as static assets; a very
small Worker handles the push API and unmatched HTTP requests. The separate
togashi-events Worker owns scheduled jobs and X webhooks.
No Next.js server or framework adapter is needed.

`wrangler.jsonc` declares the static assets and public push Worker.
The scheduled event Worker is configured in wrangler.x-activity.jsonc.
Static asset requests bypass Worker execution by default. Keep this file in the
repository so Wrangler does not infer a server-rendered OpenNext deployment.

Cloudflare Workers build settings:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

Wrangler is installed locally, so the same CLI version is used on every
machine. These commands cover the usual deployment checks:

```bash
npm run cf:dev          # build and preview with the Cloudflare runtime
npm run cf:check        # build and validate without publishing
npm run cf:deployments  # list active production deployments
npm run cf:logs         # stream production logs
```

Run `npx wrangler login` once before using commands that access the Cloudflare
account.

Any other static host can serve `out/`; the optional monitoring automation
would need an equivalent scheduler.

## Sources

- [Yoshihiro Togashi on X](https://x.com/Un4v5s8bgsVk9Xp)
- [HUNTER×HUNTER on VIZ Shonen Jump](https://www.viz.com/shonenjump/chapters/hunter-x-hunter)
- Weekly Shonen Jump

`app/data/publication-history.json` is derived from the
[HUNTER×HUNTER Hiatus Chart](https://github.com/hiatus-hiatus/hiatus-hiatus.github.io),
copyright its contributors and distributed under the MIT License. The 2026
chapter 419 entry and current production-status data were added separately.

This is an unofficial fan-made tracker. HUNTER×HUNTER and its related marks
belong to their respective rights holders.

## License

The application code is available under the MIT License.

Geist is copyright Vercel and licensed under the SIL Open Font License 1.1.
Lucide icons are licensed under the ISC License.
