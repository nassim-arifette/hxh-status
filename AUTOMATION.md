# Togashi status automation

This automation receives signed X Activity events for Togashi and proposes
tightly scoped production status changes. The website remains a static Next.js
export.

The source list is:

- public list: https://x.com/i/lists/2095219478636495163
- syndication feed:
  https://syndication.twitter.com/srv/timeline-list/list-id/2095219478636495163
- required author ID: `1528978792617611264`
- required handle: `Un4v5s8bgsVk9Xp`

The syndication route is an internal, undocumented X endpoint. It is retained
only as a 15-minute fallback if an Activity event or its retry pipeline is
missed. It requires no X API key, but X can change or remove it. Parsing failures
must therefore stop the fallback rather than guess.

## Flow

```text
X Activity post.create webhook
  -> verify the X HMAC signature
  -> reject replies, reposts, duplicates, and unexpected authors
  -> queue the post in Cloudflare KV
  -> fetch the canonical post and image URLs from the official X API
  -> dispatch the post to the serialized GitHub Action
  -> broadcast browser notifications from the same event
  -> serialized GitHub Action
  -> Gemini extraction
  -> deterministic validation
  -> update data/state/share PNGs atomically
  -> Cloudflare deploy from the resulting repository update

Retry Cron (every minute)
  -> resume incomplete webhook jobs from KV through the same serialized runner

Fallback Cron (every 15 minutes)
  -> fetch the legacy syndication list
  -> recover any post missing from GitHub state or the push cursor
```

`automation/state.json` is the canonical cursor. It advances only in the same
repository update that records the result. A failed Action therefore leaves the
post available for a later retry. The event Worker persists incomplete jobs and
the fallback checks the same cursor. Both paths check for a queued or running
Action before dispatching, which avoids paying for duplicate Gemini runs.

Both entry paths are serialized inside the event Worker. The primary queue is
always drained before syndication runs. If two Worker isolates still receive the
same post at the same instant, the GitHub concurrency group and repository
cursor make the second workflow a no-op, while the shared push cursor, Web Push
topic, and service-worker notification tag prevent a second visitor alert. This
works in both orders: webhook first or fallback first.

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
The `togashi-events` Worker needs `X_CONSUMER_SECRET`, `X_BEARER_TOKEN`,
`GITHUB_AUTOMATION_TOKEN`, and `VAPID_PRIVATE_KEY`. The public `hxhstatus`
Worker only receives the public VAPID key through `wrangler.jsonc`; it must not
contain the GitHub token, X credentials, or VAPID private key.

```bash
npx wrangler secret put GITHUB_AUTOMATION_TOKEN --config wrangler.x-activity.jsonc
```

Use a fine-grained GitHub token limited to this repository with Metadata read,
Contents read, and Actions read/write. The Worker does not need Contents write.

The Action uses the selected fully automatic policy: `contents: write` lets it
push validated status changes directly to `main`, while `issues: write` lets it
open a review Issue for ambiguous evidence. Repository Actions settings and any
branch protection on `main` must allow the built-in `GITHUB_TOKEN` to push.

Keep both Workers disabled until the workflow, KV bindings, and secrets are
configured and a dry run has succeeded. Then enable and deploy both configs.

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

## Browser push notifications

Visitors can opt in from the bell in the site header. Permission is requested
only after a click. The service worker receives a closed payload and opens either
the site or the validated Togashi post on X.

The signed X Activity event is the primary notification trigger. The 15-minute
syndication Cron uses the same cursor only to repair a missed event. Push delivery
is independent from the Gemini decision: visitors are notified for every original
Togashi post, even if it does not change a chapter status. Subscriptions, the
push cursor, and a retryable broadcast job are stored in the shared
`PUSH_SUBSCRIPTIONS` KV binding. Delivery runs in pages of 32, retries only
failed recipients, removes expired or permanently invalid subscriptions, and
abandons a recipient after six transient failures so later posts cannot remain
blocked.

Generate one VAPID key pair and keep it stable. Rotating it invalidates existing
browser subscriptions. Put only the private key in the event Worker; the public
key is stored in both Wrangler configs:

```bash
npx web-push generate-vapid-keys --json
npx wrangler secret put VAPID_PRIVATE_KEY --config wrangler.x-activity.jsonc
```

Before activation, set `PUSH_INITIAL_TWEET_ID` to the newest validated Togashi
post so existing posts are not announced as new. Then set
`PUSH_NOTIFICATIONS_ENABLED` to `"true"` and deploy. Do not configure
`PUSH_TEST_ENABLED` in production; it exists only for the local confirmation
notification.

For a local browser test:

```bash
npm run push:setup-local
npm run build
npx wrangler dev --port 8787
```

Open `http://127.0.0.1:8787`, click the bell, and allow notifications. Local
setup sends an immediate real Web Push confirmation through the browser push
service.

## Local checks

```bash
npm run automation:test
npm run lint
npx wrangler deploy --dry-run
```

For a local fallback Cron invocation, keep external writes disabled:

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
