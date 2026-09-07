# Translating HxH Status

The website data and translations are kept separate. Chapter numbers, dates,
sources, and publication history stay in `app/data/`. Translators edit two
documents: the message catalog for the interface, and the chapter-title file
for their language.

English, French, Japanese, Spanish, Brazilian Portuguese, Simplified Chinese,
and Arabic are public. Their catalogs are `messages/{locale}.json`, and their
routes are `/`, `/fr`, `/ja`, `/es`, `/pt`, `/zh`, and `/ar`. The same workflow
applies to every future language.

These catalogs contain interface and notification copy. Free-form Togashi post
translations are generated separately during ingestion, validated, and stored
in `app/data/togashi-posts.json`; translators do not edit that archive as part
of the interface workflow.

## Translation workflow

1. Open the catalog assigned to your language, for example `messages/ja.json`.
2. Translate values only. Never rename, add, or remove JSON keys.
3. Keep placeholders such as `{date}`, `{chapter}`, `{count}`, `{year}`,
   `{status}`, `{issue}`, `{label}`, and `{action}` unchanged.
4. Keep product and publication names accurate: HUNTER x HUNTER, Weekly
   Shonen Jump, MANGA Plus, VIZ, and Yoshihiro Togashi.
5. Run `npm run sw:copy`, which copies the `push` section into the service
   worker, then `npm run translations:check`.
6. Run `npm run dev` and open the preview URL provided for your language.
7. Open chapter 420 and check the Share and Copy labels, chapter details, and
   publication-history section.

Example:

```json
{
  "snapshot": {
    "nextChapter": "Next chapter"
  }
}
```

Only replace the value on the right. The key `nextChapter` must stay exactly
the same.

## Chapter titles

Every chapter has a title, and they are the second thing a reader sees after
the tracker itself. They live in `app/data/chapter-titles/{locale}.json`, one
file per language, keyed by chapter number:

```json
{
  "1": "O Dia da Partida",
  "2": "Encontro na Tempestade"
}
```

`ja.json` holds the Japanese title of every chapter and doubles as the source
every translation is made from; `_source.json` is the roster of chapter numbers
and `_volumes.json` maps chapters to tankōbon. Translate from the Japanese where
you can; `en.json` is the fallback a reader sees for any chapter your file
does not cover, so a missing key shows English rather than breaking the page.

Rules:

1. Keys are chapter numbers as strings. `"-1"` is the Kurapika side story.
2. Never add a key that `_source.json` does not have.
3. Leave a chapter out rather than committing an empty string or a copy of
   the English title — coverage is measured, and a placeholder counts as done.
4. Where an official edition exists in your language, prefer its wording over
   a fresh translation. Brazilian Portuguese follows JBC; Simplified Chinese
   follows Tong Li.

`npm run translations:check` prints coverage per language and fails if a
language loses titles it already had. When you add titles, raise that
language's number in `titleCoverageFloor` in `scripts/check-translations.mjs`
in the same pull request; the check tells you the new figure.

These files are the source of truth. `app/data/chapter-titles.ts` only reads
them and is no longer generated from a script.

## Starting another language

Contact the maintainer before translating a language that does not have a
catalog yet. The maintainer performs the one-time setup:

1. copy `messages/en.json`;
2. register the locale in `lib/locales.json` with `"published": false`, its
   text direction, and Open Graph locale;
3. register the catalog in `lib/dictionaries.ts`;
4. add its unlisted preview route using the shared metadata helper;
5. add the locale to `VALID_LOCALES` in `worker/push-notifications.mjs`;
6. run `npm run sw:copy` so the service worker ships its push notifications;
7. generate its two Share images.

MANGA Plus is the default reader. Locale-specific reader lists only need to be
added when they differ. A reader's optional `chapterUrls` map can point a
published chapter directly to its reader page.

After that setup, the translator edits only the assigned JSON file. A permanent
branch per language is not required: use a normal short-lived branch or GitHub
fork for a pull request, or send the completed JSON file to the maintainer if
that is easier.

## Draft previews and publication

Draft previews are publicly reachable but unlisted, excluded from the language
selector and sitemap, and marked `noindex`. This makes review simple without
presenting unfinished text as a supported language.

After review, the maintainer changes the locale to `"published": true`.
The public language selector, browser-language detection, sitemap, hreflang
metadata, and indexing state all derive from that flag. The Share generator
already covers every registered locale.

The root page detects the visitor's browser language only when no explicit
preference has been saved. Direct locale URLs always remain on that locale, and
choosing a language in the header stores the preference for future visits.

## Before opening a pull request

- `npm run translations:check` passes.
- Chapter-title coverage did not drop, and `titleCoverageFloor` matches the
  new figure when it went up.
- No JSON keys or placeholders were changed.
- The preview has no remaining English text, except proper names.
- Dates are still shown without times and use the visitor's local timezone.
