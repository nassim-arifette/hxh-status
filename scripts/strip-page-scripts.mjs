import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

import localeConfig from "../lib/locales.json" with { type: "json" };
import { isContentRoute } from "../lib/routes.ts";
import { LOCAL_DATE_SCRIPT } from "../app/local-date.ts";

// The content pages — every chapter, every Togashi update, and the answer pages
// beside them — are text, a table and a few links. They carry no interactive
// component, so the framework runtime and the per-page flight payload that
// hydrates it are pure weight: nothing on the page would change if they never
// arrived.
//
// Dropping them has a second effect that matters more as the site grows. Every
// page ships a unique inline flight script, and Cloudflare allows a hundred
// rules in _headers, so hashing one script per page cannot survive hundreds of
// chapter pages. A stripped page's only inline script is the shared date
// rewrite, whose bytes are identical everywhere, so one rule covers a whole
// section no matter how many pages it holds.

const root = process.cwd();
const outDirectory = join(root, "out");
const locales = Object.keys(localeConfig.locales);

// Script elements cannot nest, so a lazy match ends at the first closing tag:
// every <script> in the document is inspected on its own rather than as part of
// one long span, which is what keeps the JSON-LD blocks between them intact.
const SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
const NEXT_SRC = /\ssrc="\/_next\/[^"]*"/;
const NEXT_PRELOAD = /<link[^>]*\srel="preload"[^>]*\sas="script"[^>]*>/g;
const NON_EXECUTABLE = /type\s*=\s*"(application\/ld\+json|application\/json|text\/template)"/i;

function routeFor(relativePath) {
  const segments = relativePath.split(sep);
  const last = segments.at(-1).replace(/\.html$/, "");
  if (segments.length === 1 && last === "404") return null;
  const path = [...segments.slice(0, -1), last === "index" ? "" : last].join("/");
  return `/${path}`.replace(/\/$/, "") || "/";
}

async function* htmlFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith(".html")) yield path;
  }
}

let stripped = 0;
let removed = 0;

for await (const path of htmlFiles(outDirectory)) {
  const route = routeFor(relative(outDirectory, path));
  if (route === null || !isContentRoute(route, locales)) continue;

  const html = await readFile(path, "utf8");
  let before = 0;

  const updated = html
    .replace(SCRIPT, (tag, attributes, body) => {
      if (NEXT_SRC.test(attributes) || body.includes("self.__next_f")) {
        before += 1;
        return "";
      }
      return tag;
    })
    .replace(NEXT_PRELOAD, "");

  // A content page that still ships an executable script other than the shared
  // date rewrite has grown an interactive component, and stripping its runtime
  // would leave that component dead on the page. Fail rather than ship it.
  const survivors = [...updated.matchAll(SCRIPT)]
    .filter(([, attributes]) => !NON_EXECUTABLE.test(attributes))
    .map(([, , body]) => body);

  const unexpected = survivors.filter((body) => body !== LOCAL_DATE_SCRIPT);
  if (unexpected.length > 0 || NEXT_SRC.test(updated)) {
    throw new Error(
      `${route} still needs JavaScript after stripping; it is not a content page.`,
    );
  }

  await writeFile(path, updated, "utf8");
  stripped += 1;
  removed += before;
}

console.log(
  JSON.stringify({
    message: "Removed the framework runtime from the content pages.",
    pages: stripped,
    scriptsRemoved: removed,
  }),
);
