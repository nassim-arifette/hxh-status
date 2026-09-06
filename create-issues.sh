#!/usr/bin/env bash
#
# Creates the labels, milestones and issues of the hxhstatus backlog.
#
# Requires the gh CLI authenticated with write access to the repository:
#   gh auth login
#
# Usage:
#   ./create-issues.sh --dry-run     # print without creating anything
#   ./create-issues.sh               # create for real
#
set -euo pipefail

REPO="${REPO:-nassim-arifette/hxh-status}"
DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

run() {
  if [[ $DRY_RUN -eq 1 ]]; then
    printf '[dry-run] %s\n' "$*"
  else
    "$@"
  fi
}

echo "== Labels =="
run gh label create "bug" --repo "$REPO" --color "d73a4a" --description "Something is broken or behaves incorrectly" --force
run gh label create "feature" --repo "$REPO" --color "a2eeef" --description "New functionality" --force
run gh label create "chore" --repo "$REPO" --color "cfd3d7" --description "Maintenance, tooling, repo hygiene" --force
run gh label create "refactor" --repo "$REPO" --color "fbca04" --description "Restructuring with no behaviour change" --force
run gh label create "ci" --repo "$REPO" --color "0e8a16" --description "Continuous integration and GitHub Actions workflows" --force
run gh label create "a11y" --repo "$REPO" --color "7057ff" --description "Accessibility" --force
run gh label create "i18n" --repo "$REPO" --color "1d76db" --description "Internationalisation and translations" --force
run gh label create "performance" --repo "$REPO" --color "f9d0c4" --description "Bundle size, load time" --force
run gh label create "security" --repo "$REPO" --color "b60205" --description "Security, CSP, secrets" --force
run gh label create "seo" --repo "$REPO" --color "5319e7" --description "Search indexing and metadata" --force
run gh label create "pwa" --repo "$REPO" --color "006b75" --description "Service worker, manifest, push notifications" --force
run gh label create "types" --repo "$REPO" --color "bfd4f2" --description "TypeScript typing" --force
run gh label create "test" --repo "$REPO" --color "c2e0c6" --description "Test coverage" --force
run gh label create "documentation" --repo "$REPO" --color "0075ca" --description "Docs and contributor guides" --force
run gh label create "automation" --repo "$REPO" --color "e4e669" --description "Togashi / publication automation pipeline" --force
run gh label create "good first issue" --repo "$REPO" --color "7057ff" --description "Good entry point for a first contribution" --force
run gh label create "priority:high" --repo "$REPO" --color "b60205" --description "Do this first" --force
run gh label create "priority:medium" --repo "$REPO" --color "fbca04" --description "Schedule it" --force
run gh label create "priority:low" --repo "$REPO" --color "cfd3d7" --description "Once everything else is done" --force

echo "== Milestones =="
run gh api "repos/$REPO/milestones" -f title="Quality and reliability" --silent 2>/dev/null || echo "  milestone \"Quality and reliability\" already exists"
run gh api "repos/$REPO/milestones" -f title="Performance and accessibility" --silent 2>/dev/null || echo "  milestone \"Performance and accessibility\" already exists"
run gh api "repos/$REPO/milestones" -f title="New features" --silent 2>/dev/null || echo "  milestone \"New features\" already exists"

echo "== Issues =="

echo "  -> #1 build(lint): replace the hand-written file list with `eslint .`"
read -r -d '' BODY <<'ISSUE_BODY_EOF' || true
## Context

The `lint` script in `package.json` lists every file to check by hand. The `automation:test` script does the same for test files.

## Problem

The list has already drifted. Two files in the repo are never linted:

- `app/opengraph-image.tsx` (407 lines)
- `scripts/setup-local-push.mjs`

This will keep happening with every new file, silently. No error, just coverage quietly shrinking.

## Proposal

```jsonc
"lint": "eslint .",
"test": "node --test \"{automation,worker}/**/*.test.mjs\"",
"automation:test": "npm test"
```

Add `out/`, `.next/` and `node_modules/` to the `ignores` field in `eslint.config.mjs`. Node 22 handles `--test` globs natively.

## Acceptance criteria

- [ ] `npm run lint` covers every `.ts`/`.tsx`/`.mjs` file outside generated directories
- [ ] `npm run lint` passes on `main` (fix whatever the two previously unlinted files surface)
- [ ] `npm test` discovers test files by glob, with no enumeration
- [ ] Adding a throwaway test file confirms it gets picked up

## Files involved

- `package.json`
- `eslint.config.mjs`

**Estimated effort:** XS (~30 min)
ISSUE_BODY_EOF
run gh issue create --repo "$REPO" \
  --title "build(lint): replace the hand-written file list with `eslint .`" \
  --label "chore,ci,priority:high,good first issue" \
  --milestone "Quality and reliability" \
  --body "$BODY"

echo "  -> #2 ci: add a verification workflow for pull requests"
read -r -d '' BODY <<'ISSUE_BODY_EOF' || true
## Context

`.github/workflows/` only contains `togashi-status.yml` and `publication-status.yml`, both automation workflows triggered by `workflow_dispatch` and `schedule`.

## Problem

Nothing runs on pull requests or on pushes to `main`. `TRANSLATING.md` explicitly asks translators to run `npm run translations:check` before opening a PR, but nothing verifies it server-side. A broken translation PR can be merged and take the production build down with it.

## Proposal

Add `.github/workflows/ci.yml` triggered on `pull_request` and pushes to `main`:

```yaml
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm run translations:check
      - run: npm test
      - run: npm run build
```

Then enable branch protection on `main` requiring this check. Depends on #1 so the lint step is actually exhaustive.

## Acceptance criteria

- [ ] The workflow runs on every PR and on pushes to `main`
- [ ] It fails when lint, type-check, `translations:check`, tests or the build fail
- [ ] npm caching is enabled (job under roughly 3 minutes)
- [ ] `main` is protected and requires this check before merge
- [ ] A status badge is added to the README

## Files involved

- `.github/workflows/ci.yml`
- `README.md`

**Estimated effort:** S (~1 h)
ISSUE_BODY_EOF
run gh issue create --repo "$REPO" \
  --title "ci: add a verification workflow for pull requests" \
  --label "ci,priority:high" \
  --milestone "Quality and reliability" \
  --body "$BODY"

echo "  -> #3 i18n(data): chapter titles are untranslated in pt, zh and ar (31/421)"
read -r -d '' BODY <<'ISSUE_BODY_EOF' || true
## Context

`app/data/chapter-titles.ts` holds titles for 421 chapters, with a `titles` object per locale and a fallback to English.

## Problem

Actual coverage, measured on `main`:

| Locale | Translated titles | Coverage |
|---|---|---|
| `en` | 421 / 421 | 100% |
| `fr` | 421 / 421 | 100% |
| `ja` | 421 / 421 | 100% |
| `es` | 370 / 421 | 88% |
| `pt` | 31 / 421 | **7%** |
| `zh` | 31 / 421 | **7%** |
| `ar` | 31 / 421 | **7%** |

Portuguese, Chinese and Arabic readers see English on roughly 93% of titles, including inside RTL layout for Arabic. The site lists all three as published languages.

It gets worse: `scripts/check-translations.mjs` only diffs `messages/*.json`. Because the titles live in a `.ts` file, the gap is invisible in CI, and the translators that `TRANSLATING.md` assigns a `messages/{locale}.json` file have no way to contribute these titles at all.

## Proposal

1. Extract the data into `app/data/chapter-titles/{locale}.json`, one file per locale, plus `_source.json` for the original Japanese titles and the volume mapping.
2. Extend `scripts/check-translations.mjs` to report per-locale title coverage and fail below a configurable threshold.
3. Document the file in `TRANSLATING.md` as a second translator deliverable.

This is the same split the bundle-size issue asks for. Both should be done in one pass.

## Acceptance criteria

- [ ] Titles are stored per locale, outside the TypeScript bundle
- [ ] `translations:check` reports per-locale title coverage
- [ ] `TRANSLATING.md` explains how to contribute titles
- [ ] A tracking issue is opened per incomplete locale to recruit translators

## Files involved

- `app/data/chapter-titles.ts`
- `scripts/check-translations.mjs`
- `TRANSLATING.md`

**Estimated effort:** M (depends on translators)
ISSUE_BODY_EOF
run gh issue create --repo "$REPO" \
  --title "i18n(data): chapter titles are untranslated in pt, zh and ar (31/421)" \
  --label "i18n,bug,priority:high" \
  --milestone "Quality and reliability" \
  --body "$BODY"

echo "  -> #4 a11y: the accessible name on `.chapter-grid` is never exposed"
read -r -d '' BODY <<'ISSUE_BODY_EOF' || true
## Context

In `app/chapter-tracker.tsx`, the chapter grid renders as:

```tsx
<div className="chapter-grid" aria-label={messages.production.chapterStatusAria}>
```

## Problem

A `<div>` with no `role` has the implicit `generic` role, and the ARIA spec forbids an accessible name on it. Most screen readers drop this `aria-label` entirely, so the `chapterStatusAria` string that is maintained across all 7 locales is never announced.

The rest of the component is careful (`aria-expanded`, `aria-haspopup`, `aria-controls`, per-button labels), which makes this one stand out.

## Proposal

Two options:

```tsx
<div className="chapter-grid" role="group" aria-label={...}>
```

or, more semantically accurate for a countable collection:

```tsx
<ul className="chapter-grid" aria-label={...}>
  <li key={chapter.chapter}>…</li>
```

The second lets VoiceOver and NVDA announce "list, 30 items", which helps with orientation inside the grid. Add `list-style: none` in `globals.css`.

## Acceptance criteria

- [ ] The grid's accessible name is announced by VoiceOver and NVDA
- [ ] No visual regression (check the PNGs produced by `npm run share:build`)
- [ ] Verified on the `ar` locale in RTL

## Files involved

- `app/chapter-tracker.tsx`
- `app/globals.css`

**Estimated effort:** XS (~20 min)
ISSUE_BODY_EOF
run gh issue create --repo "$REPO" \
  --title "a11y: the accessible name on `.chapter-grid` is never exposed" \
  --label "a11y,bug,good first issue" \
  --milestone "Performance and accessibility" \
  --body "$BODY"

echo "  -> #5 pwa: add a web manifest and an apple-touch-icon"
read -r -d '' BODY <<'ISSUE_BODY_EOF' || true
## Context

The repo ships `public/sw.js`, a Web Push subscription registry (`worker/push-subscription-registry.mjs`, 437 lines), a full push API with rate limiting, and an `app/push-notification-control.tsx` component.

## Problem

There is no `manifest.webmanifest` anywhere in `public/`. The CSP in `public/_headers` declares `manifest-src 'self'`, and `app/layout.tsx` only references `favicon.svg`.

Consequences:

1. **Push subscription is impossible on iOS and iPadOS.** Safari only exposes `Notification.requestPermission()` and the Push API to sites added to the home screen, which requires a valid manifest with `display: standalone`. The entire push infrastructure is unreachable for a large share of mobile readers.
2. No `apple-touch-icon`, so the iOS home screen icon is a degraded screenshot of the page.
3. No install prompt on Chrome for Android.

## Proposal

1. Add `app/manifest.ts` (Next's `MetadataRoute.Manifest` API works with `output: export`): `name`, `short_name`, `start_url`, `display: "standalone"`, `background_color` and `theme_color` matching `--background` (`#0b0e0c`), and 192/512 px icons including a `maskable` one.
2. Generate the icon PNGs from `favicon.svg` and add `apple-touch-icon.png` (180×180).
3. Declare `icons.apple` in the `metadata` export of `app/layout.tsx`.
4. Decide how to localise `name`/`description`: one manifest per locale, or the English manifest for now.
5. Update `app/push-notification-control.tsx` so uninstalled iOS users are told to add the site to their home screen first, instead of being shown a button that fails.

## Acceptance criteria

- [ ] Lighthouse "Installable" passes
- [ ] Push subscription works on iOS once the site is added to the home screen
- [ ] Home screen icon renders correctly on iOS and Android
- [ ] The iOS guidance message shows when the browser cannot subscribe yet
- [ ] The `manifest-src 'self'` CSP directive allows the served file

## Files involved

- `app/manifest.ts`
- `app/layout.tsx`
- `app/push-notification-control.tsx`
- `public/`

**Estimated effort:** S (~2 h)
ISSUE_BODY_EOF
run gh issue create --repo "$REPO" \
  --title "pwa: add a web manifest and an apple-touch-icon" \
  --label "pwa,bug,priority:high" \
  --milestone "Quality and reliability" \
  --body "$BODY"

echo "  -> #6 perf: only ship the active locale's data to the client"
read -r -d '' BODY <<'ISSUE_BODY_EOF' || true
## Context

`app/publication-history.tsx` and `app/chapter-tracker.tsx` are both marked `"use client"` and import the datasets directly.

## Problem

Those imports end up in the JavaScript bundle sent to the browser in full:

| Module | Raw size | Actually used |
|---|---|---|
| `app/data/chapter-titles.ts` | 88 KB | 1 locale out of 7 |
| `app/data/publication-history.json` | 112 KB | all of it |

That is roughly 200 KB of raw data for a page whose main content is a 30-chapter grid. The titles module carries all 7 languages while only one is rendered, so about 85% of it is dead weight on every load.

## Proposal

1. Split the titles into `app/data/chapter-titles/{locale}.json` and import only the rendered locale (same refactor as the title-coverage issue).
2. Move the data up into the parent server component and pass it down as props, keeping only the fields actually rendered. `publication-history.json` can be pre-aggregated at build time into a compact structure (per-year counts plus arcs); the per-chapter detail is only needed inside tooltips.
3. If full detail is genuinely needed for interaction, fetch it on demand from `/api/v1/` on first hover rather than on initial load.

Measure before and after with `@next/bundle-analyzer` and put the numbers in the PR.

## Acceptance criteria

- [ ] First-load JS drops by at least 100 KB raw
- [ ] No functional regression in tooltips, the detail sheet, or RTL
- [ ] Before/after numbers documented in the PR

## Files involved

- `app/publication-history.tsx`
- `app/chapter-tracker.tsx`
- `app/data/chapter-titles.ts`
- `app/data/publication-history.json`

**Estimated effort:** M (~1 day)
ISSUE_BODY_EOF
run gh issue create --repo "$REPO" \
  --title "perf: only ship the active locale's data to the client" \
  --label "performance,i18n" \
  --milestone "Performance and accessibility" \
  --body "$BODY"

echo "  -> #7 perf(i18n): replace the client-side locale redirect"
read -r -d '' BODY <<'ISSUE_BODY_EOF' || true
## Context

`app/layout.tsx` injects `localeDetectionScript` with `strategy="beforeInteractive"`. On `/`, the script reads `localStorage`, then `navigator.languages`, then calls `location.replace("/" + preference)`.

## Problem

Every non-English visitor landing on `/` downloads the English HTML, starts rendering it, then takes a full navigation to their locale. LCP is effectively paid twice, on fast and slow connections alike.

Side effects:

- a flash of English content before the switch;
- a replaced history entry, so the back button behaves unexpectedly;
- the redirect is invisible to crawlers, which only index what was served.

## Proposal

Two paths to weigh up in this issue.

**A. Redirect at the Worker (recommended).** Declare `run_worker_first` for `/` in `wrangler.jsonc` and return a 302 from `worker/index.mjs` after negotiating `Accept-Language`, with a cookie or `Vary: Accept-Language` so the cache is not poisoned. Cost: one Worker invocation on the root route only.

**B. No automatic redirect.** Serve English on `/` and offer a quiet banner along the lines of "View this page in French". This is what Google recommends, and it removes the `beforeInteractive` script entirely.

Either way, keep honouring the explicit choice already stored in `localStorage` under `hxhstatus.locale`.

## Acceptance criteria

- [ ] No `location.replace()` on initial load
- [ ] An explicit user choice still takes priority over detection
- [ ] Crawler behaviour verified (hreflang and x-default unchanged)
- [ ] LCP measured before and after on a non-English locale

## Files involved

- `app/layout.tsx`
- `worker/index.mjs`
- `wrangler.jsonc`

**Estimated effort:** M (~4 h)
ISSUE_BODY_EOF
run gh issue create --repo "$REPO" \
  --title "perf(i18n): replace the client-side locale redirect" \
  --label "performance,i18n,seo" \
  --milestone "Performance and accessibility" \
  --body "$BODY"

echo "  -> #8 security(csp): drop `unsafe-inline` by consolidating the `LocalDate` scripts"
read -r -d '' BODY <<'ISSUE_BODY_EOF' || true
## Context

`public/_headers` documents exactly why `script-src` carries `'unsafe-inline'`: the static export ships Next's inline hydration payload and the locale detection script, and `output: export` leaves no request-time hook to mint a nonce.

On top of that, the `LocalDate` component in `app/chapter-tracker.tsx` emits **one inline `<script>` per rendered date** through `dangerouslySetInnerHTML`, to reformat local time without hydration.

## Problem

Two separate costs:

1. **HTML weight.** Each instance duplicates a full `new Intl.DateTimeFormat(...)` with its serialised options. On a page showing dozens of dates, that is redundant HTML on the critical path.
2. **Security.** These scripts block any move to CSP hashes, so `'unsafe-inline'` stays open for the whole document.

## Proposal

Render `<time data-local-date="…" data-show-time="…">` and emit a **single** script at the end of the document that walks `document.querySelectorAll('[data-local-date]')` and applies the formatting. That script is then stable across builds, and therefore hashable.

Then add a build step that computes SHA-256 hashes of the remaining inline scripts (including Next's payload) and injects them into `public/_headers` in place of `'unsafe-inline'`. If Next's hydration payload turns out not to hash stably, document the blocker and land the consolidation on its own.

## Acceptance criteria

- [ ] One date-formatting script per document
- [ ] Measured reduction in served HTML size
- [ ] `'unsafe-inline'` removed from `script-src`, or the blocker documented with its exact cause
- [ ] No regression in date formatting across all 7 locales, RTL included

## Files involved

- `app/chapter-tracker.tsx`
- `public/_headers`
- `package.json`

**Estimated effort:** M (~4 h)
ISSUE_BODY_EOF
run gh issue create --repo "$REPO" \
  --title "security(csp): drop `unsafe-inline` by consolidating the `LocalDate` scripts" \
  --label "security,performance" \
  --milestone "Performance and accessibility" \
  --body "$BODY"

echo "  -> #9 refactor(app): collapse the locale pages into `app/[locale]`"
read -r -d '' BODY <<'ISSUE_BODY_EOF' || true
## Context

The repo has six directories `app/fr/`, `app/ja/`, `app/es/`, `app/pt/`, `app/zh/` and `app/ar/`, each with a `page.tsx`. The diff between any two of them is three lines: the locale code and the component name.

## Problem

Every new locale means another directory, another entry in the hand-written `lint` list, and another chance to forget something. The dynamic pattern is already used elsewhere in the same repo: `app/capture/[locale]/production/page.tsx` does exactly this with `generateStaticParams` and `dynamicParams = false`.

## Proposal

Add `app/[locale]/page.tsx` following the capture pages:

```tsx
export const dynamicParams = false;

export function generateStaticParams() {
  return publicLocales.filter((l) => l !== "en").map((locale) => ({ locale }));
}
```

`app/page.tsx` stays as the English root. Delete the six directories. Verify that `generateMetadata` still produces the same canonicals and hreflang, and that `sitemap.ts` is unchanged.

## Acceptance criteria

- [ ] The six locale directories are gone
- [ ] `npm run build` produces exactly the same routes in `out/`
- [ ] Canonical, hreflang and Open Graph tags are identical before and after
- [ ] Adding a locale now only requires an entry in `lib/locales.json` and its messages file

## Files involved

- `app/[locale]/page.tsx`
- `app/fr/page.tsx`
- `app/ja/page.tsx`
- `app/es/page.tsx`
- `app/pt/page.tsx`
- `app/zh/page.tsx`
- `app/ar/page.tsx`

**Estimated effort:** S (~2 h)
ISSUE_BODY_EOF
run gh issue create --repo "$REPO" \
  --title "refactor(app): collapse the locale pages into `app/[locale]`" \
  --label "refactor,i18n,good first issue" \
  --milestone "Quality and reliability" \
  --body "$BODY"

echo "  -> #10 ci(publication): replace the date-pinned cron with a periodic one"
read -r -d '' BODY <<'ISSUE_BODY_EOF' || true
## Context

`.github/workflows/publication-status.yml` declares:

```yaml
schedule:
  - cron: "57 14 6 9 *"
  - cron: "7,22,37,52 15 6 9 *"
```

Those dates are a hand-copied mirror of `prepareAt` in `automation/publication-schedule.json`.

## Problem

The cron has to be re-edited by hand for every scheduled chapter, in a different file from the one that holds the source of truth, with a timezone conversion done mentally (`+02:00` to UTC). Forgetting once silently disarms the safety net: the workflow simply stops firing, and nobody notices as long as the Cloudflare trigger keeps working.

The file's own comment already notes that all dates are rechecked against the reviewed schedule and that firing early never publishes anything. The cron's precision buys nothing.

## Proposal

Switch to an unconditional periodic cron such as `*/15 * * * *` and let `scripts/process-publication.mjs` exit immediately when nothing is due. The job becomes a few-second no-op and the file never needs touching again.

One thing to handle in the same PR: GitHub disables scheduled workflows after 60 days without repository activity. On a project shaped by long hiatuses that is a real risk. Either alert when no scheduled run has happened in N days, or keep the Cloudflare trigger as the primary path and document this behaviour in `AUTOMATION.md`.

## Acceptance criteria

- [ ] No hardcoded dates left in the workflow
- [ ] A run with nothing due exits as a no-op with no side effects
- [ ] The 60-day deactivation risk is documented or mitigated

## Files involved

- `.github/workflows/publication-status.yml`
- `scripts/process-publication.mjs`
- `AUTOMATION.md`

**Estimated effort:** XS (~30 min)
ISSUE_BODY_EOF
run gh issue create --repo "$REPO" \
  --title "ci(publication): replace the date-pinned cron with a periodic one" \
  --label "ci,automation,chore" \
  --milestone "Quality and reliability" \
  --body "$BODY"

echo "  -> #11 types: type-check the `worker/` directory"
read -r -d '' BODY <<'ISSUE_BODY_EOF' || true
## Context

`tsconfig.json` lists `worker` in its `exclude` array. The directory holds roughly 4,000 lines of JavaScript, including `push-notifications.mjs` (1,206 lines) and `x-activity-webhook.mjs` (1,061 lines).

## Problem

This is the most critical and least verified part of the project: HMAC signature verification, GitHub workflow dispatch with a write-scoped token, the push subscription registry, X webhooks. No type error is caught there, and coverage rests entirely on the `node --test` suite.

Those tests are serious work (1,310 lines for `push-notifications.test.mjs` alone), but they are not a substitute for typing at external data boundaries.

## Proposal

Two routes:

**A. Incremental.** Remove `worker` from `exclude`, turn on `checkJs`, and annotate progressively with JSDoc. Add `@cloudflare/workers-types` to type `env`, the Durable Objects and `ASSETS`. No runtime change.

**B. Migration.** Convert the files to `.ts` and let Wrangler compile them. Cleaner long-term, riskier in one go.

Start with A on `worker/github.mjs` and `worker/index.mjs` to validate the approach, then extend. Wire `npx tsc --noEmit` into CI (see the CI issue).

## Acceptance criteria

- [ ] `worker/` is covered by `tsc --noEmit` with no errors
- [ ] Cloudflare Workers types are installed and `env` is typed
- [ ] CI fails on a type error introduced in `worker/`
- [ ] Existing tests pass with no behaviour change

## Files involved

- `tsconfig.json`
- `worker/`

**Estimated effort:** M (~1 day)
ISSUE_BODY_EOF
run gh issue create --repo "$REPO" \
  --title "types: type-check the `worker/` directory" \
  --label "types,chore" \
  --milestone "Quality and reliability" \
  --body "$BODY"

echo "  -> #12 seo: disallow `/capture/*` in robots.txt"
read -r -d '' BODY <<'ISSUE_BODY_EOF' || true
## Context

`app/robots.ts` allows everything:

```ts
rules: { userAgent: "*", allow: "/" }
```

The `/capture/*` routes exist only so Playwright can render the share PNGs during `npm run share:build`.

## Problem

These pages are correctly `noindex` thanks to `app/capture/layout.tsx`, so there is no indexing risk. They are still present in the static export and still crawlable: 16 URLs (2 sections × 7 locales, plus the locale-less variants) that duplicate the main content, consume crawl budget, and clutter Search Console reports.

## Proposal

```ts
rules: {
  userAgent: "*",
  allow: "/",
  disallow: "/capture/",
}
```

Keep the layout's `noindex`. `disallow` stops the crawl; `noindex` covers the case where a URL is discovered through an external link. The two are complementary.

## Acceptance criteria

- [ ] `/robots.txt` contains `Disallow: /capture/`
- [ ] The capture layout's `noindex` is preserved
- [ ] `npm run share:build` still works (Playwright does not read robots.txt)

## Files involved

- `app/robots.ts`

**Estimated effort:** XS (~15 min)
ISSUE_BODY_EOF
run gh issue create --repo "$REPO" \
  --title "seo: disallow `/capture/*` in robots.txt" \
  --label "seo,good first issue" \
  --milestone "Quality and reliability" \
  --body "$BODY"

echo "  -> #13 repo: add CONTRIBUTING, dependabot and issue/PR templates"
read -r -d '' BODY <<'ISSUE_BODY_EOF' || true
## Context

`.github/` only contains `workflows/`. The project actively invites outside contributions: `TRANSLATING.md` describes a full translation workflow with a file assigned per translator.

## Problem

A willing translator has no standard entry point: no `CONTRIBUTING.md`, no issue template to volunteer through, no PR checklist reminding them about `npm run translations:check`. Separately, there is no automated dependency updating, on a project that handles secrets (a write-scoped GitHub token, VAPID keys, HMAC secrets) and depends on `web-push`, `next` and `wrangler`.

## Proposal

- `CONTRIBUTING.md`: setup, verification commands, accepted scope (the project only takes sourced data), and a pointer to `TRANSLATING.md`.
- `.github/ISSUE_TEMPLATE/`: `bug_report.yml`, `feature_request.yml`, `translation.yml` (with a locale dropdown), plus `config.yml` routing general questions to Discussions.
- `.github/pull_request_template.md`: a lint / tests / `translations:check` checklist, and a reminder to bump `lastUpdated` on data changes.
- `.github/dependabot.yml`: `npm` and `github-actions` ecosystems, weekly, with minor updates grouped to keep the noise down.
- Optional: `SECURITY.md` with a private reporting channel, worth it given the automation surface.

## Acceptance criteria

- [ ] Templates render when opening an issue or a PR
- [ ] Dependabot opens its first grouped PRs
- [ ] `CONTRIBUTING.md` is linked from the README

## Files involved

- `CONTRIBUTING.md`
- `.github/ISSUE_TEMPLATE/`
- `.github/pull_request_template.md`
- `.github/dependabot.yml`

**Estimated effort:** S (~2 h)
ISSUE_BODY_EOF
run gh issue create --repo "$REPO" \
  --title "repo: add CONTRIBUTING, dependabot and issue/PR templates" \
  --label "documentation,chore,good first issue" \
  --milestone "Quality and reliability" \
  --body "$BODY"

echo "  -> #14 test: no coverage on the React components"
read -r -d '' BODY <<'ISSUE_BODY_EOF' || true
## Context

All 17 test files in the repo target `automation/` and `worker/`. The automation side is well covered: contracts, reducer, milestone deduplication, payload authentication, verdict replay.

## Problem

Nothing tests the rendering layer. That layer carries the derived logic the README presents as the heart of the project: the four headline numbers, the "currently publishing / on hiatus" state, the latest-update panel, all computed from `app/data/status.ts`.

A malformed data change can break the display with no test noticing, including through the automated pipeline that writes to `status-data.json` without a human in the loop.

## Proposal

In descending order of value:

1. **Unit tests on `app/data/status.ts`.** No DOM needed, runnable under `node --test`. Assert the derived values and the publication state against reference fixtures, including edge cases (no scheduled chapter, chapter delivered but unpublished, `releaseAt` in the past).
2. **Data regression tests.** Validate `status-data.json` and `publication-history.json` against a schema, in CI. This is the direct safety net against a malformed automated write.
3. **Render tests.** Vitest plus Testing Library on `ChapterTracker` and `PublicationHistory`: opening the detail sheet, ARIA attributes, RTL rendering in `ar`.

The first two need no new dependencies.

## Acceptance criteria

- [ ] `app/data/status.ts` has tests covering derived values and edge cases
- [ ] Data files are schema-validated in CI
- [ ] At least one render test per interactive component
- [ ] These tests run in the CI workflow

## Files involved

- `app/data/status.ts`
- `app/chapter-tracker.tsx`
- `app/publication-history.tsx`

**Estimated effort:** M (~1 day)
ISSUE_BODY_EOF
run gh issue create --repo "$REPO" \
  --title "test: no coverage on the React components" \
  --label "test" \
  --milestone "Quality and reliability" \
  --body "$BODY"

echo "  -> #15 feat(api): RSS/Atom feeds and an iCal calendar per locale"
read -r -d '' BODY <<'ISSUE_BODY_EOF' || true
## Context

`API.md` already describes a versioned, CORS-enabled JSON API with a five-minute polling contract for bots and localized endpoints for all 7 published languages.

## Problem

The JSON API speaks to developers. The site's widest audience — feed readers, existing Discord bots, IFTTT, manga aggregators, Slack — consumes RSS and will never write an HTTP client. Today those users only have push notifications, which require an installed PWA.

## Proposal

1. `GET /feed.xml` and `GET /{locale}/feed.xml`: one item per status change and per Togashi post, with the translated title, confirmation date and a link to the source. Atom preferred, for stable identifiers.
2. `GET /releases.ics`: one event per chapter in the scheduled state, driven by `releaseAt` in `status-data.json`. One-click calendar subscription.

Both are static files generated at build time by a script alongside `scripts/generate-public-api.mjs`, so there is no runtime cost and they work with `output: export`. Reuse the cache headers already defined for `/api/v1/*`.

## Acceptance criteria

- [ ] Feeds pass the W3C Feed Validator
- [ ] One item per status change, with an identifier stable across builds
- [ ] The `.ics` imports cleanly into Google Calendar and Apple Calendar
- [ ] Feeds are discoverable through `<link rel="alternate">` in the head
- [ ] Documented in `API.md` and listed in `/api/v1/index.json`

## Files involved

- `scripts/generate-public-api.mjs`
- `API.md`
- `public/_headers`

**Estimated effort:** S (~4 h)
ISSUE_BODY_EOF
run gh issue create --repo "$REPO" \
  --title "feat(api): RSS/Atom feeds and an iCal calendar per locale" \
  --label "feature,priority:high" \
  --milestone "New features" \
  --body "$BODY"

echo "  -> #16 feat(share): embeddable SVG status badge"
read -r -d '' BODY <<'ISSUE_BODY_EOF' || true
## Context

The repo already generates per-locale share PNGs through Playwright (`scripts/generate-share-images.mjs`), served from `/share/{locale}/*.png` with a five-minute cache and revalidation.

## Problem

Those PNGs are built to be shared as images, not embedded permanently. There is no lightweight format a third party can paste into a GitHub README, a forum signature, a wiki page or a Discord embed and have it stay current on its own.

## Proposal

`GET /badge/{locale}/status.svg`, in the shields.io style:

```
[ HxH ][ On hiatus · ch. 420 · manuscript 427 ]
```

Useful variants: `latest.svg` (last published chapter), `progress.svg` (confirmed progress), `next.svg` (next chapter and its stage). Query parameters `?style=flat|for-the-badge` and `?label=`.

Generated statically at build time from the same data as the API, so no runtime cost. Reuse the status colours already defined as CSS variables in `globals.css` to stay consistent with the site.

This is probably the project's best distribution lever: a badge pasted once keeps updating everywhere it lives.

## Acceptance criteria

- [ ] The SVG renders correctly in a GitHub README, in both light and dark themes
- [ ] Short cache with revalidation, matching `/share/*.png`
- [ ] A README section shows the embed snippet to copy
- [ ] Documented in `API.md` and listed in `/api/v1/index.json`

## Files involved

- `scripts/generate-public-api.mjs`
- `README.md`
- `API.md`
- `public/_headers`

**Estimated effort:** S (~4 h)
ISSUE_BODY_EOF
run gh issue create --repo "$REPO" \
  --title "feat(share): embeddable SVG status badge" \
  --label "feature,priority:high" \
  --milestone "New features" \
  --body "$BODY"

echo "  -> #17 feat(content): Togashi post archive page"
read -r -d '' BODY <<'ISSUE_BODY_EOF' || true
## Context

`app/data/togashi-posts.json` stores validated posts by ID. Each post is translated once at ingestion, and image text is transcribed and translated (visible on the homepage for the September 1 post).

## Problem

The site only shows the latest post. The entire translated and transcribed history is kept in the repo but invisible to visitors. This is original, sourced, multilingual content that exists nowhere else in this form.

## Proposal

An `/updates` page (and `/{locale}/updates`) listing the full history in reverse chronological order: date, translated text with access to the Japanese original, images and their transcriptions, and a link to the source post on X.

Side benefit: indexable pages for long-tail queries ("Togashi manuscript 427"), and a natural anchor for the RSS feed issue.

To decide in this issue: paginated or single page, and whether each post deserves its own permanent URL (`/updates/{id}`), which would be better for sharing.

## Acceptance criteria

- [ ] Every stored post is displayed, across all 7 locales
- [ ] The Japanese original stays accessible for each post
- [ ] Images and their transcriptions render, RTL included
- [ ] Pages are in the sitemap with their hreflang

## Files involved

- `app/data/togashi-posts.json`
- `app/latest-togashi-update.tsx`
- `app/sitemap.ts`

**Estimated effort:** M (~1 day)
ISSUE_BODY_EOF
run gh issue create --repo "$REPO" \
  --title "feat(content): Togashi post archive page" \
  --label "feature,seo" \
  --milestone "New features" \
  --body "$BODY"

echo "  -> #18 feat(tracker): production changelog"
read -r -d '' BODY <<'ISSUE_BODY_EOF' || true
## Context

The automation pipeline produces a verdict on every stage transition (`automation/milestones.mjs`, `automation/reducer.mjs`), and every status change is a commit on `main`.

## Problem

The site only exposes the current state. A returning visitor cannot answer "what changed since I was last here?" without reading the Git history. The information exists; it is simply discarded after display.

## Proposal

A public timeline of transitions:

```
Sep 1, 2026   ch. 427   inking complete → manuscript complete   [source]
…
```

Persist an append-only log (`app/data/status-events.json`) written by the pipeline at verdict time, rather than reconstructing from Git. Expose `GET /api/v1/events.json` alongside the web view.

Every line links to its source post, which directly reinforces the site's sourced positioning: each claim becomes verifiable and dated. It also feeds the RSS feed issue naturally.

## Acceptance criteria

- [ ] Every transition written by the automation creates a timestamped entry with its source
- [ ] The log is exposed on the web and as versioned JSON
- [ ] Historical transitions are backfilled once from the Git history
- [ ] Stage labels are translated across all 7 locales

## Files involved

- `automation/reducer.mjs`
- `scripts/generate-public-api.mjs`
- `app/`

**Estimated effort:** M (~1 day)
ISSUE_BODY_EOF
run gh issue create --repo "$REPO" \
  --title "feat(tracker): production changelog" \
  --label "feature" \
  --milestone "New features" \
  --body "$BODY"

echo "  -> #19 feat(stats): hiatus and publication-pace statistics"
read -r -d '' BODY <<'ISSUE_BODY_EOF' || true
## Context

`app/data/publication-history.json` (112 KB) covers releases from 1998 to 2026, with arc, Jump issue and chapter. Today it only feeds the yearly grid in the Publication history section.

## Problem

The question every visitor arrives with — when does it come back? — gets no answer on the site, even though 28 years of data can answer it factually without speculating.

## Proposal

A **descriptive** statistics section derived from the history:

- length of the current hiatus, and its rank among all hiatuses since 1998;
- median and maximum length of past hiatuses;
- median length of a publication run once it starts;
- median observed delay between "delivered to Jump" and actual release, computed from past transitions.

**Editorial constraint, to be respected strictly:** present observed statistics, never a prediction or a countdown. The site's value comes from its rigour; an "estimated return date" would file it alongside rumour aggregators. Phrase it as "median observed across N hiatuses", with the method stated and a link to the underlying data.

## Acceptance criteria

- [ ] Statistics are computed at build time, not hardcoded
- [ ] The calculation method and the number of observations are shown
- [ ] No predictive phrasing in any of the 7 locales
- [ ] Values are exposed under `/api/v1/`

## Files involved

- `app/data/publication-history.json`
- `app/publication-history.tsx`

**Estimated effort:** M (~1 day)
ISSUE_BODY_EOF
run gh issue create --repo "$REPO" \
  --title "feat(stats): hiatus and publication-pace statistics" \
  --label "feature" \
  --milestone "New features" \
  --body "$BODY"

echo "  -> #20 feat(push): granular notification preferences"
read -r -d '' BODY <<'ISSUE_BODY_EOF' || true
## Context

`worker/push-notifications.mjs` and `worker/push-subscription-registry.mjs` handle subscriptions, capacity, rate limiting and milestone logic. `app/push-notification-control.tsx` exposes subscription on the client.

## Problem

Subscription appears to be all-or-nothing. Expectations differ sharply: some people only want to be woken for an actual release, others follow every Togashi post, others every production stage change. An over-talkative subscription ends in a permanent unsubscribe, and that user does not come back.

## Proposal

Add a preferences field to the subscription registry. Milestones are already modelled on the worker side, so most of the work is storage and UI:

- `published`: only when a chapter is released (default);
- `scheduled`: when a release date is announced;
- `milestones`: every production stage change;
- `posts`: every new Togashi post.

Plan the migration of existing subscriptions to a `published + scheduled` default, and allow changing preferences without re-subscribing.

## Acceptance criteria

- [ ] Preferences are stored per subscription and honoured at send time
- [ ] Existing subscriptions migrate without loss
- [ ] Preferences are editable from the UI, across all 7 locales
- [ ] Worker tests cover filtering by preference

## Files involved

- `worker/push-notifications.mjs`
- `worker/push-subscription-registry.mjs`
- `app/push-notification-control.tsx`

**Estimated effort:** M (~1 day)
ISSUE_BODY_EOF
run gh issue create --repo "$REPO" \
  --title "feat(push): granular notification preferences" \
  --label "feature,pwa" \
  --milestone "New features" \
  --body "$BODY"

echo "  -> #21 feat(tracker): volume view"
read -r -d '' BODY <<'ISSUE_BODY_EOF' || true
## Context

`app/data/chapter-titles.ts` exposes `getVolumeLabel()` and a `VOLUME_LABEL` translated across all 7 locales. The chapter-to-volume mapping already exists.

## Problem

The mapping is only used inside a chapter tooltip. A common question that is badly served elsewhere goes unanswered: how many chapters are left before the next tankōbon, and which volume the in-production chapters will land in.

## Proposal

Surface, from the existing data: the volume currently being assembled, how many chapters have already been published into it, and how many are missing relative to typical volume size. Optionally, a volume-grouped view as an alternative to the per-chapter grid.

If sourceable volume release dates are available they can enrich the view. Otherwise stick strictly to what can be derived, in line with the project's rules.

## Acceptance criteria

- [ ] Current volume and chapter counts are derived, not hardcoded
- [ ] Translated across all 7 locales, respecting existing conventions (`第N卷`, `N巻`)
- [ ] No volume release date shown without a cited source

## Files involved

- `app/data/chapter-titles.ts`
- `app/chapter-tracker.tsx`

**Estimated effort:** S (~4 h)
ISSUE_BODY_EOF
run gh issue create --repo "$REPO" \
  --title "feat(tracker): volume view" \
  --label "feature" \
  --milestone "New features" \
  --body "$BODY"

echo "  -> #22 feat(tracker): current arc progress"
read -r -d '' BODY <<'ISSUE_BODY_EOF' || true
## Context

`app/data/arcs.ts` defines the arcs and `publication-history.json` maps each chapter to one. The Succession Contest arc is shown on the homepage with no scale or context.

## Problem

Visitors see the arc name but have no reference point: is it long? short? how far along? The data supports placing it against every past arc.

## Proposal

Compare the current arc to previous ones: chapter count, real calendar duration (hiatuses included), rank. A bar or small comparison chart is enough; the Publication history section is the natural home.

Same pitfall as the hiatus statistics: describe what is observed, and do not imply a target length for the current arc.

## Acceptance criteria

- [ ] Comparisons are derived from the data, not hardcoded
- [ ] Arc names are translated across all 7 locales
- [ ] No projection of the current arc's final length

## Files involved

- `app/data/arcs.ts`
- `app/publication-history.tsx`

**Estimated effort:** S (~4 h)
ISSUE_BODY_EOF
run gh issue create --repo "$REPO" \
  --title "feat(tracker): current arc progress" \
  --label "feature,priority:low" \
  --milestone "New features" \
  --body "$BODY"

echo "  -> #23 feat(ui): light theme"
read -r -d '' BODY <<'ISSUE_BODY_EOF' || true
## Context

`app/globals.css` (1,590 lines) defines every colour as a CSS variable on `:root`, in dark values only. `prefers-color-scheme` appears nowhere in the stylesheet.

## Problem

The site is locked to dark, including for users whose system is set to light. That is an accessibility concern for some readers and plain discomfort for daytime mobile use.

## Proposal

The tokens are already centralised, so the work is mechanical: define a light palette under `@media (prefers-color-scheme: light)` plus a `[data-theme]` selector for an explicit choice, and add `color-scheme: light dark`.

Watch out for two things: the status colours (`--published`, `--scheduled`, `--inking`…) need their contrast rechecked against a light background, and the Playwright-generated share PNGs must stay dark.

Only worth doing if dark-only is an aesthetic choice you are willing to give up. Otherwise close this and document it as a deliberate decision.

## Acceptance criteria

- [ ] The theme follows the system preference by default
- [ ] An explicit choice is possible and persists
- [ ] All status colours meet AA against both backgrounds
- [ ] Share captures stay in the dark theme

## Files involved

- `app/globals.css`
- `app/layout.tsx`

**Estimated effort:** M (~1 day)
ISSUE_BODY_EOF
run gh issue create --repo "$REPO" \
  --title "feat(ui): light theme" \
  --label "feature,priority:low" \
  --milestone "New features" \
  --body "$BODY"

echo "  -> #24 feat(api): outbound webhooks for integrators"
read -r -d '' BODY <<'ISSUE_BODY_EOF' || true
## Context

`API.md` documents a five-minute polling contract. Third-party consumers (Discord bots, Bluesky or Mastodon relays) therefore have to poll the API in a loop.

## Problem

Polling adds up to five minutes of latency on a rare but heavily anticipated event, and pushes the cost onto every integrator. On a site whose whole point is how fast the announcement lands, that delay is a shame.

## Proposal

Webhook registration: destination URL, shared secret, HMAC-signed deliveries (the repo already has everything needed in `automation/payload-auth.mjs`), retries with backoff, and deactivation after repeated failures.

**Only start this if the demand is real.** It introduces application state, an abuse surface, and maintenance that a static site does not carry today. The RSS and SVG badge issues probably cover 90% of the actual need for a fraction of the cost. Ship those first and measure.

## Acceptance criteria

- [ ] Register, verify ownership of, and revoke a webhook
- [ ] HMAC-signed deliveries with replay protection
- [ ] Retries with backoff and automatic deactivation after failures
- [ ] Documented in `API.md` with a signature verification example

## Files involved

- `worker/`
- `API.md`

**Estimated effort:** L (several days)
ISSUE_BODY_EOF
run gh issue create --repo "$REPO" \
  --title "feat(api): outbound webhooks for integrators" \
  --label "feature,priority:low" \
  --milestone "New features" \
  --body "$BODY"

echo "Done."
