import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

import localeConfig from "../lib/locales.json" with { type: "json" };

// The root layout renders one <html> element for every route, so a static
// export ships lang="en" dir="ltr" on the Arabic page as much as the English
// one. A script used to correct that in the browser, which left crawlers and
// screen readers reading Arabic as English left-to-right. The locale of an
// exported page is known from its path, so it is stamped in here instead.

const root = process.cwd();
const outDirectory = join(root, "out");
const locales = localeConfig.locales;
const defaultLocale = "en";

function localeForPage(relativePath) {
  const segments = relativePath.split(sep);
  const file = segments.at(-1).replace(/\.html$/, "");
  // out/capture/<locale>/<page>.html
  if (segments[0] === "capture" && segments.length === 3) {
    return segments[1] in locales ? segments[1] : defaultLocale;
  }
  // out/<locale>.html, with out/index.html being English
  if (segments.length === 1 && file in locales) return file;
  return defaultLocale;
}

async function* htmlFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith(".html")) yield path;
  }
}

let stamped = 0;
const perLocale = {};

for await (const path of htmlFiles(outDirectory)) {
  const locale = localeForPage(relative(outDirectory, path));
  const dir = locales[locale].dir;
  const html = await readFile(path, "utf8");
  let matched = false;
  const updated = html.replace(/<html\s+lang="[^"]*"\s+dir="[^"]*"/, () => {
    matched = true;
    return `<html lang="${locale}" dir="${dir}"`;
  });

  if (!matched) {
    // An English page is already correct and rewrites to the same bytes, so
    // the check is on the pattern rather than on the content changing. A page
    // whose opening tag stopped matching would silently keep the wrong
    // language, which is a build failure rather than something to skip.
    throw new Error(`Could not stamp the language onto ${relative(root, path)}.`);
  }

  await writeFile(path, updated, "utf8");
  stamped += 1;
  perLocale[locale] = (perLocale[locale] ?? 0) + 1;
}

console.log(
  JSON.stringify({
    message: "Stamped the document language onto the exported pages.",
    pages: stamped,
    perLocale,
  }),
);
