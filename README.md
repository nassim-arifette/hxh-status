# HxH Status

**[hxhstatus.com](https://hxhstatus.com)**

A minimal, sourced HUNTER×HUNTER publication and production tracker.

The tracker keeps these milestones separate:

- officially published;
- delivered or scheduled by Weekly Shonen Jump;
- manuscript complete;
- background directions complete;
- character inking complete;
- no confirmed update.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Update the tracker

Current production data is in `app/data/status.ts`. Each chapter can include a
status, confirmation date, source URL, Jump issue, note, and a short
`scheduleLabel` for a chapter that has a confirmed release date but is not out
yet (for example `"Sep 6 / 7"`).

Everything on the page is derived from that file: the four headline numbers, the
"currently publishing / on hiatus" state, and the latest-update panel. Adding a
chapter or moving one to `published` is enough — nothing needs to be changed in
the components.

Publication-history data is in `app/data/publication-history.json`. Add a
Weekly Shonen Jump issue only after its official release. Double-numbered
physical issues count as one issue.

After editing data, update `lastUpdated` in `app/data/status.ts` and run:

```bash
npm run build
```

## Deploy

`next.config.ts` sets `output: "export"`, so `npm run build` emits a fully
static site to `out/`. There is no server, database, or environment variable to
configure, and no framework adapter is needed.

`wrangler.jsonc` declares `out/` as a static asset directory and defines no
Worker script, so Cloudflare serves the built files directly. That file has to
stay in the repository: without it Wrangler infers the framework, assumes
server-side rendering, and pulls in the OpenNext adapter, which then fails
looking for a `.next/standalone` build that a static export never produces.

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

Any other static host works the same way — serve the contents of `out/`.

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
