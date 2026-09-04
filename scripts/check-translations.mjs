import { access, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import vm from "node:vm";

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

  const route = locale === referenceLocale
    ? join(root, "app", "page.tsx")
    : join(root, "app", locale, "page.tsx");
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

// The service worker cannot read the message catalogs: it runs detached from
// the page, so it ships its own copy of the notification strings. Nothing else
// compares the two, which is how a new locale or a new notification string can
// reach subscribers untranslated.
const serviceWorkerSource = await readFile(
  join(root, "public", "sw.js"),
  "utf8",
);
let notificationCopy;

try {
  const sandbox = vm.createContext({
    self: {
      addEventListener() {},
      location: { origin: "https://hxhstatus.com" },
    },
  });
  vm.runInContext(
    `${serviceWorkerSource};globalThis.__copy = notificationCopy;`,
    sandbox,
  );
  notificationCopy = sandbox.__copy;
} catch (error) {
  report("public/sw.js could not be evaluated: " + error.message);
}

if (notificationCopy) {
  const swReference = flatten(notificationCopy[referenceLocale] ?? {});

  for (const locale of configuredLocales) {
    const localeCopy = notificationCopy[locale];

    if (!localeCopy) {
      report("public/sw.js has no notification copy for " + locale + ".");
      continue;
    }

    const entries = flatten(localeCopy);
    const missing = [...swReference.keys()].filter((key) => !entries.has(key));
    const extra = [...entries.keys()].filter((key) => !swReference.has(key));
    const empty = [...entries.entries()]
      .filter(([, value]) =>
        typeof value === "function"
          ? false
          : typeof value !== "string" || value.trim().length === 0,
      )
      .map(([key]) => key);

    if (missing.length) {
      report(
        "public/sw.js is missing notification copy for " +
          locale +
          ": " +
          missing.join(", "),
      );
    }
    if (extra.length) {
      report(
        "public/sw.js has unused notification copy for " +
          locale +
          ": " +
          extra.join(", "),
      );
    }
    if (empty.length) {
      report(
        "public/sw.js has empty notification copy for " +
          locale +
          ": " +
          empty.join(", "),
      );
    }
  }

  if (!failed) {
    console.log("public/sw.js notification copy covers every locale.");
  }
}

if (!failed) {
  console.log(
    "Locale registry, catalogs, dictionaries, and preview routes are aligned.",
  );
}

if (failed) process.exitCode = 1;
