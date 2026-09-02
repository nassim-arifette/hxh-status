# Translating HxH Status

The website data and translations are kept separate. Chapter numbers, dates,
sources, and publication history stay in `app/data/`. Translators only edit the
message catalog prepared for their language.

Japanese is the first example: its catalog is `messages/ja.json` and its local
preview is `http://localhost:3000/ja`. The same workflow applies to every future
language.

## Translation workflow

1. Open the catalog assigned to your language, for example `messages/ja.json`.
2. Translate values only. Never rename, add, or remove JSON keys.
3. Keep placeholders such as `{date}`, `{chapter}`, `{count}`, `{year}`,
   `{status}`, `{issue}`, `{label}`, and `{action}` unchanged.
4. Keep product and publication names accurate: HUNTER x HUNTER, Weekly
   Shonen Jump, VIZ, and Yoshihiro Togashi.
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
catalog yet. The maintainer will copy `messages/en.json`, register the locale,
and create its private preview route. After that one-time setup, the translator
only edits the new JSON file.

A permanent branch per language is not required. Use a normal short-lived
branch or GitHub fork to open a pull request, or send the completed JSON file to
the maintainer if that is easier.

## Draft previews

Translation previews are intentionally marked `noindex` and are not linked from
the public site or sitemap. Once a translation is reviewed, the maintainer will
enable indexing, add the language switcher, localize the share images, and add
the route to the sitemap.

## Before opening a pull request

- `npm run translations:check` passes.
- No JSON keys or placeholders were changed.
- The preview has no remaining English text, except proper names.
- Dates are still shown without times and use the visitor's local timezone.
