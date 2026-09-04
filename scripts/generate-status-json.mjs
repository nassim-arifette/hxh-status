import { access, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { trackerSummary } from "../automation/milestones.mjs";

// Keep in step with `metadataBase` in `app/layout.tsx`.
const ORIGIN = "https://hxhstatus.com";
const SCHEMA_VERSION = 1;

const root = process.cwd();
const statusPath = join(root, "app", "data", "status-data.json");
const localesPath = join(root, "lib", "locales.json");
const outDirectory = join(root, "out");
const outPath = join(outDirectory, "status.json");

// The chart PNGs keep a stable filename, so a consumer that wants the current
// image has to bust its own cache. Handing them a revisioned URL is cheaper
// than asking every bot author to work that out.
function chartUrls(locales, name, revision) {
  return Object.fromEntries(
    locales.map((locale) => [
      locale,
      `${ORIGIN}/share/${locale === "en" ? "" : `${locale}/`}${name}.png?r=${revision}`,
    ]),
  );
}

const statusData = JSON.parse(await readFile(statusPath, "utf8"));

// An unpublished locale is `noindex` and kept out of hreflang while its
// translation is written. Advertising its URLs in an open, CORS-enabled feed
// would undo that, so this follows the same registry the site does.
const { locales: localeSettings } = JSON.parse(
  await readFile(localesPath, "utf8"),
);
const locales = Object.keys(localeSettings)
  .filter((locale) => localeSettings[locale].published)
  .sort();

if (!locales.includes("en")) {
  throw new Error("The reference locale is not published; refusing to build.");
}
const summary = trackerSummary(statusData);

try {
  await access(outDirectory);
} catch {
  throw new Error(
    "out/ does not exist. Run this after `next build`, not on its own.",
  );
}

const payload = {
  schemaVersion: SCHEMA_VERSION,
  ...summary,
  charts: {
    production: chartUrls(locales, "production", summary.revision),
    publicationHistory: chartUrls(
      locales,
      "publication-history",
      summary.revision,
    ),
  },
  chapters: [...statusData.chapters].sort(
    (left, right) => left.chapter - right.chapter,
  ),
};

// No build timestamp: the file must stay byte-identical when the tracker has
// not moved, so consumers and caches can revalidate cheaply.
await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify({
    message: "Wrote the public tracker JSON.",
    revision: payload.revision,
    chapters: payload.chapters.length,
    locales: locales.join(","),
  }),
);
