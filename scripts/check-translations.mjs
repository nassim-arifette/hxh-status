import { access, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { isUpToDate } from "./generate-sw-copy.mjs";

const root = process.cwd();
const messagesDirectory = join(root, "messages");
const referenceLocale = "en";
const localeConfig = JSON.parse(
  await readFile(join(root, "lib", "locales.json"), "utf8"),
);
const configuredLocales = Object.keys(localeConfig.locales).sort();
const catalogLocales = (await readdir(messagesDirectory))
  .filter((fileName) => fileName.endsWith(".json"))
  .map((fileName) => fileName.replace(/\.json$/, ""))
  .sort();
const dictionariesSource = await readFile(
  join(root, "lib", "dictionaries.ts"),
  "utf8",
);

let failed = false;

function report(message) {
  failed = true;
  console.error(message);
}

function difference(left, right) {
  return left.filter((value) => !right.includes(value));
}

const missingCatalogs = difference(configuredLocales, catalogLocales);
const orphanCatalogs = difference(catalogLocales, configuredLocales);

if (missingCatalogs.length > 0) {
  report("Missing message catalogs: " + missingCatalogs.join(", "));
}
if (orphanCatalogs.length > 0) {
  report("Unregistered message catalogs: " + orphanCatalogs.join(", "));
}
if (!configuredLocales.includes(referenceLocale)) {
  report("The reference locale is missing from lib/locales.json.");
}

for (const locale of configuredLocales) {
  const settings = localeConfig.locales[locale];
  if (
    !/^[a-z]{2,3}(?:-[A-Za-z0-9]+)*$/.test(locale) ||
    typeof settings?.label !== "string" ||
    settings.label.trim().length === 0 ||
    typeof settings?.published !== "boolean" ||
    !["ltr", "rtl"].includes(settings?.dir) ||
    typeof settings?.openGraphLocale !== "string" ||
    !/^[a-z]{2,3}_[A-Z]{2}$/.test(settings.openGraphLocale)
  ) {
    report("Invalid locale settings for " + locale + ".");
  }

  const specificRoute = join(root, "app", locale, "page.tsx");
  const dynamicRoute = join(root, "app", "[locale]", "page.tsx");
  const route = locale === referenceLocale
    ? join(root, "app", "page.tsx")
    : (await access(specificRoute).then(() => specificRoute, () => dynamicRoute));
  try {
    await access(route);
  } catch {
    report("Missing preview route for locale " + locale + ".");
  }

  if (!dictionariesSource.includes(`@/messages/${locale}.json`)) {
    report("lib/dictionaries.ts does not import " + locale + ".json.");
  }
  const dictionaryEntry = new RegExp(
    "^\\s*" + locale + "\\s*:",
    "m",
  );
  if (!dictionaryEntry.test(dictionariesSource)) {
    report("lib/dictionaries.ts does not register locale " + locale + ".");
  }
}

function flatten(value, prefix = "", result = new Map()) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? prefix + "." + key : key;

    if (child && typeof child === "object" && !Array.isArray(child)) {
      flatten(child, path, result);
    } else {
      result.set(path, child);
    }
  }

  return result;
}

function placeholders(value) {
  if (typeof value !== "string") return [];
  return [...value.matchAll(/\{([a-zA-Z0-9_]+)\}/g)]
    .map((match) => match[1])
    .sort();
}

async function load(locale) {
  const path = join(messagesDirectory, locale + ".json");
  return JSON.parse(await readFile(path, "utf8"));
}

if (catalogLocales.includes(referenceLocale)) {
  const reference = flatten(await load(referenceLocale));

  for (
    const locale of configuredLocales.filter(
      (item) => item !== referenceLocale,
    )
  ) {
    if (!catalogLocales.includes(locale)) continue;

    const translation = flatten(await load(locale));
    const missing = [...reference.keys()].filter((key) => !translation.has(key));
    const extra = [...translation.keys()].filter((key) => !reference.has(key));
    const invalidValues = [...translation.entries()]
      .filter(
        ([, value]) => typeof value !== "string" || value.trim().length === 0,
      )
      .map(([key]) => key);
    const placeholderErrors = [...reference.entries()]
      .filter(([key, value]) => {
        if (!translation.has(key)) return false;
        return (
          placeholders(value).join(",") !==
          placeholders(translation.get(key)).join(",")
        );
      })
      .map(([key]) => key);

    if (
      missing.length ||
      extra.length ||
      invalidValues.length ||
      placeholderErrors.length
    ) {
      failed = true;
      console.error(
        "\n" + locale + ".json does not match " + referenceLocale + ".json.",
      );
      if (missing.length) console.error("Missing keys: " + missing.join(", "));
      if (extra.length) console.error("Extra keys: " + extra.join(", "));
      if (invalidValues.length) {
        console.error("Invalid values: " + invalidValues.join(", "));
      }
      if (placeholderErrors.length) {
        console.error(
          "Placeholder mismatches: " + placeholderErrors.join(", "),
        );
      }
    } else {
      console.log(
        locale + ".json: all keys, values, and placeholders are valid.",
      );
    }
  }
}

// Chapter titles live outside the message catalogs, so the checks above say
// nothing about them. Coverage is uneven by design — a locale gains titles as
// a translator works through them — but it must never fall back, so each floor
// is a count rather than a percentage: adding an untranslated chapter to
// _source.json should not fail every locale at once. Raise a floor when a
// translator fills a gap.
const titleCoverageFloor = {
  en: 421,
  fr: 421,
  ja: 421,
  es: 370,
  pt: 413,
  zh: 419,
  ar: 101,
};

const titlesDirectory = join(root, "app", "data", "chapter-titles");
const chapterSource = JSON.parse(
  await readFile(join(titlesDirectory, "_source.json"), "utf8"),
);
const chapterRoster = new Set(chapterSource.chapters);
const chapterCount = chapterRoster.size;

for (const locale of configuredLocales) {
  let titles;
  try {
    titles = JSON.parse(
      await readFile(join(titlesDirectory, `${locale}.json`), "utf8"),
    );
  } catch {
    report(`app/data/chapter-titles/${locale}.json is missing.`);
    continue;
  }

  const unknown = Object.keys(titles).filter(
    (chapter) => !chapterRoster.has(chapter),
  );
  if (unknown.length > 0) {
    report(
      `${locale}.json titles chapters absent from _source.json: ` +
        unknown.slice(0, 10).join(", "),
    );
  }

  const blank = Object.entries(titles).filter(
    ([, title]) => typeof title !== "string" || title.trim() === "",
  );
  if (blank.length > 0) {
    report(
      `${locale}.json has empty titles for chapters: ` +
        blank.slice(0, 10).map(([chapter]) => chapter).join(", "),
    );
  }

  const translated = Object.keys(titles).length;
  const percent = Math.round((translated / chapterCount) * 100);
  const floor = titleCoverageFloor[locale];

  if (floor === undefined) {
    report(`No chapter-title coverage floor is set for ${locale}.`);
  } else if (translated < floor) {
    report(
      `${locale} chapter titles regressed: ${translated}/${chapterCount} ` +
        `(${percent}%), below the floor of ${floor}.`,
    );
  } else {
    const gained = translated > floor ? ` (+${translated - floor}, raise the floor)` : "";
    console.log(
      `${locale} chapter titles: ${translated}/${chapterCount} (${percent}%)${gained}`,
    );
  }
}

// The service worker cannot read the message catalogs: it runs detached from
// the page, so it ships a generated copy of the notification strings. A stale
// copy is how a new locale or a reworded notification reaches subscribers
// untranslated.
if (await isUpToDate()) {
  console.log("public/sw.js notification copy matches the catalogs.");
} else {
  report("public/sw.js is out of date. Run `npm run sw:copy`.");
}

if (!failed) {
  console.log(
    "Locale registry, catalogs, dictionaries, and preview routes are aligned.",
  );
}

if (failed) process.exitCode = 1;
