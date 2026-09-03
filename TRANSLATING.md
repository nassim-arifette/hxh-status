# Translating HxH Status

The website data and translations are kept separate. Chapter numbers, dates,
sources, and publication history stay in `app/data/`. Translators only edit the
message catalog prepared for their language.

French is already public at `/fr`. Japanese is the first draft example: its
catalog is `messages/ja.json` and its unlisted preview is
`http://localhost:3000/ja`. The same workflow applies to every future
language.

## Translation workflow

1. Open the catalog assigned to your language, for example `messages/ja.json`.
2. Translate values only. Never rename, add, or remove JSON keys.
3. Keep placeholders such as `{date}`, `{chapter}`, `{count}`, `{year}`,
   `{status}`, `{issue}`, `{label}`, and `{action}` unchanged.
4. Keep product and publication names accurate: HUNTER x HUNTER, Weekly
   Shonen Jump, MANGA Plus, VIZ, and Yoshihiro Togashi.
5. Run `npm run translations:check`.
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

## Starting another language

Contact the maintainer before translating a language that does not have a
catalog yet. The maintainer performs the one-time setup:

1. copy `messages/en.json`;
2. register the locale in `lib/locales.json` with `"published": false`, its
   text direction, and Open Graph locale;
3. register the catalog in `lib/dictionaries.ts`;
4. add its unlisted preview route using the shared metadata helper;
5. generate its two Share images.

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
- No JSON keys or placeholders were changed.
- The preview has no remaining English text, except proper names.
- Dates are still shown without times and use the visitor's local timezone.
