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
X Activity post.create webhook on a secret callback path
  -> verify the X HMAC signature
  -> reject replies, reposts, duplicates, and unexpected authors
  -> queue the post in Cloudflare KV
  -> fetch the canonical post and image URLs from the official X API
  -> sign the exact dispatch payload with an independent HMAC secret
  -> dispatch the payload and signature to the serialized GitHub Action
  -> withhold the post alert until the Action reports a verdict
  -> serialized GitHub Action
  -> verify signature and freshness before Gemini or repository writes
  -> Gemini extraction
  -> deterministic validation
  -> report the verdict to the Worker before the slow build steps
  -> Worker announces tracker milestones, or releases the held post alert
  -> update data/state/share PNGs atomically
  -> Cloudflare deploy from the resulting repository update

Retry Cron (every five minutes)
  -> resume incomplete webhook jobs from KV through the same serialized runner
  -> release any post alert whose verdict never arrived

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

The GitHub Action needs repository Actions secrets named `GEMINI_API_KEY` and
`AUTOMATION_PAYLOAD_SECRET`. The `togashi-events` Worker needs
`X_CONSUMER_SECRET`, `X_WEBHOOK_PATH_SECRET`, `X_BEARER_TOKEN`,
`GITHUB_AUTOMATION_TOKEN`, `AUTOMATION_PAYLOAD_SECRET`, and
`VAPID_PRIVATE_KEY`. The public `hxhstatus` Worker only receives the public
VAPID key through `wrangler.jsonc`; it must not contain the GitHub token, X
credentials, payload HMAC secret, or VAPID private key.

```bash
npx wrangler secret put GITHUB_AUTOMATION_TOKEN --config wrangler.x-activity.jsonc
npx wrangler secret put AUTOMATION_PAYLOAD_SECRET --config wrangler.x-activity.jsonc
npx wrangler secret put X_WEBHOOK_PATH_SECRET --config wrangler.x-activity.jsonc
```

Generate independent random values for `AUTOMATION_PAYLOAD_SECRET` and
`X_WEBHOOK_PATH_SECRET`; never reuse the X consumer secret. Store the first
value under the same name in GitHub Actions. Configure the X callback as:

```text
https://<togashi-events-worker-host>/webhook/<X_WEBHOOK_PATH_SECRET>
```

The secret path prevents public access to the X challenge-response endpoint.
The handler also refuses to sign JSON objects or arrays, so a CRC challenge
cannot be replayed as an Activity body. GitHub rejects a manually dispatched,
tampered, stale, or unsigned payload before Gemini runs or files are written.

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
automation/payload-auth.mjs
package.json
package-lock.json
next.config.ts
postcss.config.mjs
tsconfig.json
wrangler.jsonc
```

Exclude `worker/*.test.mjs`. This dashboard setting is intentionally not stored
in `wrangler.jsonc`.

## KV budget

The Free plan allows 100,000 KV reads a day but only **1,000 writes and 1,000
`list` requests**, and Wrangler or dashboard operations count too. `list` is the
scarce resource, so the rule is that nothing may spend it on a schedule.

An idle Cron tick costs one `list` (the pipeline retry queue) and nothing else.
Two things used to make it cost more, and both are gone:

- The legacy migration listed a prefix that is empty in production, every tick.
  It is now behind `PUSH_LEGACY_MIGRATION_ENABLED`.
- Pending verification listed the pending prefix to almost always find nothing.
  It now asks the Durable Object, whose SQLite already indexes state.

The syndication clock lived in a KV key, costing a read every tick and a write
every third one. It is derived from `controller.scheduledTime` instead.

Delivery used to renew every reached subscriber's lease, at one KV write each.
That put a hard ceiling near a thousand deliveries a day regardless of anything
else. The registry now extends a lease only once
`PUSH_RENEW_AFTER_SECONDS` of it has elapsed, and SQLite holds the expiry, so
the usual push costs no KV operation for the lease at all. A dead endpoint is
still removed immediately on a `404`/`410`, which is what actually keeps the
registry clean.

What remains proportional to the audience is one `list` per 32 subscribers per
broadcast, plus one read per subscriber. At a few thousand subscribers and a
handful of notifications a week that stays well inside the quota; past that,
paginate from the Durable Object rather than `push:verified:`.

## Tracker milestone notifications

A post alert and a tracker milestone describe the same event, so subscribers
must not receive both. The Worker cannot know which one applies at the moment a
post arrives — that takes Gemini and the deterministic validation — so it holds
the post alert for up to ten minutes and waits for the Action to report back.

```
post arrives  -> alert withheld inside the existing pipeline job
verdict says a chapter moved  -> milestone announced, post alert dropped,
                                 push cursor advanced so the fallback is a no-op
verdict says nothing moved    -> post alert released as-is
no verdict within ten minutes -> post alert released by the Cron
```

The hold lives in `pipeline:pending:<postId>`, the record the retry Cron already
lists, so waiting costs no extra KV listing.

A milestone is a chapter climbing the status ladder, never a chapter appearing:
adding rows for future chapters is silent because they start at `unknown`, the
lowest rank. `push:announced-milestones` records what was announced and is
written only once delivery succeeds, so a replayed verdict is silent and a
failed send is retried rather than swallowed.

Publication state follows the chapters. A scheduled chapter means the series is
running — Jump schedules before anything is published, and the five-week gap
cannot see that — while the gap alone is what eventually reports a hiatus.

### Configuration

| Name | Where | Purpose |
| --- | --- | --- |
| `TRACKER_VERDICT_SECRET` | Worker secret **and** GitHub secret | HMAC for the Action's verdict, independent of `AUTOMATION_PAYLOAD_SECRET` |
| `TRACKER_VERDICT_URL` | GitHub secret | `https://<events worker>/tracker-verdict` |
| `TRACKER_VERDICT_DRY_RUN` | Worker var, optional | `"true"` reports what would be sent without sending or recording it |

The two directions sign with different contexts, so a captured dispatch
signature cannot be replayed as a verdict. Set the Worker secret with:

```bash
npx wrangler secret put TRACKER_VERDICT_SECRET --config wrangler.x-activity.jsonc
```

Until that secret exists the endpoint answers `503` and every post alert falls
through to the ten-minute deadline, which is the safe default: subscribers keep
receiving post alerts and simply never receive milestones.

### Rehearsing without notifying anyone

`TRACKER_VERDICT_DRY_RUN="true"` walks the whole decision — diff, deduplication,
payload, locale — logs the notification it would send, and returns it in the
response. It sends nothing, resolves no held post, and **does not write the
announced record**; a rehearsal that consumed that record would silence the real
milestone permanently.

For an end-to-end check including delivery, use the local Wrangler state, which
holds no production subscriber:

```bash
npm run push:setup-local   # once: a local VAPID pair in .dev.vars
npm run cf:dev             # then open the site and enable notifications
npm run push:send-local    # a real, encrypted notification to that browser
```

`push:send-local` takes an optional payload, so any milestone can be rehearsed:

```bash
npm run push:send-local -- '{"v":1,"kind":"tracker-milestone","locale":"fr","revision":"test","chapters":[],"publication":"hiatus"}'
```

It reads local KV only and never passes `--remote`, so it cannot reach a
production subscriber. Chrome's DevTools no longer offer a push payload field,
which is why this exists.

## Browser push notifications

Visitors can opt in from the bell in the site header. Permission is requested
only after a click. The service worker receives a closed payload and opens either
the site or the validated Togashi post on X.

The signed X Activity event is the primary notification trigger. The 15-minute
syndication Cron uses the same cursor only to repair a missed event. Push delivery
is independent from the Gemini decision: visitors are notified for every original
Togashi post, even if it does not change a chapter status. Verified
subscriptions, the push cursor, and a retryable broadcast job are stored in the
shared `PUSH_SUBSCRIPTIONS` KV binding. A globally unique Durable Object admits
at most 5,000 total registrations, including at most 256 pending registrations.
That same object serializes lifecycle writes and checks a per-registration
revision, so an in-flight delivery cannot undo a locale refresh or unsubscribe.
New registrations first receive a short-lived confirmation push; only an
endpoint accepted by a supported browser push service is promoted. Pending
records expire after 10 minutes and active records after 180 days. A site visit
or successful delivery renews an active lease. Old unleased records are
revalidated in bounded batches. Delivery runs in pages of 32, retries only
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

Deploy `wrangler.jsonc` first because the public `hxhstatus` Worker owns the
Durable Object class and its SQLite migration. Then deploy
`wrangler.x-activity.jsonc`, whose event Worker uses the same object through an
external binding.

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
npx wrangler deploy --dry-run --config wrangler.x-activity.jsonc
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
