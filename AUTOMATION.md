# Togashi status automation

This automation watches a public X list and proposes tightly scoped production
status changes. The website remains a static Next.js export.

The source list is:

- public list: https://x.com/i/lists/2095219478636495163
- syndication feed:
  https://syndication.twitter.com/srv/timeline-list/list-id/2095219478636495163
- required author ID: `1528978792617611264`
- required handle: `Un4v5s8bgsVk9Xp`

The syndication route is an internal, undocumented X endpoint. It requires no X
API key, but X can change or remove it. Parsing failures must therefore stop the
automation rather than guess.

## Flow

```text
Cloudflare Cron (every 5 minutes)
  -> skip while the GitHub workflow is active
  -> fetch the X list and automation/state.json
  -> keep only original posts from the exact Togashi account
  -> dispatch one oldest-first batch (maximum 5 posts)
  -> serialized GitHub Action
  -> Gemini extraction
  -> deterministic validation
  -> update data/state/share PNGs atomically
  -> Cloudflare deploy from the resulting repository update
```

`automation/state.json` is the canonical cursor. It advances only in the same
repository update that records the result. A failed Action therefore leaves the
post available for a later retry. The Worker also checks for a queued or running
Action before dispatching, which avoids paying for duplicate Gemini runs.

## What may change automatically

Only these whole-chapter production milestones are in scope:

- `inking`
- `background`
- `delivered`

For tweet text, Gemini and a deterministic Japanese expression must identify
the exact same chapter and milestone. The accepted completion expressions are
kept in `automation/contracts.mjs`.

Image-only claims, partial-page progress, ambiguous wording, unknown chapters,
and any disagreement are sent to human review. Images never produce an
automatic status change by themselves.

The reducer is monotonic. It cannot move a chapter backward and it preserves
every unrelated field.

## Protected data

The model cannot write these fields or states:

- `releaseAt`
- `preReleaseAt`
- `jumpIssue`
- `scheduled`
- `published`
- publication history
- translations or interface copy

Those require a separate official Weekly Shonen Jump or reader source and still
need maintainer validation. Automating Togashi posts does not make official
publication scheduling automatic.

## Secrets and activation

Never commit tokens.

The GitHub Action needs a repository Actions secret named `GEMINI_API_KEY`.
The Worker needs `GITHUB_AUTOMATION_TOKEN`, configured with:

```bash
npx wrangler secret put GITHUB_AUTOMATION_TOKEN
```

Use a fine-grained GitHub token limited to this repository with Metadata read,
Contents read, and Actions read/write. The Worker does not need Contents write.

The Action uses the selected fully automatic policy: `contents: write` lets it
push validated status changes directly to `main`, while `issues: write` lets it
open a review Issue for ambiguous evidence. Repository Actions settings and any
branch protection on `main` must allow the built-in `GITHUB_TOKEN` to push.

Keep `AUTOMATION_ENABLED` set to `"false"` in `wrangler.jsonc` until the
workflow exists, both secrets are configured, and a dry run has succeeded.
Then switch it to `"true"` and deploy once.

## Keep Cloudflare builds small

The normal Cloudflare build command is only `npm run build`. It does not install
Chromium or regenerate Share PNGs. The GitHub Action does that heavier work only
when a validated post actually changes a chapter status; ignored and ambiguous
posts only advance `automation/state.json`.

To prevent a state-only automation commit, documentation change, or workflow
change from triggering any Cloudflare deployment, configure **Build watch
paths** in the Cloudflare dashboard with these included paths:

```text
app/*
components/*
lib/*
messages/*
public/*
worker/*
automation/contracts.mjs
package.json
package-lock.json
next.config.ts
postcss.config.mjs
tsconfig.json
wrangler.jsonc
```

Exclude `worker/*.test.mjs`. This dashboard setting is intentionally not stored
in `wrangler.jsonc`.

## Local checks

```bash
npm run automation:test
npm run lint
npx wrangler deploy --dry-run
```

For a local Cron invocation, keep writes disabled:

```bash
npm run cf:dev:cron
```

Then call Wrangler's local scheduled-handler URL. A disabled run should log
`Togashi automation is disabled.`

## Failure behavior

The integration fails closed on an unexpected author, reply, repost, malformed
timeline, stale feed, oversized response, invalid timestamp, invalid Gemini
schema, non-completed Gemini response, unsafe media host, or protected status.

Network calls use timeouts. Temporary Gemini errors are retried with bounded
backoff. A missing image with no sufficient tweet text becomes a review item
instead of being silently ignored.
