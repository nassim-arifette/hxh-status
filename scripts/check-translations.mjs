import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const messagesDirectory = join(process.cwd(), "messages");
const referenceLocale = "en";
const translatedLocales = (await readdir(messagesDirectory))
  .filter((fileName) => fileName.endsWith(".json"))
  .map((fileName) => fileName.replace(/\.json$/, ""))
  .filter((locale) => locale !== referenceLocale)
  .sort();

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

const reference = flatten(await load(referenceLocale));
let failed = false;

for (const locale of translatedLocales) {
  const translation = flatten(await load(locale));
  const missing = [...reference.keys()].filter((key) => !translation.has(key));
  const extra = [...translation.keys()].filter((key) => !reference.has(key));
  const placeholderErrors = [...reference.entries()]
    .filter(([key, value]) => {
      if (!translation.has(key)) return false;
      return placeholders(value).join(",") !== placeholders(translation.get(key)).join(",");
    })
    .map(([key]) => key);

  if (missing.length || extra.length || placeholderErrors.length) {
    failed = true;
    console.error("\n" + locale + ".json does not match " + referenceLocale + ".json.");
    if (missing.length) console.error("Missing keys: " + missing.join(", "));
    if (extra.length) console.error("Extra keys: " + extra.join(", "));
    if (placeholderErrors.length) console.error("Placeholder mismatches: " + placeholderErrors.join(", "));
  } else {
    console.log(locale + ".json: all keys and placeholders are valid.");
  }
}

if (failed) process.exitCode = 1;
